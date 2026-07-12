import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') {
  throw new Error('Set ORBIT_RUNTIME_VERIFY=true to create the guarded local runtime fixture.');
}
const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost', 'postgres'].includes(databaseUrl.hostname) || process.env.NODE_ENV === 'production') {
  throw new Error('Runtime verification is allowed only against a local non-production database.');
}

const prisma = new PrismaClient();
const apiBase = process.env.ORBIT_RUNTIME_API ?? 'http://127.0.0.1:4000/api/v1';
const outputDir = process.env.ORBIT_RUNTIME_OUTPUT_DIR ?? '/private/tmp';
const email = 'runtime.closure.06.1@orbit.local';
const username = 'runtimeclosure061';
const password = `Rt!${randomBytes(18).toString('base64url')}`;
const signatureBase64 = visibleSignaturePng().toString('base64');
const scheduledFor = '2026-07-15T13:30:00.000Z';
const signatureMode = process.env.ORBIT_RUNTIME_SIGNATURE_MODE === 'FIXED' ? 'FIXED' : 'HYBRID';

function visibleSignaturePng() {
  const width = 320;
  const height = 80;
  const pixels = Buffer.alloc(width * height * 3, 255);
  const set = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = (y * width + x) * 3;
    pixels[index] = 15; pixels[index + 1] = 23; pixels[index + 2] = 42;
  };
  const line = (x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0); const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0); const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      for (let offset = -1; offset <= 1; offset += 1) set(x0, y0 + offset);
      if (x0 === x1 && y0 === y1) break;
      const doubled = 2 * error;
      if (doubled >= dy) { error += dy; x0 += sx; }
      if (doubled <= dx) { error += dx; y0 += sy; }
    }
  };
  [[18, 55, 54, 22], [54, 22, 78, 58], [78, 58, 104, 18], [104, 18, 126, 54],
    [126, 54, 154, 28], [154, 28, 185, 51], [185, 51, 215, 24], [215, 24, 250, 48],
    [250, 48, 300, 37]].forEach((segment) => line(...segment));
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const target = row * (width * 3 + 1);
    raw[target] = 0;
    pixels.copy(raw, target + 1, row * width * 3, (row + 1) * width * 3);
  }
  const chunk = (type, data) => {
    const name = Buffer.from(type);
    const crcInput = Buffer.concat([name, data]);
    const output = Buffer.alloc(data.length + 12);
    output.writeUInt32BE(data.length, 0); name.copy(output, 4); data.copy(output, 8);
    output.writeUInt32BE(crc32(crcInput), data.length + 8);
    return output;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function api(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(`${init.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body.error)}`);
  }
  return body.data;
}

