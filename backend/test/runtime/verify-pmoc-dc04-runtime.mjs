import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('Set ORBIT_RUNTIME_VERIFY=true.');
const rootEnv = await readFile('../.env', 'utf8');
const env = Object.fromEntries(rootEnv.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/${env.POSTGRES_DB}?schema=public`;
const prisma = new PrismaClient();
const apiBase = 'http://127.0.0.1:4000/api/v1';
const email = 'runtime.dc04@orbit.local';
const password = 'RuntimeDc04!ChangeOnlyLocal';
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function api(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}

try {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const customer = await prisma.customer.findFirst({ where: { isActive: true }, include: { addresses: { take: 1 } }, orderBy: { createdAt: 'asc' } });
  if (!organization || !customer) throw new Error('Organization/customer runtime foundation is missing.');
  const initialEquipments = await prisma.equipment.findMany({ where: { customerId: customer.id, isActive: true, disabledAt: null }, take: 2, orderBy: { createdAt: 'asc' } });
  if (initialEquipments.length === 0) throw new Error('Customer has no active equipment for PMOC runtime.');
  if (initialEquipments.length === 1) {
    initialEquipments.push(await prisma.equipment.create({ data: { customerId: customer.id, addressId: customer.addresses[0]?.id ?? null, type: initialEquipments[0].type, status: 'ACTIVE', name: 'Equipamento auxiliar DC-04', tag: `DC04-${Date.now()}`, manufacturer: initialEquipments[0].manufacturer, model: initialEquipments[0].model, capacity: initialEquipments[0].capacity, qrCode: `equipment:dc04:${Date.now()}` } }));
  }
  const equipments = initialEquipments;
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, username: 'runtimedc04', name: 'Runtime DC-04', passwordHash: await argon2.hash(password), role: Role.OWNER, isActive: true, mustChangePassword: false },
    update: { passwordHash: await argon2.hash(password), role: Role.OWNER, isActive: true, disabledAt: null, mustChangePassword: false },
  });
  const operatorEmail = 'runtime.dc04.operator@orbit.local';
  const operatorPassword = 'RuntimeDc04!OperatorLocal';
  const operator = await prisma.user.upsert({ where: { email: operatorEmail }, create: { email: operatorEmail, username: 'runtimedc04op', name: 'Operador Runtime DC-04', passwordHash: await argon2.hash(operatorPassword), role: Role.OPERATOR, isActive: true, mustChangePassword: false }, update: { passwordHash: await argon2.hash(operatorPassword), role: Role.OPERATOR, isActive: true, disabledAt: null, mustChangePassword: false } });
  const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  const headers = { authorization: `Bearer ${login.accessToken}` };
  const operatorLogin = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: operatorEmail, password: operatorPassword }) });
  const operatorHeaders = { authorization: `Bearer ${operatorLogin.accessToken}` };
  const templates = await api('/organization/templates', { headers });
  const pmocTemplate = templates.find((item) => item.type === 'PMOC' && item.isDefault) ?? templates.find((item) => item.type === 'PMOC');
  const signatures = await api('/signatures?page=1&limit=100&active=true', { headers });
  const institutional = signatures.items.find((item) => item.active && item.hasImage);
  if (!pmocTemplate || !institutional) throw new Error('PMOC template and active institutional signature are required.');
  await api(`/organization/templates/${pmocTemplate.id}`, { method: 'PATCH', headers, body: JSON.stringify({ requiresSignature: true, signatureMode: 'HYBRID', signatureId: institutional.id, institutionalSignatureIds: [institutional.id], executionSignatureClient: true, executionSignatureTechnician: false, executionSignatureOperator: false }) });
  const now = new Date();
  const end = new Date(now); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const pmoc = await api('/pmoc', { method: 'POST', headers, body: JSON.stringify({ customerId: customer.id, equipmentId: equipments[0].id, equipmentIds: equipments.map((item) => item.id), responsibleTechnician: 'Responsável Técnico DC-04', artNumber: 'CREA-RUNTIME-04', contractNumber: `PMOC-DC04-${Date.now()}`, startDate: now.toISOString(), endDate: end.toISOString(), recurrenceRule: { frequency: 'MONTHLY', interval: 1 }, observations: 'Fixture runtime local DC-04.' }) });
  const operation = await api('/operations', { method: 'POST', headers, body: JSON.stringify({ customerId: customer.id, addressId: customer.addresses[0]?.id, equipmentId: equipments[0].id, operatorId: operator.id, type: 'PREVENTIVA', status: 'COMPLETED', startedAt: now.toISOString(), completedAt: now.toISOString(), maintenanceType: 'MONTHLY', inspectedEquipments: equipments.map((item, index) => ({ equipmentId: item.id, sector: `Setor ${index + 1}` })), maintenanceChecklist: equipments.flatMap((equipment) => [{ equipmentId: equipment.id, maintenanceType: 'MONTHLY', description: 'Limpar filtros e verificar condições operacionais', executed: true, result: 'YES', observations: 'Executado sem anormalidades' }, { equipmentId: equipment.id, maintenanceType: 'MONTHLY', description: 'Verificar drenagem', executed: false, result: 'NOT_APPLICABLE', observations: 'Item não aplicável ao conjunto' }]), observations: 'Execução PMOC concluída em campo.', photos: Array.from({ length: 4 }, (_, index) => ({ dataUrl: `data:image/png;base64,${png}`, caption: `Evidência PMOC ${index + 1}` })) }) });
  const execution = await api(`/maintenance-plans/${pmoc.maintenancePlanId}/executions`, { method: 'POST', headers, body: JSON.stringify({ scheduledAt: now.toISOString(), notes: 'Runtime DC-04' }) });
  await api(`/maintenance-executions/${execution.id}`, { method: 'PATCH', headers, body: JSON.stringify({ operationId: operation.id, status: 'LINKED' }) });
  const unsignedPreview = await api(`/documents/operations/${operation.id}/PMOC/preview`, { headers });
  if (!JSON.stringify(unsignedPreview).includes('NÃO ASSINADO')) throw new Error('Unsigned PMOC status is missing.');
  const unsignedRender = await api(`/documents/operations/${operation.id}/PMOC/render`, { method: 'POST', headers, body: '{}' });
  await api(`/operations/${operation.id}`, { method: 'PATCH', headers: operatorHeaders, body: JSON.stringify({ signatureData: `data:image/png;base64,${png}`, customerSignerName: 'Cliente Runtime', customerSignerRole: 'Responsável pelo local', signedAt: new Date().toISOString() }) });
  const staleResponse = await fetch(`${apiBase}/documents/${unsignedRender.id}/download`, { headers: operatorHeaders });
  const staleBody = await staleResponse.json();
  if (staleResponse.status !== 409 || staleBody.error?.code !== 'DOCUMENT_STALE') throw new Error('Previous PMOC render was not invalidated after customer signature.');
  const preview = await api(`/documents/operations/${operation.id}/PMOC/preview`, { headers: operatorHeaders });
  if (!JSON.stringify(preview).includes('ASSINADO')) throw new Error('Signed PMOC status is missing.');
  for (const id of ['pmoc-identification', 'pmoc-operational-data', 'pmoc-inspected-equipments', 'pmoc-legal-reference', 'pmoc-checklist-0', 'signature']) if (!preview.sections.some((section) => section.id === id)) throw new Error(`Missing ${id}`);
  const rendered = await api(`/documents/operations/${operation.id}/PMOC/render`, { method: 'POST', headers, body: '{}' });
  const download = await api(`/documents/${rendered.id}/download`, { headers });
  const pdf = Buffer.from(download.contentBase64, 'base64');
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF');
  const repository = await api(`/documents?page=1&limit=100&type=PMOC&search=${encodeURIComponent(rendered.number)}`, { headers });
  if (!repository.items.some((item) => item.id === rendered.id)) throw new Error('Document not found in repository');
  const evidence = { pmocPlanId: pmoc.id, operationId: operation.id, documentId: rendered.id, number: rendered.number, templateId: pmocTemplate.id, institutionalSignatureId: institutional.id, equipmentCount: equipments.length, photoCount: 4, unsignedStatusConfirmed: true, signedByAssignedOperator: true, staleConfirmed: true, sectionIds: preview.sections.map((section) => section.id), checklistTables: preview.sections.filter((section) => section.id.startsWith('pmoc-checklist-')).length, signatureCount: preview.sections.flatMap((section) => section.components).filter((component) => component.kind === 'signature').flatMap((component) => component.signatures).length, pdfBytes: pdf.length, pdfHeader: '%PDF-', repositoryConfirmed: true };
  await writeFile('/private/tmp/orbit-dc04-pmoc.pdf', pdf);
  await writeFile('/private/tmp/orbit-dc04-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await prisma.$disconnect();
}
