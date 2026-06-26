# OPUS Frontend Integration

## Connection

Default development base URL:

```text
http://localhost:3000/api/v1
```

All responses use:

```ts
type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  error: { code: string; message: string; details: Record<string, unknown> };
};
```

Send `Authorization: Bearer <accessToken>` on protected calls. Capture `X-Request-Id` for support
logs.

## Authentication flow

1. `POST /auth/login`
2. persist access/refresh tokens securely;
3. `GET /users/me` for user, organization, permissions and preferences;
4. if `mustChangePassword=true`, show only the password-change screen;
5. use single-flight `POST /auth/refresh`;
6. clear tokens on refresh failure, `AUTH_SESSION_REVOKED` or `AUTH_USER_INACTIVE`.

Login payload:

```json
{
  "email": "ricardo@climatize.com",
  "password": "<password printed by demo seed>"
}
```

## Endpoints ready for real integration

| Area         | Endpoints                                                             |
| ------------ | --------------------------------------------------------------------- |
| Auth         | login, refresh, logout, auth/me                                       |
| Profile      | users/me, change-password, preferences                                |
| Team         | users list/detail/create/update/disable/enable/delete/reset-password  |
| Avatar       | users/avatar upload/read/delete                                       |
| Organization | organization, settings, templates, branding assets                    |
| Health       | health                                                                |
| Customers    | customers CRUD/stats, addresses, contacts and attachments             |
| Demo bridge  | internal/demo/dataset and internal/demo/reset when explicitly enabled |

Full production contracts remain in `API_CONTRACTS.md`.

## App bootstrap state

Use `GET /users/me`.

Important fields:

- `user.mustChangePassword`: hard navigation gate;
- `user.avatarAssetId`: optional;
- `role`: coarse navigation access;
- `permissions`: complementary feature flags;
- `preferences.theme`: `SYSTEM`, `LIGHT`, `DARK`;
- `organization.primaryColor` and `secondaryColor`: theme;
- `organization.segment`: currently `HVAC` in the demo dataset.

Optional fields:

- avatarAssetId;
- phone;
- jobTitle;
- organization.segment.

## Team pagination

```http
GET /users?page=1&limit=20&search=ricardo
```

Response data:

