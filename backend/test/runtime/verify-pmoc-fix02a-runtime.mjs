import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const rootEnv = await readFile('../.env', 'utf8');
const env = Object.fromEntries(rootEnv.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/${env.POSTGRES_DB}?schema=public`;
const prisma = new PrismaClient();
const apiBase = 'http://127.0.0.1:4000/api/v1';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-pmoc-ux02-1-credentials.json', 'utf8'));
const foundation = JSON.parse(await readFile('/private/tmp/orbit-pmoc-ux02-1-evidence.json', 'utf8'));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}
async function login(input) { return request('/auth/login', { method: 'POST', body: JSON.stringify(input) }); }
function auth(token) { return { authorization: `Bearer ${token}` }; }
function signatureNames(blueprint) { return blueprint.sections.flatMap((section) => section.components).filter((component) => component.kind === 'signature').flatMap((component) => component.signatures).map((signature) => signature.name); }

try {
  const ownerLogin = await login(credentials.owner);
  const operatorLogin = await login(credentials.operator);
  const ownerHeaders = auth(ownerLogin.accessToken);
  const operatorHeaders = auth(operatorLogin.accessToken);
  const signatures = await request('/signatures?page=1&limit=100&active=true', { headers: ownerHeaders });
  const available = signatures.items.filter((item) => item.hasImage);
  if (available.length < 2) throw new Error('At least two active institutional signatures with images are required for replacement verification.');

  // Scenario 1: signature collected by the assigned Operator remains attributable to that Operator.
  const operatorDraft = await request('/documents/handoffs', { method: 'POST', headers: operatorHeaders, body: JSON.stringify({ operationId: foundation.operationId, type: 'PMOC' }) });
  const operatorHandoff = await request(`/documents/${operatorDraft.id}/handoff/customer-signature`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ signerName: 'Cliente cenário Operator', signerRole: 'Responsável pela unidade', signatureData: `data:image/png;base64,${png}`, collectedAt: '2026-07-17T15:42:00.000Z', timezone: 'America/Recife' }) });
  if (operatorHandoff.customerSignature?.collectedBy?.role !== 'OPERATOR') throw new Error('Scenario 1 did not preserve the Operator collector.');
  await request(`/documents/${operatorDraft.id}/handoff/technical-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureId: available[0].id }) });
  await request(`/pmoc/${foundation.pmocPlanId}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureOverrideId: available[0].id }) });
  const operatorPreview = await request(`/documents/operations/${foundation.operationId}/PMOC/preview`, { headers: ownerHeaders });
  const operatorNames = signatureNames(operatorPreview);
  if (!operatorNames.includes('Cliente cenário Operator') || !operatorNames.includes(available[0].name)) throw new Error('Scenario 1 preview did not use both reviewed signatures.');

  // Scenario 2: Platform-created PMOC starts unsigned and can collect through the same official handoff.
  const sourcePlan = await request(`/pmoc/${foundation.pmocPlanId}`, { headers: ownerHeaders });
  const start = new Date(); const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const platformPlan = await request('/pmoc', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ customerId: sourcePlan.customerId, equipmentId: sourcePlan.equipmentId, equipmentIds: sourcePlan.equipments.map((item) => item.equipmentId), responsibleTechnician: sourcePlan.responsibleTechnician, defaultOperatorId: sourcePlan.defaultOperatorId, defaultTechnicianId: sourcePlan.defaultTechnicianId, signatureOverrideId: available[0].id, generationMode: 'MANUAL', startDate: start.toISOString(), endDate: end.toISOString(), recurrenceRule: { frequency: 'MONTHLY', interval: 1 } }) });
  const pending = platformPlan.executionRequests.find((item) => item.status === 'PENDING');
  if (!pending) throw new Error('Scenario 2 PMOC has no pending execution.');
  const prefill = await request(`/pmoc/execution-requests/${pending.id}/prefill`, { headers: ownerHeaders });
  const generated = await request(`/pmoc/execution-requests/${pending.id}/generate-work-order`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ operation: prefill }) });
  const platformDraft = await request('/documents/handoffs', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ operationId: generated.generatedOperationId, type: 'PMOC' }) });
  if (platformDraft.customerSignature) throw new Error('Scenario 2 unexpectedly started with a customer signature.');
  const platformSigned = await request(`/documents/${platformDraft.id}/handoff/customer-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signerName: 'Cliente cenário Platform', signerRole: 'Gestor da unidade', signatureData: `data:image/png;base64,${png}`, collectedAt: '2026-07-17T16:10:00.000Z', timezone: 'America/Recife' }) });
  if (platformSigned.customerSignature?.collectedBy?.role !== 'OWNER') throw new Error('Scenario 2 did not identify the Platform collector.');

  // Scenario 3: customer replacement and PMOC-scoped technical override update preview/PDF without changing global records.
  const beforeRevision = platformSigned.revision;
  const replaced = await request(`/documents/${platformDraft.id}/handoff/customer-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signerName: 'Cliente substituído', signerRole: 'Diretoria', signatureData: `data:image/png;base64,${png}`, collectedAt: '2026-07-17T16:30:00.000Z', timezone: 'America/Recife' }) });
  if (replaced.revision <= beforeRevision || replaced.customerSignature?.name !== 'Cliente substituído') throw new Error('Scenario 3 replacement did not create a new revision.');
  await request(`/documents/${platformDraft.id}/handoff/technical-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureId: available[1].id }) });
  await request(`/pmoc/${platformPlan.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureOverrideId: available[1].id }) });
  await request(`/operations/${generated.generatedOperationId}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ photos: Array.from({ length: 4 }, (_, index) => ({ dataUrl: `data:image/png;base64,${png}`, caption: `Evidência ${index + 1}` })) }) });
  const replacedPreview = await request(`/documents/operations/${generated.generatedOperationId}/PMOC/preview`, { headers: ownerHeaders });
  const replacedNames = signatureNames(replacedPreview);
  if (!replacedNames.includes('Cliente substituído') || !replacedNames.includes(available[1].name) || replacedNames.includes(available[0].name)) throw new Error('Scenario 3 preview did not resolve the PMOC-scoped override.');
  const rendered = await request(`/documents/operations/${generated.generatedOperationId}/PMOC/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const renderedPreview = await request(`/documents/${rendered.id}/preview`, { headers: ownerHeaders });
  if (!signatureNames(renderedPreview).includes(available[1].name)) throw new Error('Scenario 3 emitted document did not preserve the selected technical signature.');
  const revisions = await prisma.documentRevision.count({ where: { documentId: platformDraft.id } });
  const audits = await prisma.auditLog.count({ where: { resource: 'DOCUMENT_ENGINE', metadata: { path: ['documentId'], equals: platformDraft.id } } });
  if (revisions < 4 || audits < 4) throw new Error('Scenario 3 append-only revision/audit evidence is incomplete.');

  const evidence = {
    scenario1: { pmocPlanId: foundation.pmocPlanId, operationId: foundation.operationId, documentId: operatorDraft.id, customerName: operatorHandoff.customerSignature.name, collector: operatorHandoff.customerSignature.collectedBy, technicalSignature: available[0].name, previewUpdated: true },
    scenario2: { pmocPlanId: platformPlan.id, operationId: generated.generatedOperationId, documentId: platformDraft.id, initiallyUnsigned: true, customerName: platformSigned.customerSignature.name, collector: platformSigned.customerSignature.collectedBy, previewUpdated: true },
    scenario3: { pmocPlanId: platformPlan.id, operationId: generated.generatedOperationId, documentId: platformDraft.id, customerName: replaced.customerSignature.name, technicalSignature: available[1].name, previousTechnicalSignature: available[0].name, revision: replaced.revision, revisionCount: revisions, auditCount: audits, renderedDocumentId: rendered.id, pdfUsesSelectedSignature: true },
  };
  await writeFile('/private/tmp/orbit-pmoc-fix02a-credentials.json', JSON.stringify(credentials));
  await writeFile('/private/tmp/orbit-pmoc-fix02a-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await prisma.$disconnect(); }
