import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
const rootEnv = await readFile('../.env', 'utf8');
const env = Object.fromEntries(rootEnv.split(/\r?\n/).filter((line) => /^[A-Z0-9_]+=/.test(line)).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/${env.POSTGRES_DB}?schema=public`;
const prisma = new PrismaClient();
const apiBase = 'http://127.0.0.1:4000/api/v1';
const credentials = JSON.parse(await readFile('/private/tmp/orbit-pmoc-fix02a-credentials.json', 'utf8'));
const foundation = JSON.parse(await readFile('/private/tmp/orbit-pmoc-fix02a-evidence.json', 'utf8'));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body.error)}`);
  return body.data;
}
async function login(input) { return request('/auth/login', { method: 'POST', body: JSON.stringify(input) }); }
function auth(token) { return { authorization: `Bearer ${token}` }; }
function gallery(blueprint) { return blueprint.sections.flatMap((section) => section.components).find((component) => component.kind === 'imageGallery'); }

try {
  const ownerLogin = await login(credentials.owner);
  const operatorLogin = await login(credentials.operator);
  const ownerHeaders = auth(ownerLogin.accessToken);
  const operatorHeaders = auth(operatorLogin.accessToken);

  // Scenario 1: evidence collected by the Operator keeps immutable attribution metadata.
  const operatorOperation = await request(`/operations/${foundation.scenario1.operationId}`, { headers: ownerHeaders });
  if (!operatorOperation.photos.length) throw new Error('Scenario 1 has no Operator evidence.');
  if (operatorOperation.photos.some((photo) => !photo.createdAt || photo.createdBy?.role !== 'OPERATOR')) throw new Error('Scenario 1 did not preserve Operator/date metadata.');
  for (const photo of operatorOperation.photos) {
    const protectedPhoto = await request(`/operations/photos/${photo.id}`, { headers: ownerHeaders });
    if (!protectedPhoto.mimeType?.startsWith('image/') || !protectedPhoto.contentBase64) throw new Error(`Scenario 1 protected thumbnail failed for ${photo.id}.`);
  }

  // Scenario 2: Platform can start empty, add a batch, edit a caption and remove an item.
  const operationId = foundation.scenario2.operationId;
  let platformOperation = await request(`/operations/${operationId}`, { headers: ownerHeaders });
  for (const photo of platformOperation.photos) await request(`/operations/photos/${photo.id}`, { method: 'DELETE', headers: ownerHeaders });
  platformOperation = await request(`/operations/${operationId}`, { headers: ownerHeaders });
  if (platformOperation.photos.length !== 0) throw new Error('Scenario 2 empty state was not reached.');

  await request(`/operations/${operationId}`, {
    method: 'PATCH', headers: ownerHeaders,
    body: JSON.stringify({ photos: ['Entrada de ar', 'Condensadora', 'Painel elétrico', 'Ambiente técnico'].map((caption) => ({ dataUrl: `data:image/png;base64,${png}`, caption })) }),
  });
  platformOperation = await request(`/operations/${operationId}`, { headers: ownerHeaders });
  if (platformOperation.photos.length !== 4 || platformOperation.photos.some((photo) => photo.createdBy?.role !== 'OWNER')) throw new Error('Scenario 2 batch upload/author attribution failed.');
  const edited = platformOperation.photos[1];
  await request(`/operations/photos/${edited.id}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ caption: 'Condensadora — inspeção concluída' }) });
  const removed = platformOperation.photos[0];
  await request(`/operations/photos/${removed.id}`, { method: 'DELETE', headers: ownerHeaders });
  platformOperation = await request(`/operations/${operationId}`, { headers: ownerHeaders });
  if (platformOperation.photos.length !== 3 || platformOperation.photos.some((photo) => photo.id === removed.id) || !platformOperation.photos.some((photo) => photo.caption === 'Condensadora — inspeção concluída')) throw new Error('Scenario 2 caption edit/removal failed.');
  await request(`/operations/${operationId}`, { method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ photos: [{ dataUrl: `data:image/png;base64,${png}`, caption: 'Registro complementar' }] }) });
  platformOperation = await request(`/operations/${operationId}`, { headers: ownerHeaders });
  if (platformOperation.photos.length !== 4) throw new Error('Scenario 2 replacement evidence upload failed.');

  const forbiddenEdit = await fetch(`${apiBase}/operations/photos/${platformOperation.photos[0].id}`, { method: 'PATCH', headers: { ...operatorHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ caption: 'alteração indevida' }) });
  const forbiddenDelete = await fetch(`${apiBase}/operations/photos/${platformOperation.photos[0].id}`, { method: 'DELETE', headers: operatorHeaders });
  if (forbiddenEdit.status !== 403 || forbiddenDelete.status !== 403) throw new Error('Scenario 2 RBAC did not block Operator metadata management.');

  // Scenario 3: the official context is the sole source for Preview, Render and PDF order.
  const operationPreview = await request(`/documents/operations/${operationId}/PMOC/preview`, { headers: ownerHeaders });
  const previewGallery = gallery(operationPreview);
  const expectedIds = platformOperation.photos.map((photo) => photo.id);
  const expectedCaptions = platformOperation.photos.map((photo) => photo.caption);
  if (!previewGallery || JSON.stringify(previewGallery.images.map((image) => image.sourceId)) !== JSON.stringify(expectedIds) || JSON.stringify(previewGallery.images.map((image) => image.caption)) !== JSON.stringify(expectedCaptions)) throw new Error('Scenario 3 Operation Preview is not ordered from the official evidence source.');
  const rendered = await request(`/documents/operations/${operationId}/PMOC/render`, { method: 'POST', headers: ownerHeaders, body: '{}' });
  const documentPreview = await request(`/documents/${rendered.id}/preview`, { headers: ownerHeaders });
  const renderedGallery = gallery(documentPreview);
  if (!renderedGallery || JSON.stringify(renderedGallery.images.map((image) => image.sourceId)) !== JSON.stringify(expectedIds)) throw new Error('Scenario 3 emitted preview lost evidence ordering.');
  const pdf = await fetch(`${apiBase}/documents/${rendered.id}/download`, { headers: ownerHeaders });
  const bytes = Buffer.from(await pdf.arrayBuffer());
  if (!pdf.ok || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Scenario 3 official PDF download is invalid.');

  const auditActions = await prisma.auditLog.groupBy({
    by: ['action'],
    where: { resource: 'OPERATION_PHOTO', metadata: { path: ['operationId'], equals: operationId } },
    _count: { _all: true },
  });
  const auditMap = Object.fromEntries(auditActions.map((item) => [item.action, item._count._all]));
  for (const action of ['OPERATION_PHOTO_UPLOADED', 'OPERATION_PHOTO_CAPTION_UPDATED', 'OPERATION_PHOTO_DELETED']) if (!auditMap[action]) throw new Error(`Missing append-only audit ${action}.`);

  const evidence = {
    scenario1: { pmocPlanId: foundation.scenario1.pmocPlanId, operationId: operatorOperation.id, photoCount: operatorOperation.photos.length, captions: operatorOperation.photos.map((photo) => photo.caption), authors: operatorOperation.photos.map((photo) => photo.createdBy), thumbnailsProtected: true },
    scenario2: { pmocPlanId: foundation.scenario2.pmocPlanId, operationId, emptyStateVerified: true, multipleUploadVerified: true, captionUpdated: true, removedPhotoId: removed.id, remainingPhotoIds: expectedIds, remainingCaptions: expectedCaptions, rbacOperatorBlocked: true },
    scenario3: { operationId, documentId: rendered.id, wizardPhotoIds: expectedIds, previewPhotoIds: previewGallery.images.map((image) => image.sourceId), renderedPreviewPhotoIds: renderedGallery.images.map((image) => image.sourceId), orderPreserved: true, validPdf: true, pdfBytes: bytes.length },
    audit: auditMap,
  };
  await writeFile('/private/tmp/orbit-pmoc-fix02b-credentials.json', JSON.stringify(credentials));
  await writeFile('/private/tmp/orbit-pmoc-fix02b-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await prisma.$disconnect(); }
