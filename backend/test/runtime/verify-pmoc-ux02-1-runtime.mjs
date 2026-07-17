import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const rootEnv = await readFile('../.env', 'utf8');
const env = Object.fromEntries(rootEnv.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/${env.POSTGRES_DB}?schema=public`;
const prisma = new PrismaClient();
const apiBase = 'http://127.0.0.1:4000/api/v1';
const ownerCredentials = { email: 'runtime.pmoc.ux021.owner@orbit.local', password: 'RuntimePmocUx021!Owner' };
const operatorCredentials = { email: 'runtime.pmoc.ux021.operator@orbit.local', password: 'RuntimePmocUx021!Operator' };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  return { response, body };
}
async function api(path, init = {}) {
  const { response, body } = await request(path, init);
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}
async function downloadPdf(path, headers) {
  const response = await fetch(`${apiBase}${path}`, { headers });
  if (!response.ok) throw new Error(`GET ${path}: ${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}
function signatureComponents(blueprint) {
  return blueprint.sections.flatMap((section) => section.components).filter((component) => component.kind === 'signature').flatMap((component) => component.signatures);
}

try {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const customer = await prisma.customer.findFirst({ where: { isActive: true }, include: { addresses: { take: 1 } }, orderBy: { createdAt: 'asc' } });
  if (!organization || !customer) throw new Error('Runtime organization/customer foundation is missing.');
  const equipments = await prisma.equipment.findMany({ where: { customerId: customer.id, isActive: true, disabledAt: null }, take: 2, orderBy: { createdAt: 'asc' } });
  if (equipments.length < 2) throw new Error('Two customer equipments are required.');
  const owner = await prisma.user.upsert({ where: { email: ownerCredentials.email }, create: { email: ownerCredentials.email, username: 'runtimepmocux021owner', name: 'Owner PMOC UX-02.1', passwordHash: await argon2.hash(ownerCredentials.password), role: Role.OWNER, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(ownerCredentials.password), role: Role.OWNER, isActive: true, disabledAt: null, mustChangePassword: false } });
  const operator = await prisma.user.upsert({ where: { email: operatorCredentials.email }, create: { email: operatorCredentials.email, username: 'runtimepmocux021op', name: 'Operator PMOC UX-02.1', passwordHash: await argon2.hash(operatorCredentials.password), role: Role.OPERATOR, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(operatorCredentials.password), role: Role.OPERATOR, isActive: true, disabledAt: null, mustChangePassword: false } });
  const ownerLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify(ownerCredentials) });
  const operatorLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify(operatorCredentials) });
  const ownerHeaders = { authorization: `Bearer ${ownerLogin.accessToken}` };
  const operatorHeaders = { authorization: `Bearer ${operatorLogin.accessToken}` };
  const templates = await api('/organization/templates', { headers: ownerHeaders });
  const template = templates.find((item) => item.type === 'PMOC' && item.isDefault) ?? templates.find((item) => item.type === 'PMOC');
  const signatures = await api('/signatures?page=1&limit=100&active=true', { headers: ownerHeaders });
  const institutional = signatures.items.find((item) => item.active && item.hasImage);
  if (!template || !institutional) throw new Error('Active PMOC template/signature is required.');
  await api(`/organization/templates/${template.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ requiresSignature: true, signatureMode: 'HYBRID', signatureId: institutional.id, institutionalSignatureIds: [institutional.id], executionSignatureClient: true, executionSignatureTechnician: false, executionSignatureOperator: false }) });

  const start = new Date();
  const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const plan = await api('/pmoc', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ customerId: customer.id, equipmentId: equipments[0].id, equipmentIds: equipments.map((item) => item.id), responsibleTechnician: owner.name, defaultOperatorId: operator.id, signatureOverrideId: institutional.id, generationMode: 'MANUAL', startDate: start.toISOString(), endDate: end.toISOString(), recurrenceRule: { frequency: 'MONTHLY', interval: 1 } }) });
  const executionRequest = plan.executionRequests.find((item) => item.status === 'PENDING');
  const prefill = await api(`/pmoc/execution-requests/${executionRequest.id}/prefill`, { headers: ownerHeaders });
  if (prefill.inspectedEquipments.length !== 2) throw new Error('Prefill lost PMOC equipments.');
  const generated = await api(`/pmoc/execution-requests/${executionRequest.id}/generate-work-order`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ operation: prefill }) });
  const operationId = generated.generatedOperationId;
  const operation = await api(`/operations/${operationId}`, { headers: ownerHeaders });
  if (operation.inspectedEquipments.length !== 2) throw new Error('Operation lost multiple equipments.');
  const assignmentPage = await api(`/assignments?operationId=${operationId}&page=1&limit=10`, { headers: ownerHeaders });
  const assignment = assignmentPage.items[0];
  await api(`/assignments/${assignment.id}/accept`, { method: 'PATCH', headers: operatorHeaders, body: '{}' });
  await api(`/assignments/${assignment.id}/start`, { method: 'PATCH', headers: operatorHeaders, body: '{}' });

  const blockedRender = await request(`/documents/operations/${operationId}/PMOC/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  if (blockedRender.response.status !== 409 || blockedRender.body.error?.code !== 'PMOC_EVIDENCE_REQUIRED') throw new Error('PMOC render was not blocked before mandatory images.');
  const blockedComplete = await request(`/assignments/${assignment.id}/complete`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ notes: 'Attempt without images' }) });
  if (blockedComplete.response.status !== 409 || blockedComplete.body.error?.code !== 'PMOC_EVIDENCE_REQUIRED') throw new Error('PMOC completion was not blocked before mandatory images.');

  await api(`/operations/${operationId}`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ photos: Array.from({ length: 4 }, (_, index) => ({ dataUrl: `data:image/png;base64,${png}`, caption: `Procedimento ${index + 1}` })) }) });
  const unsignedPreview = await api(`/documents/operations/${operationId}/PMOC/preview`, { headers: ownerHeaders });
  if (!JSON.stringify(unsignedPreview).includes('NÃO ASSINADO')) throw new Error('Unsigned warning is missing.');
  const gallery = unsignedPreview.sections.flatMap((section) => section.components).find((component) => component.kind === 'imageGallery');
  if (!gallery || gallery.columns !== 4 || gallery.images.length !== 4 || gallery.images.some((image) => !image.image?.contentBase64)) throw new Error('Preview image parity is invalid.');
  const unsignedRender = await api(`/documents/operations/${operationId}/PMOC/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  await api(`/operations/${operationId}`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ signatureData: `data:image/png;base64,${png}`, customerSignerName: 'Cliente Runtime UX-02.1', customerSignerRole: 'Responsável pelo local', signedAt: new Date().toISOString() }) });
  const stale = await request(`/documents/${unsignedRender.id}/download`, { headers: ownerHeaders });
  if (stale.response.status !== 409 || stale.body.error?.code !== 'DOCUMENT_STALE') throw new Error('Unsigned render did not become stale after signature.');
  const signedPreview = await api(`/documents/operations/${operationId}/PMOC/preview`, { headers: ownerHeaders });
  const signaturesInDocument = signatureComponents(signedPreview);
  if (signaturesInDocument.length !== 2 || !signaturesInDocument.some((item) => item.name === institutional.name) || !signaturesInDocument.some((item) => item.name === 'Cliente Runtime UX-02.1')) throw new Error('HYBRID signatures are incomplete.');
  const rendered = await api(`/documents/operations/${operationId}/PMOC/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  await api(`/assignments/${assignment.id}/complete`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ notes: 'PMOC UX-02.1 complete' }) });
  const completedRender = await api(`/documents/${rendered.id}/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const completedPreview = await api(`/documents/${rendered.id}/preview`, { headers: ownerHeaders });
  if (completedRender.renderMetadata?.sourceFingerprint !== completedPreview.metadata?.sourceFingerprint) throw new Error('Preview/PDF source parity is invalid.');
  const pdf = await downloadPdf(`/documents/${rendered.id}/download`, ownerHeaders);
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('PMOC PDF is invalid.');

  await api(`/pmoc/${plan.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ responsibleTechnician: `Responsável técnico atualizado ${Date.now()}` }) });
  const staleAfterPmocChange = await request(`/documents/${rendered.id}/download`, { headers: ownerHeaders });
  if (staleAfterPmocChange.response.status !== 409 || staleAfterPmocChange.body.error?.code !== 'DOCUMENT_STALE') throw new Error('PMOC change did not mark the official PDF as stale.');
  const rerendered = await api(`/documents/${rendered.id}/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const rerenderedPdf = await downloadPdf(`/documents/${rerendered.id}/download`, ownerHeaders);
  if (rerenderedPdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Re-rendered PMOC PDF is invalid.');

  const repository = await api(`/documents?page=1&limit=100&type=PMOC&search=${encodeURIComponent(rendered.number)}`, { headers: ownerHeaders });
  const repositoryDocument = repository.items.find((item) => item.id === rendered.id);
  if (!repositoryDocument || repositoryDocument.type !== 'PMOC' || !repositoryDocument.renderedAt || repositoryDocument.revision < 2) throw new Error('PMOC is incomplete in /documentos.');

  const evidence = { pmocPlanId: plan.id, executionRequestId: executionRequest.id, operationId, assignmentId: assignment.id, documentId: rerendered.id, documentNumber: rerendered.number, documentRevision: repositoryDocument.revision, documentStatus: repositoryDocument.status, templateId: template.id, institutionalSignatureId: institutional.id, equipmentCount: operation.inspectedEquipments.length, operationCompleted: true, blockedWithoutImages: true, photoCount: gallery.images.length, previewImageColumns: gallery.columns, unsignedStatusConfirmed: true, staleAfterSignature: true, staleAfterPmocChange: true, rerenderedAfterStale: true, previewPdfSourceParity: true, signatureCount: signaturesInDocument.length, pdfBytes: rerenderedPdf.length, repositoryConfirmed: true };
  await writeFile('/private/tmp/orbit-pmoc-ux02-1-credentials.json', JSON.stringify({ owner: ownerCredentials, operator: operatorCredentials }));
  await writeFile('/private/tmp/orbit-pmoc-ux02-1-evidence.json', JSON.stringify(evidence, null, 2));
  await writeFile('/private/tmp/orbit-pmoc-ux02-1.pdf', rerenderedPdf);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await prisma.$disconnect();
}