async function upload(path, fields, bytes, filename, authorization) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  form.append('file', new Blob([bytes], { type: 'image/png' }), filename);
  const response = await fetch(`${apiBase}${path}`, { method: 'POST', headers: authorization, body: form });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`POST ${path} failed: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}

try {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      username,
      name: 'Runtime Closure 06.1',
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      mustChangePassword: false,
      notes: 'Guarded local runtime verification account',
    },
    update: {
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      disabledAt: null,
      mustChangePassword: false,
    },
  });

  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const authorization = { authorization: `Bearer ${login.accessToken}` };
  const templates = await api('/organization/templates', { headers: authorization });
  const workOrderTemplate = templates.find((template) => template.type === 'WORK_ORDER' && template.isDefault) ?? templates.find((template) => template.type === 'WORK_ORDER');
  if (!workOrderTemplate) throw new Error('Active WORK_ORDER template was not found.');
  const signaturePage = await api('/signatures?page=1&limit=100&search=Runtime', { headers: authorization });
  let institutionalSignature = signaturePage.items.find((item) => item.name === 'Responsável Técnico Runtime');
  if (!institutionalSignature) {
    institutionalSignature = await api('/signatures', {
      method: 'POST', headers: authorization,
      body: JSON.stringify({ name: 'Responsável Técnico Runtime', title: 'Engenheiro Mecânico', professionalCouncil: 'CREA-PE 123456', department: 'Engenharia', active: true }),
    });
  }
  if (!institutionalSignature.hasImage) {
    institutionalSignature = await upload(`/signatures/${institutionalSignature.id}/upload`, {}, Buffer.from(signatureBase64, 'base64'), 'responsavel-tecnico.png', authorization);
  }
  await api(`/organization/templates/${workOrderTemplate.id}`, {
    method: 'PATCH', headers: authorization,
    body: JSON.stringify({
      requiresSignature: true,
      signatureMode,
      signatureId: institutionalSignature.id,
      institutionalSignatureIds: [institutionalSignature.id],
      executionSignatureClient: signatureMode === 'HYBRID',
      executionSignatureTechnician: false,
      executionSignatureOperator: false,
    }),
  });
  await upload('/organization/assets', { type: 'LOGO' }, Buffer.from(signatureBase64, 'base64'), 'runtime-logo.png', authorization);
  const customers = await api('/customers?page=1&limit=1', { headers: authorization });
  const customer = customers.items[0];
  if (!customer) throw new Error('Local runtime database has no Customer fixture.');
  const customerDetail = await api(`/customers/${customer.id}`, { headers: authorization });
  const equipmentPage = await api(`/equipments?page=1&limit=1&customerId=${customer.id}`, { headers: authorization });
  const equipment = equipmentPage.items[0] ?? null;
  if (!equipment) throw new Error('Local runtime database has no Equipment fixture with official QR.');
  const equipmentFromQr = await api(`/equipments/lookup/${encodeURIComponent(equipment.qrCode)}`, { headers: authorization });
  if (equipmentFromQr.id !== equipment.id) throw new Error('Official equipment QR payload did not resolve the expected Equipment.');
  const operation = await api('/operations', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({
      customerId: customer.id,
      addressId: customerDetail.addresses?.[0]?.id ?? null,
      equipmentId: equipment?.id ?? null,
      type: 'PREVENTIVA',
      status: 'COMPLETED',
      scheduledFor,
      startedAt: '2026-07-15T13:35:00.000Z',
      completedAt: '2026-07-15T14:40:00.000Z',
      reportedIssue: 'Cliente relata temperatura elevada, perda de capacidade e desconforto térmico no ambiente.',
      serviceDescription: 'Inspeção do circuito elétrico\nCorreção do ponto de vazamento\nLimpeza interna do sistema\nRecarga de fluido refrigerante\nTestes finais de funcionamento',
      observations: 'Revisão técnica concluída — pressão, vazão e condição do equipamento estão estáveis.',
      checklist: [
        { label: 'Verificação elétrica e tensão', done: true, note: 'Conexões íntegras' },
        { label: 'Higienização e inspeção', done: true, note: 'Execução concluída' },
      ],
      signatureData: `data:image/png;base64,${signatureBase64}`,
      signedAt: '2026-07-15T14:38:00.000Z',
    }),
  });
  let inventory = await api('/inventory?page=1&limit=1', { headers: authorization });
  if (!inventory.items[0]) {
    const products = await api('/products?page=1&limit=100&search=ORBIT-DC012', { headers: authorization });
    let product = products.items.find((item) => item.sku === 'ORBIT-DC012');
    if (!product) {
      product = await api('/products', {
        method: 'POST', headers: authorization,
        body: JSON.stringify({
          sku: 'ORBIT-DC012',
          internalCode: 'DC012-MATERIAL',
          name: 'Fluido refrigerante técnico',
          unit: 'KG',
          category: 'Refrigeração',
          technicalDescription: 'Material local destinado exclusivamente à certificação runtime da Ordem de Serviço.',
        }),
      });
    }
    inventory = await api(`/inventory?page=1&limit=1&productId=${product.id}`, { headers: authorization });
  }
  const inventoryItem = inventory.items[0];
  if (!inventoryItem?.productId) throw new Error('Could not resolve an InventoryItem for the runtime Work Order material.');
  if (Number(inventoryItem.availableQuantity) < 0.001) {
    await api('/inventory/movements', {
      method: 'POST', headers: authorization,
      body: JSON.stringify({ inventoryItemId: inventoryItem.id, quantity: 1, type: 'IN', reason: 'Entrada local para certificação DC-01.2' }),
    });
  }
  await api(`/operations/${operation.id}/materials`, {
    method: 'POST', headers: authorization,
    body: JSON.stringify({ productId: inventoryItem.productId, inventoryItemId: inventoryItem.id, quantity: 0.001, notes: 'Material runtime DC-01.2' }),
  });
  let reloaded = await api(`/operations/${operation.id}`, { headers: authorization });
  let preview = await api(`/documents/operations/${operation.id}/WORK_ORDER/preview`, { headers: authorization });
  let rendered = await api(`/documents/operations/${operation.id}/WORK_ORDER/render`, {
    method: 'POST',
    headers: authorization,
    body: '{}',
  });
  let download = await api(`/documents/${rendered.id}/download`, { headers: authorization });
  await api(`/operations/${operation.id}`, {
    method: 'PATCH', headers: authorization,
    body: JSON.stringify({ observations: 'Revisão técnica concluída — pressão, vazão e condição do equipamento estão estáveis. Atualização confirmada.' }),
  });
  const staleResponse = await fetch(`${apiBase}/documents/${rendered.id}/download`, { headers: authorization });
  const staleBody = await staleResponse.json();
  if (staleResponse.status !== 409 || staleBody.error?.code !== 'DOCUMENT_STALE') {
    throw new Error(`Expected DOCUMENT_STALE after source mutation, received ${staleResponse.status}.`);
  }
  preview = await api(`/documents/operations/${operation.id}/WORK_ORDER/preview`, { headers: authorization });
  rendered = await api(`/documents/operations/${operation.id}/WORK_ORDER/render`, {
    method: 'POST', headers: authorization, body: '{}',
  });
  download = await api(`/documents/${rendered.id}/download`, { headers: authorization });
  reloaded = await api(`/operations/${operation.id}`, { headers: authorization });
  const pdf = Buffer.from(download.contentBase64, 'base64');
  const components = preview.sections.flatMap((section) => section.components.map((component) => component.kind));
  const signature = preview.sections.flatMap((section) => section.components).find((component) => component.kind === 'signature');
  const expectedOrder = ['work-order-identification', 'work-order-customer', ...(equipment ? ['equipment'] : []), 'work-order-reported-issue', 'work-order-services', 'checklist-checklist-da-execucao'];
  if (!expectedOrder.every((id, index) => preview.sections[index]?.id === id)) {
    throw new Error(`Unexpected Work Order section order: ${preview.sections.map((section) => section.id).join(', ')}`);
  }

  await writeFile(`${outputDir}/orbit-work-order-06-1.pdf`, pdf);
  await writeFile(`${outputDir}/orbit-runtime-06-1-credentials.json`, JSON.stringify({ email, password }));
  await writeFile(`${outputDir}/orbit-runtime-06-1-evidence.json`, JSON.stringify({
    operationId: operation.id,
    operationShortId: operation.id.slice(0, 8),
    documentId: rendered.id,
    documentShortId: rendered.id.slice(0, 8),
    documentType: preview.metadata.documentType,
    templateId: preview.metadata.templateId,
    blueprintVersion: preview.version,
    sourceFingerprint: preview.metadata.sourceFingerprint,
    componentKinds: components,
    sectionTitles: preview.sections.map((section) => section.title),
    sectionIds: preview.sections.map((section) => section.id),
    reportedIssuePresent: JSON.stringify(preview).includes('temperatura elevada'),
    serviceDescriptionPresent: JSON.stringify(preview).includes('Recarga de fluido refrigerante'),
    materialPresent: JSON.stringify(preview).includes('Fluido refrigerante técnico'),
    organizationLogoPresent: Boolean(preview.header.logo),
    qrImagePresent: Boolean(preview.sections.flatMap((section) => section.components).find((component) => component.kind === 'qrCode')?.image?.contentBase64),
    qrPayload: equipment.qrCode,
    qrLookupResolvedEquipment: equipmentFromQr.id === equipment.id,
    institutionalSignatureId: institutionalSignature.id,
    signatureMode,
    institutionalSignaturePresent: Boolean(signature?.signatures?.some((item) => item.id === institutionalSignature.id && item.image)),
    executionSignaturePresent: Boolean(signature?.signatures?.some((item) => item.role === 'collected' && item.image)),
    signaturePersisted: Boolean(reloaded.signatureData),
    signedAt: reloaded.signedAt,
    signatureComponentPresent: Boolean(signature),
    signatureImagePresent: Boolean(signature?.signatures?.some((item) => item.image)),
    createdAt: reloaded.createdAt,
    scheduledFor: reloaded.scheduledFor,
    renderedAt: rendered.renderedAt,
    renderFingerprint: rendered.renderMetadata?.sourceFingerprint,
    staleDownloadStatus: staleResponse.status,
    staleDownloadCode: staleBody.error?.code,
    rerenderRequired: staleBody.error?.details?.rerenderRequired === true,
    pdfHeader: pdf.subarray(0, 5).toString('ascii'),
    pdfBytes: pdf.length,
    pdfSha256: createHash('sha256').update(pdf).digest('hex'),
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
