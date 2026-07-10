# Product Backlog Closure 03 — Production PDF Exports and Signature Management UX

## Scope

Closure 03 finalized production-grade list PDF exports and signature management UX.

Implemented areas:

- Operations PDF export.
- Documents PDF export.
- Equipment PDF export.
- Signature soft-delete visibility fix.
- Signature creation by upload.
- Signature creation by freehand drawing.
- Settings signature UX redesign.

## Export architecture decision

PDF exports are generated exclusively by the backend.

The frontend calls typed blob endpoints through `api.blob()` and downloads the returned PDF. It does
not generate PDFs, convert CSV to PDF, or mount export layouts locally.

Official endpoints:

- `GET /api/v1/operations/export`
- `GET /api/v1/documents/export`
- `GET /api/v1/equipments/export`

Each endpoint:

- applies RBAC;
- accepts the same filters used by the corresponding list;
- limits exports to 500 rows;
- returns `application/pdf`;
- returns `Content-Disposition` with a safe filename;
- returns `X-Export-Record-Count` and `X-Export-Page-Count`.

## Signature lifecycle decision

Signatures now have a real soft-delete marker, `deletedAt`.

Normal listing and detail access exclude deleted signatures. Inactive signatures can still appear
when not deleted, because inactive and deleted are different states.

Public signature payloads expose `hasImage` and never expose the internal storage key.

## Freehand storage pipeline

Freehand drawing is treated as user-provided image input:

```text
Canvas drawing
→ transparent PNG Blob
→ File object
→ existing signature upload endpoint
→ existing StorageProvider
→ existing backend MIME/binary validation
```

No separate storage pipeline was introduced.

## AppSec notes

- Export queries use DTO validation and safe Prisma selects.
- Documents export does not select or expose storage keys.
- Export output is capped to prevent large unbounded reports.
- Signature uploads keep the existing MIME, binary and size validation.
- Deleted signatures cannot be assigned through document template configuration.
- Signature download is still mediated by the backend and returns content, not storage paths.

## Validation

Validation commands for this closure:

```bash
DATABASE_URL='postgresql://orbit:orbit@localhost:5432/orbit?schema=public' npx prisma validate
DATABASE_URL='postgresql://orbit:orbit@localhost:5432/orbit?schema=public' npx prisma generate
npm run lint
npm test
npm run build
```

Frontend validation:

```bash
npm run lint
npm run build
```

## Deferred findings

- CSV export remains a current-view convenience export and is intentionally separate from official
  backend PDF export.
- No historical/admin endpoint for deleted signatures was added; this backlog only required normal
  Settings listings to exclude deleted signatures.
