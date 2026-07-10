# Sprint 22 — Production Readiness, Release Candidate Certification & Operational Hardening

Date: 2026-07-06  
Scope: Orbit V1 Release Candidate readiness gate.

## Verdict

`ORBIT_RELEASE_CANDIDATE_NOT_READY`

Reason: repository-local release hardening passed, but no real staging/production environment,
public TLS endpoint, cloud storage/IAM evidence or external CI run evidence was available in this
workspace. The codebase is materially closer to RC readiness, but production promotion still needs
external operational evidence.

## Evidence executed

- Backend build: passed.
- Backend lint: passed.
- Prisma validate: passed with explicit `DATABASE_URL`.
- Clean migration deploy: 23 migrations applied to `orbit_rc_test`.
- Unit/regression tests: 10 suites / 27 tests passed.
- AppSec tests: 12 suites / 38 tests passed.
- Concurrency tests: 2 suites / 24 tests passed.
- Integration tests: 2 suites / 7 tests passed.
- Frontend build: passed.
- Frontend lint: passed.
- Backend Docker image build: passed (`orbit-api:rc-sprint22`).
- Frontend Docker image build: passed (`orbit-frontend:rc-sprint22`).
- Release frontend smoke: passed.
- Critical workflow runner: passed end-to-end.
- Performance HTTP scenario: dashboard, 2 VUs, 10s, 2380 requests, p95 108.3ms, errorRate 0.
- Query profile: all critical query profiles returned sub-millisecond planning/execution samples in
  local RC data scale.
- Backup/restore: `pg_dump -Fc` and `pg_restore` inside the Postgres container passed; restored
  database had no pending migrations.
- Fresh install: fresh database migration + initial seed passed with demo disabled.
- Configuration checks: production rejects placeholder JWT secrets and wildcard CORS.

## Findings

- `RC1-CI-001`: CI workflow was absent. Fixed by adding `.github/workflows/release-candidate.yml`.
- `RC1-CONFIG-001`: frontend demo bridge defaulted to enabled. Fixed by making demo opt-in.
- `RC1-CONFIG-002`: production backend accepted placeholder/example secrets. Fixed in env validation.
- `RC2-NET-001`: no representative reverse proxy topology existed. Fixed by adding
  `docker-compose.rc.yml` and `deploy/nginx/orbit.conf`; real TLS remains external evidence.
- `RC2-RUNBOOK-001`: release/rollback/backup runbook was absent. Fixed by adding
  `docs/release/PRODUCTION_READINESS_RUNBOOK.md`.
- `RC2-MIGRATION-001`: `.DS_Store` existed inside `backend/prisma/migrations` and contaminated the
  migration directory. Removed.
- `RC3-DOC-001`: release smoke initially assumed `/health/metrics`; real route is `/metrics`.
  Scripts and docs were corrected.
- `RC3-FRONTEND-001`: package `next start` warns when used with standalone output. Dockerfile uses
  standalone server directly; local smoke still passed.

## Residual risks

- No real staging URL or production URL was provided.
- TLS certificate, HSTS and public reverse proxy behavior were not verified against a real domain.
- Local storage provider was verified only with persistent Docker volume/local path semantics.
- CI workflow was created and syntax-rendered by inspection, but not executed by GitHub Actions in
  this workspace.
- Local `.env` files exist and are gitignored; release must inject secrets from the deployment
  platform, not from committed files.
- Frontend container dependency install reported two moderate `npm audit` findings. They were not
  remediated in this sprint to avoid out-of-scope dependency upgrades and require owner acceptance
  before promotion.

## Sprint 22.5 addendum

Sprint 22.5 closed the supply-chain finding through a targeted `postcss@8.5.16` override and
documented the official V1 deployment/storage model.

The final Release Candidate verdict remains:

`ORBIT_RELEASE_CANDIDATE_NOT_READY`

Reason: mandatory external evidence is still absent: external environment, TLS/proxy validation,
external CI run, image traceability, external rollback, external backup/restore, external storage
restore and external HTTPS smoke/workflows.

## Sprint 22.6–22.8 external closure addendum

The external production-like installation at `erp.allblue-labs.com` was inspected and partially
corrected on 2026-07-10. Evidence is recorded in
`docs/release/SPRINT_22_6_22_8_EXTERNAL_PRODUCTION_CLOSURE.md`.

External closure improved the runtime posture:

- production mode enabled;
- demo data/endpoints disabled;
- PostgreSQL/API/frontend Docker ports restricted to `127.0.0.1`;
- PostgreSQL backup created and restore-tested in an isolated database;
- storage backup created and restore-tested in an isolated path;
- restart persistence validated;
- HTTPS health and login smoke validated.

The final Release Candidate verdict remains:

`ORBIT_RELEASE_CANDIDATE_NOT_READY`

Remaining blockers: no CI evidence for the deployed commit, no immutable registry artifact
traceability, public `/api/v1/metrics` exposure, no production-safe authenticated workflow
certification user, no certified rollback drill and an uncommitted remote infrastructure hotfix
that must be brought back into versioned IaC.