```ts
type UserPage = {
  items: TeamUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

Search covers name, email, username, phone and job title. Disabled users remain visible and have
`isActive=false`.

## Demo integration bridge

Enable only in local development:

```env
ENABLE_DEMO_DATA=true
ENABLE_DEMO_ENDPOINTS=true
```

Authenticated OWNER:

```http
GET /internal/demo/dataset
```

Response data shape:

```ts
type DemoDataset = {
  'demo.dashboard.v1': {
    generatedAt: string;
    counters: {
      atendimentosHoje: number;
      ordensPendentes: number;
      operadoresAtivos: number;
      servicosEmAndamento: number;
    };
  };
  'demo.schedule.v1': {
    generatedAt: string;
    items: Array<{
      id: string;
      title: string;
      customer: string;
      operator: string;
      startsAt: string;
      state: 'OVERDUE' | 'IN_PROGRESS' | 'SCHEDULED';
    }>;
  };
  'demo.finance.v1': {
    generatedAt: string;
    currency: 'BRL';
    summary: {
      entradas: number;
      saidas: number;
      despesas: number;
      projecao30Dias: number;
    };
    entries: Array<{
      id: string;
      kind: 'ENTRY' | 'EXPENSE';
      description: string;
      amount: number;
    }>;
  };
  // Commercial-demo snapshots (no production domain yet):
  'demo.orders.v1': {
    generatedAt: string;
    items: Array<{
      id: string;
      number: string;
      title: string;
      customer: string;
      type: 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'PROJETO';
      operator: string;
      value: number;
      scheduledFor: string;
      status: 'OVERDUE' | 'IN_PROGRESS' | 'SCHEDULED' | 'DONE';
    }>;
  };
  'demo.products.v1': {
    generatedAt: string;
    items: Array<{
      id: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      stock: number;
      minStock: number;
      price: number;
      status: 'ok' | 'low' | 'out';
    }>;
  };
};
```

Amounts are BRL decimal values, not cents. Dates are ISO 8601. The dataset endpoint returns every
`demo.*` snapshot dynamically; `demo.orders.v1` and `demo.products.v1` feed the commercial demo
screens (Ordens de Serviço e Produtos) until their production domains exist.

## UX states

- Loading: use skeletons, especially for dashboard and lists.
- Empty team: valid state when demo data is disabled.
- Disabled user: retain in list with status badge.
- Mandatory password: block normal shell and navigation.
- 401: attempt one refresh; on failure go to login.
- 403: show permission state, never silently retry.
- 404 `DEMO_ENDPOINT_DISABLED`: hide demo controls and keep production behavior.
- 409 `USER_CONFLICT`: field-level email/username feedback.
- 409 `USER_LAST_OWNER`: explain protected last OWNER.
- Upload errors: show 2 MiB avatar or 5 MiB branding limits.

## Mocks that can be removed now

- authentication/session mocks;
- current-user/profile mocks;
- organization and branding mocks;
- team list/detail/preferences mocks;
- avatar mocks;
- customer list/detail/form mocks: use the production `/customers` API;
- equipment list/detail/cards/metrics mocks: use production `/equipments`;
- local dashboard/schedule/finance fixtures when the demo bridge is enabled.

Do not ship calls to `/internal/demo/*` in a production build. Keep the bridge behind frontend
development configuration.

## Mocks that must return later

When demo endpoints are disabled and before remaining operational modules exist, dashboard,
schedule and finance have no production API. The frontend should render honest empty/coming-soon
states rather than treating demo snapshots as permanent contracts.

## Next expected production endpoints

Customer and Equipment domains are now available. Future contracts:

- service/work-order lifecycle;
- schedule endpoints;
- dashboard aggregations;
- finance only under OWNER authorization.

Do not infer final payloads from demo snapshot IDs or states.

## Customer screens

### List

`GET /customers?page=1&limit=20&search=`. Debounce search by 250–400 ms. Search covers name,
tradeName, phones, email, CPF and CNPJ. Pagination is server-side.

Each row should show:

- name/tradeName;
- PERSON/COMPANY badge;
- CPF or CNPJ when present;
- phone/email fallback;
- active/inactive status;
- `_count` values where useful.

OWNER and MANAGER see “New customer” and edit actions. OPERATOR/VIEWER receive read-only UI.

### Registration form

Required: `type`, `name`.

Optional: tradeName, cpf, cnpj, email, phone, secondaryPhone, notes. Show CPF for PERSON and CNPJ +
tradeName for COMPANY, but do not make documents mandatory.

POST `/customers`; PATCH `/customers/:id`. Handle `CUSTOMER_CONFLICT` on CPF/CNPJ.

### Detail

`GET /customers/:id` returns customer, addresses, contacts and attachment metadata. Use tabs or
sections:

1. Overview;
2. Addresses;
3. Contacts;
4. Attachments.

Nested mutations:

- POST/PATCH/DELETE `/customers/:id/addresses[/addressId]`;
- POST/PATCH/DELETE `/customers/:id/contacts[/contactId]`.

Only one primary address/contact is retained by the backend.

### Status and delete

- PATCH `/customers/:id/disable`;
- PATCH `/customers/:id/enable`;
- DELETE `/customers/:id` — OWNER only, soft delete.

Do not remove a soft-deleted row from state automatically; refresh it and display inactive status.

### Attachments

Upload multipart `category` + `file` at `/customers/:id/attachments`. Maximum 5 MiB; PDF, PNG, JPG,
JPEG. Read `/customers/attachments/:attachmentId`, then build a data URL from MIME +
`contentBase64`. OWNER deletes; all roles may read.

### Stats

`GET /customers/stats` returns `total`, `active`, `inactive`, `people`, `companies`.

### Demo

The demo seed creates Hospital Santa Clara, Condomínio Atlântico Sul, Shopping Recife and Colégio
Boa Viagem in real Customer tables. Consume `/customers`; no customer demo snapshot remains.

## Equipment screens

### List and cards

Use `GET /equipments` with server pagination, debounced search and optional customer/address/status/type
filters. Cards should show name, type, status, customer, address, tag, manufacturer/model and child/
attachment/metric counts.

Permissions: OWNER/MANAGER show create/edit/status controls; OPERATOR/VIEWER are read-only.

### Form

Required: customerId, type, name. Optional: addressId, parentEquipmentId, status, tag, manufacturer,
model, serialNumber, capacity, voltage, installation/warranty dates and observations.

After customer selection, load Customer detail and restrict address options to its addresses.
Parent options must come from Equipment list filtered by the same customer and must exclude the
current equipment.

### Hierarchy

Only direct parent and direct children exist. Do not build drag-and-drop trees or arbitrary depth
editing. Detail response contains `parent` and `children`.

### Status and stats

Statuses: ACTIVE, MAINTENANCE, INACTIVE, RETIRED. Use `/equipments/stats` for cards and `byType`.
Disable/soft delete keeps records visible; enable returns status to ACTIVE.

### Metrics

POST `{ key, value, unit, recordedAt? }` to `/equipments/:id/metrics`. OPERATOR is allowed to create.
GET returns newest first. OWNER/MANAGER may delete. Suggested UX: compact latest readings in detail
and a chronological chart/table.

### Attachments

Categories: PHOTO, MANUAL, WARRANTY, DOCUMENT. Upload multipart; read base64; OWNER/MANAGER delete.

### QR foundation

Display or generate a visual QR from `qrCode`. Store no QR image. `qrToken` and `qrCode` are stable
identifiers, not access credentials. A scan-resolution endpoint is future scope.

### Demo

Real `/equipments` returns Samsung split, LG VRF condenser/evaporator, Trane chiller and Fronius
inverter linked to demo customers and addresses. Each includes a metric and manual. Remove the
equipment demo snapshot/mock.
