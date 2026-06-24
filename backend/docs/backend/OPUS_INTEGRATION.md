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
  "email": "ricardo@climatizenordeste.example",
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
  'demo.equipment.v1': {
    generatedAt: string;
    items: Array<{
      id: string;
      name: string;
      manufacturer: string;
      customerId: string;
      state: string;
    }>;
  };
};
```

Amounts are BRL decimal values, not cents. Dates are ISO 8601.

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
- local dashboard/schedule/finance/equipment fixtures when the demo bridge is enabled.

Do not ship calls to `/internal/demo/*` in a production build. Keep the bridge behind frontend
development configuration.

## Mocks that must return later

When demo endpoints are disabled and before remaining operational modules exist, dashboard,
schedule, finance and equipment have no production API. The frontend should render honest empty/coming-soon
states rather than treating demo snapshots as permanent contracts.

## Next expected production endpoints

Customer Domain is now available. Future contracts:

- equipment CRUD linked to customer;
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
