import { readFile, writeFile } from 'node:fs/promises';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('Set ORBIT_RUNTIME_VERIFY=true.');
const apiBase = process.env.ORBIT_RUNTIME_API ?? 'http://127.0.0.1:4000/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiBase) || process.env.NODE_ENV === 'production') {
  throw new Error('Report Center runtime verification is local-only.');
}

const credentials = JSON.parse(await readFile('/private/tmp/orbit-runtime-06-1-credentials.json', 'utf8'));
async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}

const login = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
const headers = { authorization: `Bearer ${login.accessToken}` };
const operations = await request('/operations?page=1&limit=1', { headers });
const operation = operations.items[0];
if (!operation) throw new Error('No Operation is available for Report Center verification.');

const types = ['WORK_ORDER', 'TECHNICAL_REPORT', 'TECHNICAL_OPINION', 'PMOC', 'RECEIPT'];
const results = [];
for (const type of types) {
  const preview = await request(`/documents/operations/${operation.id}/${type}/preview`, { headers });
  const rendered = await request(`/documents/operations/${operation.id}/${type}/render`, { method: 'POST', headers, body: '{}' });
  const download = await request(`/documents/${rendered.id}/download`, { headers });
  const pdf = Buffer.from(download.contentBase64, 'base64');
  results.push({ type, documentId: rendered.id, sectionIds: preview.sections.map((section) => section.id), pdfHeader: pdf.subarray(0, 5).toString('ascii'), pdfBytes: pdf.length });
}

const repository = await request('/documents?page=1&limit=100', { headers });
for (const result of results) {
  if (result.pdfHeader !== '%PDF-') throw new Error(`${result.type} did not produce a PDF.`);
  if (!repository.items.some((item) => item.id === result.documentId && item.type === result.type)) {
    throw new Error(`${result.type} was not found in the official document repository.`);
  }
}

await writeFile('/private/tmp/orbit-report-center-evidence.json', JSON.stringify({ operationId: operation.id, workflows: results, repositoryConfirmed: true }, null, 2));
console.log(JSON.stringify({ operationId: operation.id, workflows: results.map(({ type, pdfBytes }) => ({ type, pdfBytes })), repositoryConfirmed: true }, null, 2));
