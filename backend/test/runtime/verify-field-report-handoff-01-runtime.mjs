import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const rootEnv = await readFile('../.env', 'utf8');
const env = Object.fromEntries(rootEnv.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/${env.POSTGRES_DB}?schema=public`;
const prisma = new PrismaClient();
const apiBase = 'http://127.0.0.1:4000/api/v1';
const ownerCredentials = { email: 'runtime.handoff.owner@orbit.local', password: 'RuntimeHandoff01!Owner' };
const operatorCredentials = { email: 'runtime.handoff.operator@orbit.local', password: 'RuntimeHandoff01!Operator' };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function raw(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => null);
  return { response, body };
}
async function api(path, init = {}) {
  const result = await raw(path, init);
  if (!result.response.ok || !result.body?.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${result.response.status} ${JSON.stringify(result.body?.error)}`);
  return result.body.data;
}
async function binary(path, headers) {
  const response = await fetch(`${apiBase}${path}`, { headers });
  if (!response.ok) throw new Error(`GET ${path}: ${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}
function signatures(blueprint) {
  return blueprint.sections.flatMap((section) => section.components).filter((component) => component.kind === 'signature').flatMap((component) => component.signatures);
}

try {
  const [organization, customer] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }),
    prisma.customer.findFirst({ where: { isActive: true }, include: { addresses: { take: 1 } }, orderBy: { createdAt: 'asc' } }),
  ]);
  if (!organization || !customer?.addresses[0]) throw new Error('Runtime organization/customer/address foundation is missing.');
  const equipments = await prisma.equipment.findMany({ where: { customerId: customer.id, isActive: true, disabledAt: null }, take: 2, orderBy: { createdAt: 'asc' } });
  if (!equipments.length) throw new Error('Runtime customer has no equipment.');
  const owner = await prisma.user.upsert({ where: { email: ownerCredentials.email }, create: { email: ownerCredentials.email, username: 'runtimehandoffowner', name: 'Owner Handoff Runtime', passwordHash: await argon2.hash(ownerCredentials.password), role: Role.OWNER, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(ownerCredentials.password), role: Role.OWNER, isActive: true, disabledAt: null, mustChangePassword: false } });
  const operator = await prisma.user.upsert({ where: { email: operatorCredentials.email }, create: { email: operatorCredentials.email, username: 'runtimehandoffoperator', name: 'Operator Handoff Runtime', passwordHash: await argon2.hash(operatorCredentials.password), role: Role.OPERATOR, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(operatorCredentials.password), role: Role.OPERATOR, isActive: true, disabledAt: null, mustChangePassword: false } });
  const ownerLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify(ownerCredentials) });
  const operatorLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify(operatorCredentials) });
  const ownerHeaders = { authorization: `Bearer ${ownerLogin.accessToken}` };
  const operatorHeaders = { authorization: `Bearer ${operatorLogin.accessToken}` };
  const availableSignatures = await api('/signatures?page=1&limit=100&active=true', { headers: ownerHeaders });
  const technical = availableSignatures.items.find((item) => item.hasImage);
  if (!technical) throw new Error('An active technical signature with image is required.');
  if (!technical.isDefault) await api(`/signatures/${technical.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ isDefault: true }) });

  async function createOperation(suffix) {
    return api('/operations', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ customerId: customer.id, addressId: customer.addresses[0].id, equipmentId: equipments[0].id, operatorId: operator.id, type: 'PREVENTIVA', status: 'DRAFT', reportedIssue: `Solicitação de campo ${suffix}`, technicalDiagnosis: 'Condições verificadas pelo operador.', serviceDescription: 'Inspeção e testes funcionais executados.', technicalRecommendations: 'Acompanhar os parâmetros operacionais.', observations: `Coleta runtime ${suffix}`, inspectedEquipments: equipments.map((equipment, index) => ({ equipmentId: equipment.id, sector: `Setor ${index + 1}` })), photos: [{ dataUrl: `data:image/png;base64,${png}`, caption: `Evidência ${suffix}` }] }) });
  }

  const operation = await createOperation('OS');
  const assignmentPage = await api(`/assignments?operationId=${operation.id}&page=1&limit=10`, { headers: ownerHeaders });
  if (!assignmentPage.items.some((item) => item.assignedTo === operator.id || item.assignedTo?.id === operator.id || item.assignee?.id === operator.id)) throw new Error(`Delegated Operation did not create the official Assignment: ${JSON.stringify(assignmentPage.items)}`);
  let handoff = await api('/documents/handoffs', { method: 'POST', headers: operatorHeaders, body: JSON.stringify({ operationId: operation.id, type: 'WORK_ORDER' }) });
  handoff = await api(`/documents/${handoff.id}/handoff/customer-signature`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ signerName: 'Cliente Runtime', signerRole: 'Responsável local', signatureData: `data:image/png;base64,${png}`, collectedAt: new Date().toISOString(), timezone: 'America/Recife' }) });
  handoff = await api(`/documents/${handoff.id}/handoff/submit`, { method: 'POST', headers: operatorHeaders, body: '{}' });
  if (handoff.editorialStatus !== 'DRAFT' || handoff.origin !== 'OPERATOR') throw new Error('Operator submission did not remain DRAFT/OPERATOR.');
  const forbiddenFinalize = await raw(`/documents/${handoff.id}/handoff/finalize`, { method: 'POST', headers: operatorHeaders, body: '{}' });
  const forbiddenRender = await raw(`/documents/${handoff.id}/render`, { method: 'POST', headers: operatorHeaders, body: '{}' });
  if (forbiddenFinalize.response.status !== 403 || forbiddenRender.response.status !== 403) throw new Error('Operator could finalize or render a final document.');
  await api(`/documents/${handoff.id}/handoff/review`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  await api(`/documents/${handoff.id}/handoff/technical-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureId: technical.id }) });
  handoff = await api(`/documents/${handoff.id}/handoff/finalize`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ confirm: true }) });
  if (handoff.editorialStatus !== 'READY') throw new Error('Management finalization did not produce READY.');
  const customerSignature = await binary(`/documents/${handoff.id}/handoff/customer-signature`, ownerHeaders);
  if (!customerSignature.subarray(0, 8).equals(Buffer.from(png, 'base64').subarray(0, 8))) throw new Error('Authorized customer signature binary is invalid.');
  const preview = await api(`/documents/${handoff.id}/preview`, { headers: ownerHeaders });
  if (signatures(preview).length !== 2) throw new Error('WORK_ORDER preview does not contain customer and technical signatures.');
  const rendered = await api(`/documents/${handoff.id}/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const pdf = await binary(`/documents/${rendered.id}/download`, ownerHeaders);
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Rendered WORK_ORDER PDF is invalid.');
  const repository = await api(`/documents?page=1&limit=100&search=${encodeURIComponent(rendered.number)}`, { headers: ownerHeaders });
  if (!repository.items.some((item) => item.id === rendered.id && item.editorialStatus === 'READY')) throw new Error('READY document is missing from the repository.');
  await api(`/operations/${operation.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ observations: 'Alteração administrativa após a primeira emissão.' }) });
  const stale = await api(`/documents/${handoff.id}/handoff`, { headers: ownerHeaders });
  if (stale.editorialStatus !== 'STALE') throw new Error('Post-render content change did not mark the document STALE.');
  await api(`/documents/${handoff.id}/handoff/review`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  await api(`/documents/${handoff.id}/handoff/finalize`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  await api(`/documents/${handoff.id}/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const history = await api(`/documents/${handoff.id}/handoff/history`, { headers: ownerHeaders });
  if (!history.some((item) => item.action === 'MARKED_STALE') || !history.some((item) => item.action === 'RENDERED')) throw new Error('Append-only revision history is incomplete.');

  async function completeCustomerSignedHandoff(type) {
    let document = await api('/documents/handoffs', { method: 'POST', headers: operatorHeaders, body: JSON.stringify({ operationId: operation.id, type }) });
    document = await api(`/documents/${document.id}/handoff/customer-signature`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ signerName: 'Cliente Runtime', signatureData: `data:image/png;base64,${png}`, collectedAt: new Date().toISOString(), timezone: 'America/Recife' }) });
    await api(`/documents/${document.id}/handoff/submit`, { method: 'POST', headers: operatorHeaders, body: '{}' });
    await api(`/documents/${document.id}/handoff/review`, { method: 'POST', headers: ownerHeaders, body: '{}' });
    await api(`/documents/${document.id}/handoff/technical-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureId: technical.id }) });
    document = await api(`/documents/${document.id}/handoff/finalize`, { method: 'POST', headers: ownerHeaders, body: '{}' });
    const documentPreview = await api(`/documents/${document.id}/preview`, { headers: ownerHeaders });
    if (document.editorialStatus !== 'READY' || signatures(documentPreview).length !== 2) throw new Error(`${type} handoff is not READY with both signatures.`);
    const documentRender = await api(`/documents/${document.id}/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
    const documentPdf = await binary(`/documents/${documentRender.id}/download`, ownerHeaders);
    if (documentPdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`${type} PDF is invalid.`);
    return { id: document.id, pdfBytes: documentPdf.length };
  }
  const technicalReport = await completeCustomerSignedHandoff('TECHNICAL_REPORT');
  const budget = await completeCustomerSignedHandoff('BUDGET');

  const opinionOperation = await createOperation('LAUDO');
  let opinion = await api('/documents/handoffs', { method: 'POST', headers: operatorHeaders, body: JSON.stringify({ operationId: opinionOperation.id, type: 'TECHNICAL_OPINION' }) });
  opinion = await api(`/documents/${opinion.id}/handoff/submit`, { method: 'POST', headers: operatorHeaders, body: '{}' });
  if (opinion.customerSignature !== null) throw new Error('TECHNICAL_OPINION incorrectly requires a customer signature.');
  await api(`/documents/${opinion.id}/handoff/review`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  await api(`/documents/${opinion.id}/handoff/technical-signature`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ signatureId: technical.id }) });
  await api(`/documents/${opinion.id}/handoff/finalize`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const opinionPreview = await api(`/documents/${opinion.id}/preview`, { headers: ownerHeaders });
  if (signatures(opinionPreview).length !== 1) throw new Error('TECHNICAL_OPINION must contain only the technical signature.');
  await api(`/documents/${opinion.id}/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });

  const receiptOperation = await createOperation('RECIBO');
  const receiptPreview = await api(`/documents/operations/${receiptOperation.id}/RECEIPT/preview`, { headers: ownerHeaders });
  if (!receiptPreview.sections.length) throw new Error('RECEIPT compatibility preview failed.');

  const pmocFixture = JSON.parse(await readFile('/private/tmp/orbit-pmoc-ux02-1-evidence.json', 'utf8'));
  const pmocCredentials = JSON.parse(await readFile('/private/tmp/orbit-pmoc-ux02-1-credentials.json', 'utf8'));
  const pmocOwnerLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify(pmocCredentials.owner) });
  const pmocOperatorLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify(pmocCredentials.operator) });
  const pmocOwnerHeaders = { authorization: `Bearer ${pmocOwnerLogin.accessToken}` };
  const pmocOperatorHeaders = { authorization: `Bearer ${pmocOperatorLogin.accessToken}` };
  let pmocHandoff = await api('/documents/handoffs', { method: 'POST', headers: pmocOperatorHeaders, body: JSON.stringify({ operationId: pmocFixture.operationId, type: 'PMOC' }) });
  pmocHandoff = await api(`/documents/${pmocHandoff.id}/handoff/submit`, { method: 'POST', headers: pmocOperatorHeaders, body: '{}' });
  if (pmocHandoff.operation.equipmentCount !== 2 || pmocHandoff.operation.evidenceCount < 4 || !pmocHandoff.customerSignature) throw new Error('PMOC handoff lost equipment, evidence or customer signature data.');
  await api(`/documents/${pmocHandoff.id}/handoff/review`, { method: 'POST', headers: pmocOwnerHeaders, body: '{}' });
  await api(`/documents/${pmocHandoff.id}/handoff/technical-signature`, { method: 'PATCH', headers: pmocOwnerHeaders, body: JSON.stringify({ signatureId: pmocFixture.institutionalSignatureId }) });
  pmocHandoff = await api(`/documents/${pmocHandoff.id}/handoff/finalize`, { method: 'POST', headers: pmocOwnerHeaders, body: '{}' });
  const pmocPreview = await api(`/documents/${pmocHandoff.id}/preview`, { headers: pmocOwnerHeaders });
  if (pmocHandoff.editorialStatus !== 'READY' || signatures(pmocPreview).length !== 2) throw new Error('PMOC handoff did not become READY with both signatures.');
  const pmocRendered = await api(`/documents/${pmocHandoff.id}/render`, { method: 'POST', headers: pmocOwnerHeaders, body: '{}' });
  const pmocPdf = await binary(`/documents/${pmocRendered.id}/download`, pmocOwnerHeaders);
  if (pmocPdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('PMOC handoff PDF is invalid.');

  const evidence = { operationId: operation.id, assignmentId: assignmentPage.items[0].id, documentId: handoff.id, technicalReportDocumentId: technicalReport.id, technicalReportPdfBytes: technicalReport.pdfBytes, budgetDocumentId: budget.id, budgetPdfBytes: budget.pdfBytes, technicalOpinionDocumentId: opinion.id, receiptOperationId: receiptOperation.id, pmocPlanId: pmocFixture.pmocPlanId, pmocOperationId: pmocFixture.operationId, pmocDocumentId: pmocHandoff.id, operatorSubmit: true, operatorFinalizeBlocked: true, operatorRenderBlocked: true, customerSignatureBinary: true, signatureCount: signatures(preview).length, technicalOpinionSignatureCount: signatures(opinionPreview).length, pmocEquipmentCount: pmocHandoff.operation.equipmentCount, pmocEvidenceCount: pmocHandoff.operation.evidenceCount, pmocSignatureCount: signatures(pmocPreview).length, pmocPdfBytes: pmocPdf.length, ready: true, staleAndRerendered: true, pdfBytes: pdf.length, repository: true, historyEntries: history.length, owner: owner.id, operator: operator.id };
  await writeFile('/private/tmp/orbit-field-report-handoff-01-evidence.json', JSON.stringify(evidence, null, 2));
  await writeFile('/private/tmp/orbit-field-report-handoff-01-credentials.json', JSON.stringify({ owner: ownerCredentials, operator: operatorCredentials }, null, 2));
  await writeFile('/private/tmp/orbit-field-report-handoff-01.pdf', pdf);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await prisma.$disconnect();
}
