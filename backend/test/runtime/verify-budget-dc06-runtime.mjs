import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
dotenv.config({ path: new URL('../../../.env', import.meta.url), quiet: true });
process.env.DATABASE_URL ??= `postgresql://${encodeURIComponent(process.env.POSTGRES_USER ?? '')}:${encodeURIComponent(process.env.POSTGRES_PASSWORD ?? '')}@127.0.0.1:5432/${encodeURIComponent(process.env.POSTGRES_DB ?? '')}?schema=public`;
const apiBase = process.env.ORBIT_RUNTIME_API ?? 'http://127.0.0.1:4000/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiBase) || process.env.NODE_ENV === 'production') throw new Error('DC-06 runtime is local-only.');

const prisma = new PrismaClient();
const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isActive: true, disabledAt: null }, orderBy: { createdAt: 'asc' } });
if (!owner) throw new Error('An active OWNER is required.');
const originalHash = owner.passwordHash;
const temporaryPassword = `Dc06!${randomBytes(18).toString('base64url')}`;
const evidence = { manualBudgetId: null, operationBudgetId: null, documentId: null };

async function request(path, init = {}, binary = false) {
  const response = await fetch(`${apiBase}${path}`, init);
  if (binary) {
    const content = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status}`);
    return { content, contentType: response.headers.get('content-type') };
  }
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}

try {
  await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: await argon2.hash(temporaryPassword), mustChangePassword: false } });
  const login = await request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: owner.email, password: temporaryPassword }) });
  const headers = { authorization: `Bearer ${login.accessToken}`, 'content-type': 'application/json' };
  const customers = await request('/customers?page=1&limit=20', { headers });
  const customer = customers.items[0];
  if (!customer) throw new Error('A real Customer is required for runtime verification.');
  const customerDetail = await request(`/customers/${customer.id}`, { headers });
  const signatures = await request('/signatures?page=1&limit=100&active=true', { headers });
  const technical = signatures.items.find((item) => item.hasImage && item.active);
  if (!technical) throw new Error('An active technical signature with image is required.');

  const payload = {
    customerId: customer.id,
    customerAddressId: customerDetail.addresses?.[0]?.id,
    title: `Certificação DC-06 ${new Date().toISOString()}`,
    description: 'Escopo técnico criado pelo fluxo manual oficial.',
    issuedAt: new Date().toISOString(),
    introduction: 'Atendendo à honrosa solicitação de V.Sa., apresentamos nosso orçamento conforme solicitado.',
    validityDays: 30,
    paymentMethods: ['PIX', 'CREDIT_CARD'],
    commercialNotes: 'Condições comerciais validadas em runtime.',
    status: 'DRAFT',
    items: [
      { type: 'SERVICE', description: 'Higienização técnica do sistema', quantity: 1, unit: 'SERV', unitPrice: 850, sortOrder: 0 },
      { type: 'MATERIAL', description: 'Filtro de reposição', quantity: 5, unit: 'UN', unitPrice: 85, sortOrder: 1 },
    ],
  };
  let manual = await request('/budgets', { method: 'POST', headers, body: JSON.stringify(payload) });
  evidence.manualBudgetId = manual.id;
  evidence.documentId = manual.document?.id;
  if (!evidence.documentId) throw new Error('Budget did not receive an OperationDocument.');
  await request(`/documents/${evidence.documentId}/handoff/technical-signature`, { method: 'PATCH', headers, body: JSON.stringify({ signatureId: technical.id }) });
  await request(`/documents/${evidence.documentId}/handoff/customer-signature`, { method: 'PATCH', headers, body: JSON.stringify({ signerName: customer.tradeName || customer.name, signerRole: 'Responsável', signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', timezone: 'America/Recife' }) });

  const preview = await request(`/budgets/${manual.id}/preview`, { headers });
  const sectionIds = preview.sections.map((section) => section.id);
  for (const required of ['budget-services', 'budget-materials', 'budget-totals', 'budget-commercial-conditions', 'signature']) if (!sectionIds.includes(required)) throw new Error(`Preview missing ${required}`);
  const rendered = await request(`/budgets/${manual.id}/render`, { method: 'POST', headers, body: '{}' });
  if (rendered.documentId !== evidence.documentId) throw new Error('Render replaced the official document identity.');
  const download = await request(`/budgets/${manual.id}/download`, { headers }, true);
  if (download.content.subarray(0, 5).toString('latin1') !== '%PDF-' || !download.contentType?.includes('application/pdf')) throw new Error('Downloaded artifact is not a valid PDF.');
  const repository = await request(`/documents?page=1&limit=100&search=${encodeURIComponent(manual.document.number)}`, { headers });
  if (!repository.items.some((item) => item.id === evidence.documentId && item.type === 'BUDGET')) throw new Error('Budget document is absent from repository.');

  manual = await request(`/budgets/${manual.id}`, { headers });
  await request(`/budgets/${manual.id}`, { method: 'PATCH', headers, body: JSON.stringify({ title: `${manual.title} — revisado` }) });
  const stale = await request(`/budgets/${manual.id}`, { headers });
  if (stale.document?.editorialStatus !== 'STALE') throw new Error('Edited rendered Budget was not marked STALE.');
  await request(`/budgets/${manual.id}/render`, { method: 'POST', headers, body: '{}' });

  const operations = await request('/operations?page=1&limit=100&status=COMPLETED', { headers });
  const operation = operations.items.find((item) => item.customer?.id === customer.id) ?? operations.items[0];
  if (operation) {
    const detail = await request(`/operations/${operation.id}`, { headers });
    const fromOperation = await request('/budgets', { method: 'POST', headers, body: JSON.stringify({ ...payload, operationId: operation.id, customerId: detail.customer.id, customerAddressId: detail.address?.id, equipmentId: detail.equipment?.id, title: `DC-06 a partir da OS-${String(operation.number).padStart(6, '0')}` }) });
    evidence.operationBudgetId = fromOperation.id;
    if (fromOperation.operationId !== operation.id) throw new Error('Operation origin was not preserved.');
  }

  console.log(JSON.stringify({ verdict: 'ORBIT_DC06_RUNTIME_PASS', ...evidence, previewSections: sectionIds, pdfBytes: download.content.length, repository: true, staleRegeneration: true, fromCompletedOperation: Boolean(evidence.operationBudgetId) }, null, 2));
} finally {
  await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: originalHash } }).catch(() => undefined);
  await prisma.$disconnect();
}
