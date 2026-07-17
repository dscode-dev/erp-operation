import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('Set ORBIT_RUNTIME_VERIFY=true.');
const apiBase = process.env.ORBIT_RUNTIME_API ?? 'http://127.0.0.1:4000/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiBase) || process.env.NODE_ENV === 'production') {
  throw new Error('Independent Work Order runtime verification is local-only.');
}

const credentials = JSON.parse(
  await readFile(
    process.env.ORBIT_RUNTIME_CREDENTIALS ??
      '/private/tmp/orbit-runtime-06-1-credentials.json',
    'utf8',
  ),
);
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
const customers = await request('/customers?page=1&limit=20', { headers });
let source = null;
for (const customer of customers.items) {
  const equipments = await request(`/equipments?customerId=${customer.id}&page=1&limit=2`, {
    headers,
  });
  if (equipments.items.length >= 2) {
    source = { customer, equipments: equipments.items };
    break;
  }
}
if (!source) throw new Error('A customer with at least two equipments is required.');

const onePixelPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const operation = await request('/operations', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    customerId: source.customer.id,
    equipmentId: source.equipments[0].id,
    type: 'PROJETO',
    status: 'DRAFT',
    inspectedEquipments: source.equipments.map((equipment, index) => ({
      equipmentId: equipment.id,
      sector: equipment.address?.name ?? `Setor ${index + 1}`,
    })),
    reportedIssue: 'Baixo rendimento informado pelo cliente.',
    serviceDescription: 'Inspeção técnica e correção operacional executadas.',
    checklist: [
      { label: 'Inspeção visual', done: true, note: 'Concluída' },
      { label: 'Teste funcional', done: true, note: null },
    ],
    observations: 'Equipamentos liberados para operação.',
    photos: [
      { dataUrl: `data:image/png;base64,${onePixelPng}`, caption: 'Evidência de conclusão' },
    ],
  }),
});

const preview = await request(`/documents/operations/${operation.id}/WORK_ORDER/preview`, {
  headers,
});
const ids = preview.sections.map((section) => section.id);
const expected = [
  'work-order-identification',
  'work-order-customer',
  'work-order-inspected-equipments',
  'work-order-reported-issue',
  'work-order-execution',
  'observations-observacoes-e-resultado-operacional',
  'photos-evidencias-fotograficas',
];
for (const id of expected) if (!ids.includes(id)) throw new Error(`Missing Work Order section: ${id}`);
if (ids.includes('related-documents') || ids.includes('materials-consumed')) {
  throw new Error('Work Order contains a removed section.');
}
const equipmentTable = preview.sections
  .find((section) => section.id === 'work-order-inspected-equipments')
  ?.components.find((component) => component.kind === 'table');
const gallery = preview.sections
  .find((section) => section.id === 'photos-evidencias-fotograficas')
  ?.components.find((component) => component.kind === 'imageGallery');
if (equipmentTable?.rows.length !== 2) throw new Error('Work Order equipment table is incomplete.');
if (gallery?.columns !== 2 || gallery.images.length !== 1) {
  throw new Error('Work Order image gallery contract is invalid.');
}

const rendered = await request(`/documents/operations/${operation.id}/WORK_ORDER/render`, {
  method: 'POST',
  headers,
  body: '{}',
});
const download = await fetch(`${apiBase}/documents/${rendered.id}/download`, { headers });
if (!download.ok) throw new Error(`Document download failed with ${download.status}.`);
const pdf = Buffer.from(await download.arrayBuffer());
if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid Work Order PDF.');

const evidence = {
  operationId: operation.id,
  documentId: rendered.id,
  equipmentRows: equipmentTable.rows.length,
  galleryColumns: gallery.columns,
  galleryImages: gallery.images.length,
  sectionIds: ids,
  pdfBytes: pdf.length,
};
await writeFile(
  process.env.ORBIT_RUNTIME_EVIDENCE ??
    '/private/tmp/orbit-work-order-independent-evidence.json',
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence, null, 2));
