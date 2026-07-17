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

try {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const customer = await prisma.customer.findFirst({ where: { isActive: true }, include: { addresses: { take: 1 } }, orderBy: { createdAt: 'asc' } });
  if (!organization || !customer) throw new Error('Runtime organization/customer foundation is missing.');
  const equipments = await prisma.equipment.findMany({ where: { customerId: customer.id, isActive: true, disabledAt: null }, take: 2, orderBy: { createdAt: 'asc' } });
  if (equipments.length < 2) throw new Error('At least two active customer equipments are required.');

  const password = 'RuntimePmocUx02!Owner';
  const owner = await prisma.user.upsert({
    where: { email: 'runtime.pmoc.ux02.owner@orbit.local' },
    create: { email: 'runtime.pmoc.ux02.owner@orbit.local', username: 'runtimepmocux02owner', name: 'Owner PMOC UX-02', passwordHash: await argon2.hash(password), role: Role.OWNER, isActive: true, mustChangePassword: false },
    update: { passwordHash: await argon2.hash(password), role: Role.OWNER, isActive: true, disabledAt: null, mustChangePassword: false },
  });
  const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: owner.email, password }) });
  const headers = { authorization: `Bearer ${login.accessToken}` };

  const suggestion = await api(`/pmoc/name-suggestion?customerId=${customer.id}`, { headers });
  if (!suggestion.name.includes('PMOC-')) throw new Error('Official PMOC name suggestion is missing its number.');
  const defaults = await api('/technical-catalogs?type=PLAN_SCOPE&workflow=PMOC&includeGeneral=true&active=true&limit=100', { headers });
  if (defaults.items.length < 15 || !defaults.items.some((item) => item.title === 'Outros')) throw new Error('PLAN_SCOPE defaults are incomplete.');
  const customScope = await api('/technical-catalogs', {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'PLAN_SCOPE', title: `Casa de máquinas UX-02 ${Date.now()}`, tags: ['pmoc', 'runtime'], areas: ['HVAC'], workflows: ['PMOC'], active: true }),
  });
  const refreshed = await api(`/technical-catalogs?type=PLAN_SCOPE&workflow=PMOC&includeGeneral=true&active=true&limit=100&search=${encodeURIComponent(customScope.title)}`, { headers });
  if (!refreshed.items.some((item) => item.id === customScope.id)) throw new Error('New catalog scope was not immediately reusable.');

  const start = new Date(); start.setUTCDate(start.getUTCDate() + 3);
  const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const plan = await api('/pmoc', {
    method: 'POST', headers,
    body: JSON.stringify({
      customerId: customer.id,
      equipmentId: equipments[0].id,
      equipmentIds: equipments.map((item) => item.id),
      scopeCatalogIds: [defaults.items[0].id, customScope.id],
      serviceTypes: ['PREVENTIVA', 'CORRETIVA'],
      responsibleTechnician: owner.name,
      defaultTechnicianId: owner.id,
      generationMode: 'MANUAL',
      periodicity: 'MONTHLY',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }),
  });
  if (plan.maintenancePlan.name !== suggestion.name) throw new Error(`Suggested/final official name diverged: ${suggestion.name} != ${plan.maintenancePlan.name}`);
  if (plan.scopes.length !== 2 || plan.equipments.length !== 2 || plan.serviceTypes.length !== 2) throw new Error('Structured PMOC coverage was not persisted.');

  const customName = `${plan.maintenancePlan.name} · Ala principal`;
  const renamed = await api(`/pmoc/${plan.id}`, { method: 'PATCH', headers, body: JSON.stringify({ name: customName }) });
  if (renamed.maintenancePlan.name !== customName) throw new Error('Manual name edition was overwritten.');

  const request = plan.executionRequests.find((item) => item.status === 'PENDING');
  const adjustedDate = new Date(request.scheduledFor); adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 2);
  const rescheduled = await api(`/pmoc/execution-requests/${request.id}/reschedule`, { method: 'PATCH', headers, body: JSON.stringify({ scheduledFor: adjustedDate.toISOString(), notes: 'Ajuste individual UX-02' }) });
  if (rescheduled.executionNumber !== request.executionNumber || new Date(rescheduled.scheduledFor).toISOString() !== adjustedDate.toISOString()) throw new Error('Individual execution adjustment lost identity or date.');

  const prefill = await api(`/pmoc/execution-requests/${request.id}/prefill`, { headers });
  const generated = await api(`/pmoc/execution-requests/${request.id}/generate-work-order`, { method: 'POST', headers, body: JSON.stringify({ operation: prefill }) });
  const operationId = generated.generatedOperationId;
  const assignments = await api(`/assignments?operationId=${operationId}&page=1&limit=10`, { headers });
  const assignment = assignments.items[0];
  await api(`/assignments/${assignment.id}/accept`, { method: 'PATCH', headers, body: '{}' });
  await api(`/assignments/${assignment.id}/start`, { method: 'PATCH', headers, body: '{}' });
  await api(`/operations/${operationId}`, { method: 'PATCH', headers, body: JSON.stringify({ photos: Array.from({ length: 4 }, (_, index) => ({ dataUrl: `data:image/png;base64,${png}`, caption: `Evidência PMOC UX-02 ${index + 1}` })) }) });
  await api(`/assignments/${assignment.id}/complete`, { method: 'PATCH', headers, body: JSON.stringify({ notes: 'Execução PMOC UX-02 concluída.' }) });
  const preview = await api(`/documents/operations/${operationId}/PMOC/preview`, { headers });
  if (!preview.sections?.length) throw new Error('PMOC preview is empty.');
  const rendered = await api(`/documents/operations/${operationId}/PMOC/render`, { method: 'POST', headers, body: '{}' });
  const download = await fetch(`${apiBase}/documents/${rendered.id}/download`, { headers });
  if (!download.ok) throw new Error(`Document download failed with ${download.status}.`);
  const pdf = Buffer.from(await download.arrayBuffer());
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('PMOC PDF is invalid.');
  const repository = await api(`/documents?page=1&limit=100&type=PMOC&search=${encodeURIComponent(rendered.number)}`, { headers });
  if (!repository.items.some((item) => item.id === rendered.id)) throw new Error('PMOC document is missing from repository.');

  const evidence = {
    pmocPlanId: plan.id,
    officialSuggestion: suggestion.name,
    customNamePreserved: renamed.maintenancePlan.name,
    scopeCount: plan.scopes.length,
    defaultScopeCount: defaults.items.length,
    customScopeImmediatelyReusable: true,
    equipmentCount: plan.equipments.length,
    serviceTypeCount: plan.serviceTypes.length,
    rescheduledExecutionNumber: rescheduled.executionNumber,
    rescheduledFor: rescheduled.scheduledFor,
    operationId,
    assignmentId: assignment.id,
    documentId: rendered.id,
    pdfBytes: pdf.length,
    repositoryConfirmed: true,
  };
  await writeFile('/private/tmp/orbit-pmoc-ux02-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await prisma.$disconnect();
}
