import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('Set ORBIT_RUNTIME_VERIFY=true.');
const apiBase = process.env.ORBIT_RUNTIME_API ?? 'http://127.0.0.1:4000/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiBase) || process.env.NODE_ENV === 'production') {
  throw new Error('DC-02 runtime verification is local-only.');
}

const credentials = JSON.parse(await readFile('/private/tmp/orbit-runtime-06-1-credentials.json', 'utf8'));
async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  }
  return body.data;
}

const login = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
const headers = { authorization: `Bearer ${login.accessToken}` };
const operations = await request('/operations?page=1&limit=20', { headers });
const summary = operations.items.find((item) => item.equipment?.id) ?? operations.items[0];
if (!summary) throw new Error('No Operation is available for DC-02 verification.');
const operation = await request(`/operations/${summary.id}`, { headers });

const templates = await request('/organization/templates', { headers });
const template = templates.find((item) => item.type === 'TECHNICAL_REPORT' && item.isDefault)
  ?? templates.find((item) => item.type === 'TECHNICAL_REPORT');
if (!template) throw new Error('TECHNICAL_REPORT template is missing.');
const signatures = await request('/signatures?page=1&limit=100', { headers });
const institutional = signatures.items.find((item) => item.active && item.hasImage);
await request(`/organization/templates/${template.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify(institutional ? {
    requiresSignature: true,
    signatureMode: 'HYBRID',
    signatureId: institutional.id,
    institutionalSignatureIds: [institutional.id],
    executionSignatureClient: true,
    executionSignatureTechnician: false,
    executionSignatureOperator: false,
  } : {
    requiresSignature: false,
    signatureMode: 'NONE',
    institutionalSignatureIds: [],
    executionSignatureClient: false,
    executionSignatureTechnician: false,
    executionSignatureOperator: false,
  }),
});

const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const richContent = {
  reportedIssue: 'Avaliar a perda de rendimento térmico informada pelo cliente e verificar as condições operacionais do equipamento.',
  technicalDiagnosis: 'Durante a inspeção foi identificada obstrução parcial do conjunto filtrante e redução do escoamento do dreno.\n\n- Alimentação elétrica dentro da faixa nominal\n- Compressor sem ruídos mecânicos anormais\n- Serpentina com acúmulo de particulados',
  serviceDescription: 'Foi realizada a higienização do conjunto filtrante, da bandeja e da serpentina.\n\nO dreno foi desobstruído e submetido a teste de escoamento. Em seguida, o equipamento operou em refrigeração até estabilização, sem alarmes ativos.',
  technicalRecommendations: '- Repetir inspeção preventiva em 30 dias\n- Monitorar a corrente nominal do compressor\n- Manter o ambiente livre de obstruções junto ao retorno de ar',
  observations: 'Equipamento liberado para operação. O cliente foi orientado quanto ao acompanhamento do desempenho térmico nas próximas 24 horas.',
  checklist: [
    { label: 'Inspeção visual e elétrica', done: true, note: 'Sem avarias aparentes' },
    { label: 'Limpeza do filtro e serpentina', done: true, note: 'Concluída' },
    { label: 'Teste de drenagem', done: true, note: 'Escoamento normalizado' },
  ],
  ...(operation.signatureData ? {} : {
    signatureData: `data:image/png;base64,${onePixelPng}`,
    signedAt: new Date().toISOString(),
  }),
  ...(operation.photos.length > 0 ? {} : {
    photos: [{ dataUrl: `data:image/png;base64,${onePixelPng}`, caption: 'Evidência técnica após a intervenção' }],
  }),
};
await request(`/operations/${operation.id}`, { method: 'PATCH', headers, body: JSON.stringify(richContent) });

const preview = await request(`/documents/operations/${operation.id}/TECHNICAL_REPORT/preview`, { headers });
const expectedSections = [
  'technical-report-identification', 'technical-report-customer', 'technical-report-location',
  ...(operation.equipment ? ['technical-report-equipment', 'technical-report-equipment-qr'] : []),
  'visit-objective', 'visit-diagnosis', 'visit-activities', 'checklist-checklist-complementar',
  'visit-recommendations', 'photos-evidencias-fotograficas', 'observations-observacoes-finais',
];
for (const sectionId of expectedSections) {
  if (!preview.sections.some((section) => section.id === sectionId)) throw new Error(`Missing section ${sectionId}.`);
}
const serialized = JSON.stringify(preview);
for (const text of ['perda de rendimento térmico', 'obstrução parcial', 'higienização do conjunto', 'Repetir inspeção preventiva']) {
  if (!serialized.includes(text)) throw new Error(`Technical content is missing: ${text}`);
}
if (!preview.sections.flatMap((section) => section.components).some((component) => component.kind === 'image' && component.image?.contentBase64)) {
  throw new Error('Resolved photo is missing from the official Blueprint.');
}

const rendered = await request(`/documents/operations/${operation.id}/TECHNICAL_REPORT/render`, {
  method: 'POST', headers, body: '{}',
});
const download = await request(`/documents/${rendered.id}/download`, { headers });
const pdf = Buffer.from(download.contentBase64, 'base64');
if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Downloaded document is not a PDF.');
const repository = await request(`/documents?page=1&limit=100&type=TECHNICAL_REPORT&search=${encodeURIComponent(rendered.number)}`, { headers });
if (!repository.items.some((item) => item.id === rendered.id)) throw new Error('Rendered report is missing from /documents.');

const evidence = {
  operationId: operation.id,
  documentId: rendered.id,
  documentNumber: rendered.number,
  templateId: template.id,
  signatureMode: institutional ? 'HYBRID' : 'NONE',
  sectionIds: preview.sections.map((section) => section.id),
  photoCount: preview.sections.flatMap((section) => section.components).filter((component) => component.kind === 'image').length,
  signatureCount: preview.sections.flatMap((section) => section.components).filter((component) => component.kind === 'signature').flatMap((component) => component.signatures).length,
  sourceFingerprint: preview.metadata.sourceFingerprint,
  pdfHeader: pdf.subarray(0, 5).toString('ascii'),
  pdfBytes: pdf.length,
  repositoryConfirmed: true,
};
await writeFile('/private/tmp/orbit-dc02-preview.json', JSON.stringify(preview, null, 2));
await writeFile('/private/tmp/orbit-dc02-technical-report.pdf', pdf);
await writeFile('/private/tmp/orbit-dc02-evidence.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
