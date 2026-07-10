# Sprint 22.5 — External Release Candidate Closure

Date: 2026-07-10  
Scope: closure of Sprint 22 external promotion blockers.

## Final verdict

`ORBIT_RELEASE_CANDIDATE_NOT_READY`

The repository-local baseline remains strong, and the Sprint 22.5 supply-chain blocker was closed.
However, the mandatory external evidence package is still absent in this workspace: no external
host, public/representative TLS endpoint, GitHub Actions run, registry artifact traceability,
external rollback drill, external backup/restore, or external HTTPS smoke/workflow evidence was
available to verify.

## Official V1 deployment model

Orbit V1 supports isolated single-company installations only.

Supported:

- Dedicated single-company deployment: one customer, one Orbit deployment, one PostgreSQL database,
  one persistent storage scope, one Organization.
- Shared infrastructure with isolated application instances: one shared server/VPS may run multiple
  isolated Orbit stacks only when each customer has dedicated containers, dedicated database,
  dedicated persistent storage path/scope and dedicated hostname/subdomain.

Unsupported in V1:

- shared application-level multi-tenancy;
- tenant/company discriminator across all tables;
- multiple customer companies inside one application/database instance;
- shared storage namespace between customers.

## Official V1 storage strategy

Official V1 storage provider: persistent local/block storage.

Requirements:

- `STORAGE_PROVIDER=local`;
- `STORAGE_DRIVER=local`;
- `STORAGE_PATH` must be absolute in production;
- `STORAGE_PATH` must point to a mounted persistent volume/path outside the ephemeral container
  writable layer;
- storage must be isolated per installation/customer;
- filesystem ownership must permit only the API runtime user and deployment operators;
- storage backup/restore must be executed together with PostgreSQL backup/restore for documents and
  assets.

Object storage is not certified for V1. The current runtime only implements the local driver.

## Sprint 22 blockers closed

- Supply-chain moderate findings were analyzed and fixed with an npm override for `postcss`.
- Production storage config now rejects relative or temporary `STORAGE_PATH`.
- Official V1 deployment model was documented.
- Official V1 storage strategy was documented.

## Sprint 22 blockers still open

- External staging environment not provided/validated.
- Public or representative TLS termination not validated.
- GitHub Actions workflow not externally executed.
- Registry/image traceability to CI not established.
- External rollback drill not executed.
- External proxy/forwarded-header/rate-limit behavior not validated.
- External PostgreSQL backup/restore not executed.
- External storage backup/restore not executed.
- External bootstrap/forced-password-change not executed.
- External frontend smoke and critical workflow not executed over HTTPS.

## Supply-chain closure

Audit before fix:

- `postcss`, severity moderate, transitive through `next`, vulnerable range `<8.5.10`,
  advisory `GHSA-qx2v-qp2m-jg93`;
- `next`, severity moderate, direct package affected by bundled vulnerable `postcss`.

Decision:

- fixed through a targeted npm override: `postcss@8.5.16`;
- no Next major upgrade was performed;
- `npm audit --json` now reports 0 vulnerabilities.

Validation after fix:

- `npm install`: passed, 0 vulnerabilities;
- `npm audit --json`: passed, 0 vulnerabilities;
- `npm run lint`: passed with two existing warnings;
- `npm run build`: passed.

## Findings

- `RC1-EXT-001`: external environment unavailable. Status: open.
- `RC1-CI-001`: CI workflow exists but no external run evidence is available. Status: open.
- `RC1-TLS-001`: TLS/proxy evidence absent. Status: open.
- `RC1-ROLLBACK-001`: external rollback drill not executed. Status: open.
- `RC1-BACKUP-001`: external DB+storage restore not executed. Status: open.
- `RC1-BOOTSTRAP-001`: external bootstrap flow not executed. Status: open.
- `RC2-SUPPLY-001`: frontend moderate dependency findings. Status: fixed.
- `RC2-STORAGE-CONFIG-001`: production could use relative/temporary local storage path. Status:
  fixed by configuration validation.

## Evidence gap statement

No external production-like host was discoverable from repository configuration or release docs, and
the GitHub CLI was not installed/authenticated in the workspace. The only available validation
surface remains local/containerized.
