import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('Set ORBIT_RUNTIME_VERIFY=true.');
const apiBase = process.env.ORBIT_RUNTIME_API ?? 'http://127.0.0.1:4000/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiBase) || process.env.NODE_ENV === 'production') {
  throw new Error('DC-03 runtime verification is local-only.');
}

const credentials = JSON.parse(
  await readFile('/private/tmp/orbit-runtime-06-1-credentials.json', 'utf8'),
);
async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(
      `${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`,
    );
  }
  return body.data;
}

const login = await request('/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});
const headers = { authorization: `Bearer ${login.accessToken}` };
const operationPage = await request('/operations?page=1&limit=20', { headers });
const sourceSummary = operationPage.items.find((item) => item.customer?.id) ?? operationPage.items[0];
if (!sourceSummary) throw new Error('No Operation is available as a local DC-03 source.');
const source = await request(`/operations/${sourceSummary.id}`, { headers });
const equipmentPage = await request(
  `/equipments?page=1&limit=100&customerId=${encodeURIComponent(source.customer.id)}`,
  { headers },
);
if (equipmentPage.items.length === 0) throw new Error('Customer has no equipment for DC-03.');

const templates = await request('/organization/templates', { headers });
const template =
  templates.find((item) => item.type === 'TECHNICAL_OPINION' && item.isDefault) ??
  templates.find((item) => item.type === 'TECHNICAL_OPINION');
if (!template) throw new Error('TECHNICAL_OPINION template is missing.');
const signatures = await request('/signatures?page=1&limit=100', { headers });
const institutional = signatures.items.find(
  (item) => item.active && item.hasImage && item.professionalCouncil,
);
if (!institutional) {
  throw new Error('An active institutional signature with image and CREA is required for DC-03.');
}
await request(`/organization/templates/${template.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    requiresSignature: true,
    signatureMode: 'HYBRID',
    signatureId: institutional.id,
    institutionalSignatureIds: [institutional.id],
    executionSignatureClient: true,
    executionSignatureTechnician: false,
    executionSignatureOperator: false,
  }),
});

const onePixelPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const inspectedEquipments = equipmentPage.items.slice(0, 5).map((equipment, index) => ({
  equipmentId: equipment.id,
  sector: equipment.address?.name || equipment.location || `Setor ${index + 1}`,
}));
const created = await request('/operations', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    customerId: source.customer.id,
    addressId: source.address?.id ?? null,
    equipmentId: inspectedEquipments[0].equipmentId,
    type: 'CORRETIVA',
    status: 'DRAFT',
    inspectedEquipments,
    technicalOpinionObjective:
      'Avaliar as condições dos sistemas de climatização afetados por dano térmico e determinar a viabilidade técnica de recuperação.',
    technicalOpinionConditions:
      '- Carcaças metálicas com deformação térmica severa\n- Componentes elétricos e eletrônicos carbonizados\n- Linhas frigorígenas e interligações comprometidas\n- Unidades internas com resíduos de fuligem',
    technicalOpinionAnalysis:
      'As evidências visuais e o grau de dano térmico demonstram comprometimento dos componentes elétricos, mecânicos e do isolamento dielétrico.\n\nA recuperação das unidades afetadas não oferece segurança operacional nem viabilidade econômica, sendo tecnicamente inadequado o reaproveitamento.',
    technicalOpinionConclusion:
      'Conclui-se pela substituição integral dos equipamentos afetados. Recomenda-se remoção e descarte ambientalmente adequado, seguidos de novo dimensionamento e instalação conforme as normas técnicas aplicáveis.',
    signatureData: `data:image/png;base64,${onePixelPng}`,
    signedAt: new Date().toISOString(),
  }),
});

const preview = await request(
  `/documents/operations/${created.id}/TECHNICAL_OPINION/preview`,
  { headers },
);
const expectedSections = [
  'technical-opinion-identification',
  'technical-opinion-requester',
  'technical-opinion-objective',
  'technical-opinion-equipments',
  'technical-opinion-site-conditions',
  'technical-opinion-analysis',
  'technical-opinion-conclusion',
  'signature',
];
const sectionIds = preview.sections.map((section) => section.id);
if (JSON.stringify(sectionIds) !== JSON.stringify(expectedSections)) {
  throw new Error(`Unexpected TECHNICAL_OPINION sections: ${JSON.stringify(sectionIds)}.`);
}
for (const forbidden of ['materials-consumed', 'related-documents', 'equipment', 'assignment-history']) {
  if (sectionIds.includes(forbidden)) throw new Error(`Forbidden section present: ${forbidden}.`);
}
const serialized = JSON.stringify(preview);
for (const required of [
  institutional.name,
  institutional.professionalCouncil,
  'Carcaças metálicas',
  'isolamento dielétrico',
  'substituição integral',
]) {
  if (!serialized.includes(required)) throw new Error(`Required DC-03 content missing: ${required}`);
}
const equipmentTable = preview.sections
  .find((section) => section.id === 'technical-opinion-equipments')
  ?.components.find((component) => component.kind === 'table');
if (
  !equipmentTable ||
  JSON.stringify(equipmentTable.columns.map((column) => column.label)) !==
    JSON.stringify(['EQUIPAMENTO', 'MARCA', 'MODELO', 'CAPACIDADE', 'SÉRIE', 'LOCAL'])
) {
  throw new Error('Technical Opinion equipment table contract is invalid.');
}

const rendered = await request(
  `/documents/operations/${created.id}/TECHNICAL_OPINION/render`,
  { method: 'POST', headers, body: '{}' },
);
const download = await request(`/documents/${rendered.id}/download`, { headers });
const pdf = Buffer.from(download.contentBase64, 'base64');
if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
  throw new Error('Downloaded TECHNICAL_OPINION is not a PDF.');
}
const repository = await request(
  `/documents?page=1&limit=100&type=TECHNICAL_OPINION&search=${encodeURIComponent(rendered.number)}`,
  { headers },
);
if (!repository.items.some((item) => item.id === rendered.id)) {
  throw new Error('Rendered Technical Opinion is missing from /documents.');
}

const signatureComponent = preview.sections
  .find((section) => section.id === 'signature')
  ?.components.find((component) => component.kind === 'signature');
const evidence = {
  operationId: created.id,
  documentId: rendered.id,
  documentNumber: rendered.number,
  templateId: template.id,
  sectionIds,
  inspectedEquipmentCount: equipmentTable.rows.length,
  signatureCount: signatureComponent?.signatures.length ?? 0,
  signatureMode: signatureComponent?.mode ?? null,
  pdfHeader: pdf.subarray(0, 5).toString('ascii'),
  pdfBytes: pdf.length,
  repositoryConfirmed: true,
};
await writeFile('/private/tmp/orbit-dc03-preview.json', JSON.stringify(preview, null, 2));
await writeFile('/private/tmp/orbit-dc03-technical-opinion.pdf', pdf);
await writeFile('/private/tmp/orbit-dc03-evidence.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
