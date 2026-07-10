# Orbit V1 Production Readiness Runbook

This runbook is the operational gate for a Release Candidate. It does not replace a real
staging environment, TLS termination, cloud IAM or managed backup evidence.

## Required evidence before promoting a release

1. Backend clean install:
   - `npm ci`
   - `npx prisma validate`
   - `npx prisma migrate deploy`
   - `npm run build`
   - `npm run lint`
   - `npm test`
   - `npm run test:security`
   - `npm run test:concurrency`
   - `npm run test:integration`
2. Frontend production build:
   - `NEXT_PUBLIC_API_BASE_URL=/api/v1 NEXT_PUBLIC_ENABLE_DEMO=false npm run build`
   - `npm run lint`
3. Representative runtime:
   - API health: `GET /api/v1/health`
   - API readiness: `GET /api/v1/health/ready`
   - Metrics: `GET /api/v1/health/metrics`
4. Release smoke:
   - `ORBIT_RELEASE_API_URL=... ORBIT_RELEASE_FRONTEND_URL=... ORBIT_RELEASE_OWNER_EMAIL=... ORBIT_RELEASE_OWNER_PASSWORD=... npm run release:smoke:frontend`
5. Critical workflows:
   - `ORBIT_RELEASE_API_URL=... ORBIT_RELEASE_OWNER_EMAIL=... ORBIT_RELEASE_OWNER_PASSWORD=... npm run release:workflows`

## Configuration contract

Production must set:

- `NODE_ENV=production`
- `ENABLE_DEMO_DATA=false`
- `ENABLE_DEMO_ENDPOINTS=false`
- non-placeholder `JWT_SECRET`
- non-placeholder `JWT_REFRESH_SECRET`
- explicit `CORS_ORIGINS`
- persistent `STORAGE_PATH` when `STORAGE_DRIVER=local`
- `NEXT_PUBLIC_ENABLE_DEMO=false`

The frontend can use `NEXT_PUBLIC_API_BASE_URL=/api/v1` when a reverse proxy serves both
the frontend and API from the same origin.

## Official V1 deployment model

Orbit V1 is a single-company product. Each installation must represent exactly one customer company
and one Organization.

Supported models:

- dedicated single-company installation: one customer, one Orbit deployment, one PostgreSQL
  database, one persistent storage scope;
- shared infrastructure with isolated application instances: multiple customers may share a
  server/VPS only when each customer has dedicated containers, dedicated database, dedicated
  persistent storage path/scope and dedicated hostname/subdomain.

Unsupported in V1:

- shared application-level multi-tenancy;
- tenant/company discriminator across all business tables;
- multiple customer companies in one application/database instance;
- shared storage namespace between customers.

## Official V1 storage strategy

Orbit V1 certifies persistent local/block storage as the official storage strategy.

Requirements:

- `STORAGE_PROVIDER=local`;
- `STORAGE_DRIVER=local`;
- `STORAGE_PATH` absolute in production;
- `STORAGE_PATH` mounted as persistent host/block volume, not container writable layer;
- one isolated storage path/scope per installation/customer;
- storage ownership restricted to the API runtime user and operators;
- storage backup/restore paired with PostgreSQL backup/restore.

Object storage is not certified for V1. Do not configure S3-compatible storage until an actual
provider, credentials, IAM policy, read/write/delete behavior, missing-object behavior and
backup/retention policy have been tested.

## Deployment checklist

1. Freeze deploy window and announce rollback owner.
2. Confirm database backup completed and restore tested.
3. Apply migrations with `prisma migrate deploy`.
4. Start API and wait for `/health/ready`.
5. Start frontend with `NEXT_PUBLIC_ENABLE_DEMO=false`.
6. Validate auth, health, metrics and critical workflows.
7. Monitor structured logs for request failures and exception spikes.

## Rollback checklist

1. Stop new deploy rollout.
2. Keep database unchanged unless the rollback plan explicitly includes a tested restore.
3. Repoint runtime to previous image/configuration.
4. Restart API and frontend.
5. Validate `/health/ready`, login and one read-only domain listing.
6. Record rollback reason and residual data compatibility risks.

## Backup and restore checklist

1. Create backup with `pg_dump -Fc`.
2. Restore into a fresh database with `pg_restore --clean --if-exists`.
3. Run `prisma migrate deploy` against restored database.
4. Start API against restored database.
5. Validate health, auth and representative domain reads.

## Observability checklist

- Logs must be structured JSON.
- Every request must include or receive an `X-Request-Id`.
- `/api/v1/metrics` must expose operational metrics without sensitive data and must be restricted
  to an approved internal/private observability path before production release.
- No secrets may be emitted in logs.

## External closure note — 2026-07-10

The external closure in `docs/release/SPRINT_22_6_22_8_EXTERNAL_PRODUCTION_CLOSURE.md` verified
backup/restore, restart persistence and HTTPS health on `erp.allblue-labs.com`, but did not certify
the V1 release candidate. Remaining blockers are CI evidence, immutable artifact traceability,
protected metrics, authenticated critical workflow smoke and rollback drill.

## RC classification

- `RC0`: blocks release candidate certification.
- `RC1`: blocks production promotion until remediated.
- `RC2`: safe to ship only with explicit operational acceptance.
- `RC3`: polish/documentation follow-up.
