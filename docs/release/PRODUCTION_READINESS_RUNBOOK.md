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
- `/api/v1/health/metrics` must expose operational metrics without sensitive data.
- No secrets may be emitted in logs.

## RC classification

- `RC0`: blocks release candidate certification.
- `RC1`: blocks production promotion until remediated.
- `RC2`: safe to ship only with explicit operational acceptance.
- `RC3`: polish/documentation follow-up.
