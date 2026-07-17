import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('Set ORBIT_RUNTIME_VERIFY=true.');
const rootEnv = await readFile('../.env', 'utf8');
const env = Object.fromEntries(rootEnv.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/${env.POSTGRES_DB}?schema=public`;
const prisma = new PrismaClient();
const apiBase = 'http://127.0.0.1:4000/api/v1';
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function api(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}

function signatureComponents(blueprint) {
  return blueprint.sections.flatMap((section) => section.components).filter((component) => component.kind === 'signature').flatMap((component) => component.signatures);
}

try {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const customer = await prisma.customer.findFirst({ where: { isActive: true }, include: { addresses: { take: 1 } }, orderBy: { createdAt: 'asc' } });
  if (!organization || !customer) throw new Error('Runtime organization/customer foundation is missing.');
  const equipments = await prisma.equipment.findMany({ where: { customerId: customer.id, isActive: true, disabledAt: null }, take: 2, orderBy: { createdAt: 'asc' } });
  if (equipments.length < 2) throw new Error('At least two active customer equipments are required.');
  const ownerPassword = 'RuntimePmocUx01!Owner';
  const operatorPassword = 'RuntimePmocUx01!Operator';
  const owner = await prisma.user.upsert({ where: { email: 'runtime.pmoc.ux01.owner@orbit.local' }, create: { email: 'runtime.pmoc.ux01.owner@orbit.local', username: 'runtimepmocux01owner', name: 'Owner PMOC UX-01', passwordHash: await argon2.hash(ownerPassword), role: Role.OWNER, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(ownerPassword), role: Role.OWNER, isActive: true, disabledAt: null, mustChangePassword: false } });
  const operator = await prisma.user.upsert({ where: { email: 'runtime.pmoc.ux01.operator@orbit.local' }, create: { email: 'runtime.pmoc.ux01.operator@orbit.local', username: 'runtimepmocux01op', name: 'Operador PMOC UX-01', passwordHash: await argon2.hash(operatorPassword), role: Role.OPERATOR, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(operatorPassword), role: Role.OPERATOR, isActive: true, disabledAt: null, mustChangePassword: false } });
  const ownerLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: owner.email, password: ownerPassword }) });
  const operatorLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: operator.email, password: operatorPassword }) });
  const ownerHeaders = { authorization: `Bearer ${ownerLogin.accessToken}` };
  const operatorHeaders = { authorization: `Bearer ${operatorLogin.accessToken}` };
  const templates = await api('/organization/templates', { headers: ownerHeaders });
  const template = templates.find((item) => item.type === 'PMOC' && item.isDefault) ?? templates.find((item) => item.type === 'PMOC');
  const signatures = await api('/signatures?page=1&limit=100&active=true', { headers: ownerHeaders });
  const institutional = signatures.items.find((item) => item.active && item.hasImage);
  if (!template || !institutional) throw new Error('An active PMOC template and institutional signature are required.');

  const now = new Date();
  const end = new Date(now); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const plan = await api('/pmoc', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ customerId: customer.id, equipmentId: equipments[0].id, equipmentIds: equipments.map((item) => item.id), serviceTypes: ['PREVENTIVA', 'CORRETIVA'], responsibleTechnician: 'Responsável Técnico UX-01', defaultOperatorId: operator.id, signatureOverrideId: institutional.id, generationMode: 'MANUAL', startDate: now.toISOString(), endDate: end.toISOString(), recurrenceRule: { frequency: 'MONTHLY', interval: 1 } }) });
  if (plan.equipments.length !== 2 || plan.serviceTypes.length !== 2) throw new Error('PMOC did not preserve multiple equipments/service types.');
  const requests = await api(`/pmoc/${plan.id}/execution-requests?page=1&limit=10`, { headers: ownerHeaders });
  const request = requests.items[0];
  const prefill = await api(`/pmoc/execution-requests/${request.id}/prefill`, { headers: ownerHeaders });
  if (prefill.inspectedEquipments.length !== 2 || prefill.serviceTypes.length !== 2) throw new Error('Work Order prefill lost PMOC scope.');
  const generated = await api(`/pmoc/execution-requests/${request.id}/generate-work-order`, { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ operation: prefill }) });
  const operationId = generated.generatedOperationId;
  const operation = await api(`/operations/${operationId}`, { headers: ownerHeaders });
  if (operation.inspectedEquipments.length !== 2 || operation.serviceTypes.length !== 2) throw new Error('Generated Work Order lost PMOC scope.');
  const assignmentPage = await api(`/assignments?operationId=${operationId}&page=1&limit=10`, { headers: ownerHeaders });
  const assignment = assignmentPage.items[0];
  if (!assignment || assignment.assignedTo !== operator.id) throw new Error('Generated Work Order assignment is inconsistent.');
  await api(`/assignments/${assignment.id}/accept`, { method: 'PATCH', headers: operatorHeaders, body: '{}' });
  await api(`/assignments/${assignment.id}/start`, { method: 'PATCH', headers: operatorHeaders, body: '{}' });

  const policyResults = {};
  await api(`/organization/templates/${template.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ requiresSignature: false, signatureMode: 'NONE', signatureId: null, institutionalSignatureIds: [], executionSignatureClient: false, executionSignatureTechnician: false, executionSignatureOperator: false }) });
  policyResults.NONE = signatureComponents(await api(`/documents/operations/${operationId}/PMOC/preview`, { headers: ownerHeaders })).length;
  await api(`/organization/templates/${template.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ requiresSignature: true, signatureMode: 'FIXED', signatureId: institutional.id, institutionalSignatureIds: [institutional.id], executionSignatureClient: false, executionSignatureTechnician: false, executionSignatureOperator: false }) });
  const fixedSignatures = signatureComponents(await api(`/documents/operations/${operationId}/PMOC/preview`, { headers: ownerHeaders }));
  policyResults.FIXED = fixedSignatures.length;
  await api(`/organization/templates/${template.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ requiresSignature: true, signatureMode: 'COLLECTED', signatureId: null, institutionalSignatureIds: [], executionSignatureClient: true, executionSignatureTechnician: false, executionSignatureOperator: false }) });
  policyResults.COLLECTED = signatureComponents(await api(`/documents/operations/${operationId}/PMOC/preview`, { headers: operatorHeaders })).length;
  await api(`/operations/${operationId}`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ signatureData: `data:image/png;base64,${png}`, customerSignerName: 'Cliente Runtime UX-01', customerSignerRole: 'Responsável pelo local', signedAt: new Date().toISOString() }) });
  await api(`/organization/templates/${template.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ requiresSignature: true, signatureMode: 'HYBRID', signatureId: institutional.id, institutionalSignatureIds: [institutional.id], executionSignatureClient: true, executionSignatureTechnician: false, executionSignatureOperator: false }) });
  const hybridPreview = await api(`/documents/operations/${operationId}/PMOC/preview`, { headers: ownerHeaders });
  policyResults.HYBRID = signatureComponents(hybridPreview).length;
  if (policyResults.NONE !== 0 || policyResults.FIXED !== 1 || policyResults.COLLECTED !== 1 || policyResults.HYBRID !== 2) throw new Error(`Signature policy mismatch: ${JSON.stringify(policyResults)}`);
  if (!fixedSignatures.some((item) => item.name === institutional.name)) throw new Error('PMOC institutional override was not resolved.');

  await api(`/operations/${operationId}`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ photos: Array.from({ length: 4 }, (_, index) => ({ dataUrl: `data:image/png;base64,${png}`, caption: `Evidência PMOC UX-01 ${index + 1}` })) }) });
  await api(`/assignments/${assignment.id}/complete`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ notes: 'Atendimento PMOC UX-01 concluído.' }) });
  await api(`/pmoc/${plan.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ generationMode: 'AUTO' }) });
  const laterRequests = await api(`/pmoc/${plan.id}/execution-requests?page=1&limit=20`, { headers: ownerHeaders });
  const nextRequest = laterRequests.items.find((item) => item.status === 'PENDING');
  if (!nextRequest) throw new Error('The next PMOC execution was not reserved after completion.');
  await api(`/pmoc/execution-requests/${nextRequest.id}/reschedule`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ scheduledFor: new Date().toISOString(), notes: 'Validação runtime de geração automática posterior.' }) });
  await api('/pmoc/scheduler/run?limit=25', { method: 'POST', headers: ownerHeaders, body: '{}' });
  const automaticallyGenerated = await api(`/pmoc/execution-requests/${nextRequest.id}`, { headers: ownerHeaders });
  if (automaticallyGenerated.status !== 'GENERATED' || !automaticallyGenerated.generatedOperationId) throw new Error('The subsequent automatic Work Order was not generated.');
  const rendered = await api(`/documents/operations/${operationId}/PMOC/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const download = await fetch(`${apiBase}/documents/${rendered.id}/download`, { headers: ownerHeaders });
  if (!download.ok) throw new Error(`Document download failed with ${download.status}.`);
  const pdf = Buffer.from(await download.arrayBuffer());
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Rendered PMOC PDF is invalid.');
  const repository = await api(`/documents?page=1&limit=100&type=PMOC&search=${encodeURIComponent(rendered.number)}`, { headers: ownerHeaders });
  if (!repository.items.some((item) => item.id === rendered.id)) throw new Error('PMOC document is missing from repository.');
  const evidence = { pmocPlanId: plan.id, operationId, assignmentId: assignment.id, documentId: rendered.id, automaticallyGeneratedOperationId: automaticallyGenerated.generatedOperationId, equipmentCount: operation.inspectedEquipments.length, serviceTypes: operation.serviceTypes, signaturePolicies: policyResults, pdfBytes: pdf.length, repositoryConfirmed: true, operatorWorkflowConfirmed: true, subsequentAutomaticGenerationConfirmed: true };
  await writeFile('/private/tmp/orbit-pmoc-ux01-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await prisma.$disconnect();
}
