# Demo Data

## Purpose

The optional demo dataset supports frontend integration, UX validation and commercial
demonstrations. The application does not depend on it and operates normally with both demo flags
disabled.

It uses existing production entities for organization, users, preferences and customers.
Dashboard, schedule and finance snapshots remain under reserved `SystemSetting` keys.

No migration or new database entity is required.

## Enable

Development only:

```env
NODE_ENV=development
ENABLE_DEMO_DATA=true
ENABLE_DEMO_ENDPOINTS=false
```

To also expose internal read/reset endpoints:

```env
ENABLE_DEMO_ENDPOINTS=true
```

Production must always use:

```env
ENABLE_DEMO_DATA=false
ENABLE_DEMO_ENDPOINTS=false
```

Application startup rejects production configuration when either flag is true.

## Run

After migrations:

```bash
npm run build
npm run prisma:seed:demo
```

The regular seed also invokes the demo seed when `ENABLE_DEMO_DATA=true`:

```bash
npm run prisma:seed
```

Passwords are randomly generated and printed only during the first seed execution that creates each
demo user. Store them immediately. Rerunning an idempotent seed does not reset or reprint passwords.

## Dataset

Organization on an empty or untouched bootstrap installation:

- Climatize Refrigeração
- segment `HVAC`

Users:

- `ninja` — OWNER
- `ricardo` — MANAGER
- `joao` — OPERATOR
- `maria` — OPERATOR
- `financeiro` — VIEWER

Existing users with matching username or email are preserved. Their password and profile are never
overwritten.

Reserved snapshot keys:

- `demo.dashboard.v1`
- `demo.schedule.v1`
- `demo.finance.v1`
- `demo.orders.v1` — work-order snapshot for the commercial demo (no Work Order domain yet)
- `demo.products.v1` — product/stock snapshot for the commercial demo (no Product domain yet)
- `demo.manifest.v1` — internal ownership manifest, never returned by the dataset endpoint

> The dataset endpoint returns every `demo.*` setting dynamically (except the manifest), so new
> snapshot keys are served automatically once seeded. They are registered in `DEMO_SETTING_KEYS` so
> reset cleans them up. Snapshots were enriched with realistic Climatize data (week-long agenda,
> richer finance, ordens de serviço e produtos) for the commercial demonstration.

## Read from frontend

When internal demo endpoints are enabled, authenticated OWNER:

```http
GET /api/v1/internal/demo/dataset
```

The result contains three remaining integration snapshots. This is a temporary demo contract, not the final
operational domain API.

Customers are no longer part of this internal snapshot. Consume the production `/api/v1/customers`
API. The seed creates four real customers, each with a primary address, primary contact and PDF
attachment. Reset tracks and removes only demo-owned customers through the manifest.

Equipment is also real. Consume `/api/v1/equipments`. The seed creates five realistic assets linked
to real customers/addresses, with metrics, manuals and one parent/child relationship. Reset tracks
demo-owned equipment and storage files. No `demo.equipment.v1` snapshot remains.

## Reset

Authenticated OWNER, development only:

```http
POST /api/v1/internal/demo/reset
```

Reset:

1. reads `demo.manifest.v1`;
2. deletes only users previously created by the demo seed and still carrying the demo marker;
3. removes only reserved `demo.*` settings;
4. recreates the demo dataset;
5. logs newly generated passwords only in the seed execution log.

Real users and non-demo settings are never deleted.

## Disable and clean

To disable without deleting data:

```env
ENABLE_DEMO_DATA=false
ENABLE_DEMO_ENDPOINTS=false
```

The application continues normally and internal endpoints return 404.

To clean demo-owned records, enable both flags temporarily in development, call the reset endpoint
only if a refreshed dataset is wanted, or remove the reserved `demo.*` settings and manifest-owned
users through a controlled development database reset. Production cleanup must never use demo
tools.

For a fully disposable local Compose environment, the safest complete cleanup is:

```bash
docker compose down -v
```

This removes the entire local PostgreSQL and storage volumes, including non-demo development data.
Do not use it against an environment whose data must be preserved.
