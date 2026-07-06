# Orbit Sprint 21 performance baseline

This folder contains repository-local performance tooling for Orbit V1.

The scripts are intentionally lightweight and do not run as part of `npm test`.

## Safety

Never run these scripts against production.

Required database safety rules:

- `DATABASE_URL` database name must end with `_test` or `_perf`.
- destructive reset requires `ORBIT_PERF_RESET=true`.

Required API safety rules:

- `ORBIT_PERF_BASE_URL` must point to local/staging only.
- production-looking hosts are rejected unless `ORBIT_PERF_ALLOW_PRODUCTION=true`.

## Fixture generation

```bash
DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_perf?schema=public' \
ORBIT_PERF_RESET=true \
ORBIT_PERF_SCALE=local \
node test/performance/scripts/seed-performance-data.mjs
```

Scales:

- `tiny`: quick laptop smoke baseline.
- `local`: representative local baseline.
- `staging`: larger profile for dedicated hardware.

The fixture is deterministic enough for repeatable local baselines and creates only performance
test data. It is not Demo Data and is not used by production.

Default login credentials emitted by the fixture:

- OWNER: `perf.owner@orbit.local`
- MANAGER: `perf.manager@orbit.local`
- OPERATOR: `perf.operator@orbit.local`
- password: value of `ORBIT_PERF_PASSWORD`, default `PerfPassword!2026`

## Load scenarios

Start the API against the same database, then run:

```bash
ORBIT_PERF_BASE_URL='http://127.0.0.1:3101/api/v1' \
ORBIT_PERF_EMAIL='perf.owner@orbit.local' \
ORBIT_PERF_PASSWORD='PerfPassword!2026' \
ORBIT_PERF_SCENARIO='dashboard' \
ORBIT_PERF_VUS=3 \
ORBIT_PERF_DURATION_SECONDS=20 \
node test/performance/scripts/run-performance-scenarios.mjs
```

Scenarios:

- `dashboard`
- `operations-dispatch`
- `inventory-consumption`
- `procurement-receipt`
- `financial-settlement`
- `budget-lifecycle`
- `document-engine`
- `operator-read`
- `all`

## Reading results

The runner prints one JSON summary per scenario:

- request count;
- p50/p95/p99;
- error rate;
- slowest endpoint;
- fan-out per iteration when applicable.

Compare results to the budgets documented in `docs/backend/STATE.md`.

## Sprint 21 local baseline

Environment:

- database: local PostgreSQL test database ending in `_test`;
- fixture scale: `tiny`;
- API: local NestJS;
- VUs: 2;
- duration: 8 seconds per scenario.

Results captured on 2026-07-06:

| Scenario | Requests | p95 | Error rate |
|---|---:|---:|---:|
| `dashboard` | 1564 | 181.06 ms | 0 |
| `operations-dispatch` | 332 | 36.62 ms | 0 |
| `inventory-consumption` | 396 | 58.39 ms | 0 |
| `procurement-receipt` | 360 | 117.54 ms | 0 |
| `financial-settlement` | 450 | 45.32 ms | 0 |
| `budget-lifecycle` | 402 | 31.30 ms | 0 |
| `document-engine` | 300 | 104.04 ms | 0 |
| `operator-read` | 420 | 28.31 ms | 0 |

PostgreSQL inspection after the run:

- active connections: 2;
- idle connections: 13;
- ungranted locks: 0;
- deadlocks: 0.

Query profile output file from the baseline run:

```text
/private/tmp/orbit-performance/query-profiles-1783341798164.json
```
