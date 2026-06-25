# Frontend Integration

## Base URL

Desenvolvimento padrão:

```text
http://localhost:3000/api/v1
```

Cada instalação white label fornece sua própria origem. O path permanece `/api/v1`.

## Response model

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};
```

Toda resposta possui header `X-Request-Id`. Guarde esse valor em logs de suporte quando uma chamada
falhar.

## Auth recap

Papéis oficiais:

```ts
export type Role = 'OWNER' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
```

Fluxo preservado:

1. `POST /auth/login`
2. guardar `accessToken`, `refreshToken`, `expiresIn`;
3. chamar `GET /auth/me`;
4. renovar com `POST /auth/refresh` usando estratégia single-flight;
5. limpar sessão em `AUTH_SESSION_REVOKED`, `AUTH_USER_INACTIVE` ou falha de refresh.

Operadores não podem ver telas financeiras nem configurações administrativas. Para a Sprint 2:

- `OWNER`: tela de configurações completa;
- `MANAGER`: tela de configurações em modo leitura;
- `OPERATOR` e `VIEWER`: não mostrar rota/tela de organização.

O backend é a autoridade final. Trate HTTP 403 como bloqueio definitivo.

## Types for organization foundation

```ts
export type BrandAssetType = 'LOGO' | 'HEADER' | 'FOOTER';

export type DocumentTemplateType =
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'PMOC';

export type Organization = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  segment: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSettings = {
  id: string;
  organizationId: string;
  language: string;
  timezone: string;
  currency: string;
  documentPrefix: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentTemplate = {
  id: string;
  organizationId: string;
  type: DocumentTemplateType;
  name: string;
  headerContent: string;
  footerContent: string;
  observations: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandAsset = {
  id: string;
  organizationId: string;
  type: BrandAssetType;
  storageKey: string;
  mimeType: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
};

export type BrandAssetWithContent = BrandAsset & {
  contentBase64: string;
};
```

## Initial app bootstrap for white label

Após autenticação:

1. Chamar `GET /organization`.
2. Aplicar `primaryColor` e `secondaryColor` no tema da aplicação.
3. Chamar `GET /organization/settings` para idioma, timezone, moeda e prefixo documental.
4. Chamar `GET /organization/templates` ao abrir a tela de templates/documentos.
5. Buscar assets salvos individualmente com `GET /organization/assets/:id` quando a UI tiver IDs
   persistidos/listados por uma tela administrativa futura.

Nesta sprint não há endpoint de “asset atual por tipo”. A tela administrativa deve manter os IDs
retornados em upload/listagem futura quando essa UX for definida, ou exibir os uploads recentes na
própria tela após o POST.

## Organization screen

### Read

```ts
const organization = await api.get<ApiSuccess<Organization>>('/organization');
```

### Update

Somente `OWNER`.

```ts
type UpdateOrganizationPayload = Partial<{
  legalName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
}>;
```

```http
PATCH /organization
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Campos extras são rejeitados. Normalize cores em hexadecimal `#RRGGBB`.

## Settings screen

```ts
type UpdateOrganizationSettingsPayload = Partial<{
  language: string; // exemplo: pt-BR
  timezone: string; // exemplo: America/Recife
  currency: string; // exemplo: BRL
  documentPrefix: string; // A-Z, 0-9, _ e -
}>;
```

`MANAGER` pode visualizar; somente `OWNER` pode salvar.

## Templates screen

Use `GET /organization/templates` para carregar todos os templates.

Criar:

```ts
type CreateDocumentTemplatePayload = {
  type: DocumentTemplateType;
  name: string;
  headerContent: string;
  footerContent: string;
  observations: string;
  isDefault?: boolean;
};
```

Atualizar:

```ts
type UpdateDocumentTemplatePayload = Partial<CreateDocumentTemplatePayload>;
```

Excluir:

```http
DELETE /organization/templates/:id
```

Se `isDefault=true`, o backend remove o default anterior do mesmo `type`.

Conteúdo de `headerContent`, `footerContent` e `observations` é texto livre controlado pelo
frontend. Se o frontend permitir HTML, sanitize no cliente antes de renderizar. O backend apenas
valida tamanho e tipo.

## Assets and branding uploads

Endpoint:

```http
POST /organization/assets
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Campos:

- `type`: `LOGO`, `HEADER` ou `FOOTER`;
- `file`: arquivo.

Regras:

- extensões: `png`, `jpg`, `jpeg`, `svg`, `pdf`;
- MIME types: `image/png`, `image/jpeg`, `image/svg+xml`, `application/pdf`;
- tamanho máximo: 5 MiB.

Exemplo:

```ts
async function uploadBrandAsset(type: BrandAssetType, file: File, accessToken: string) {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);

  const response = await fetch(`${API_BASE_URL}/organization/assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Request-Id': crypto.randomUUID(),
    },
    body: form,
  });

  return response.json() as Promise<ApiSuccess<BrandAsset> | ApiError>;
}
```

Não defina manualmente `Content-Type` em `fetch` com `FormData`; o browser define o boundary.

### Reading an asset

```ts
const response = await api.get<ApiSuccess<BrandAssetWithContent>>(
  `/organization/assets/${assetId}`,
);

const dataUrl = `data:${response.data.mimeType};base64,${response.data.contentBase64}`;
```

Para PDF, abra como download/visualização controlada. Para SVG, renderize com cuidado e evite
injetar conteúdo como HTML arbitrário.

## Error handling for organization UI

| Code                       | Frontend behavior                                    |
| -------------------------- | ---------------------------------------------------- |
| `FORBIDDEN`                | Mostrar sem permissão; esconder ação para esse papel |
| `ORGANIZATION_NOT_FOUND`   | Instalação sem seed; acionar suporte/admin           |
| `VALIDATION_ERROR`         | Marcar campos inválidos usando `details.violations`  |
| `UPLOAD_FILE_REQUIRED`     | Solicitar seleção de arquivo                         |
| `UPLOAD_FILE_TOO_LARGE`    | Informar limite de 5 MiB                             |
| `UPLOAD_INVALID_MIME_TYPE` | Informar formatos permitidos                         |
| `UPLOAD_INVALID_EXTENSION` | Informar extensões permitidas                        |
| `STORAGE_FILE_NOT_FOUND`   | Informar asset indisponível e sugerir novo upload    |

## Recommended frontend route behavior

- `/settings/organization`: OWNER edita, MANAGER lê.
- `/settings/templates`: OWNER edita, MANAGER lê.
- `/settings/branding`: OWNER edita, MANAGER lê.
- OPERATOR/VIEWER: redirecionar ou esconder rotas de settings.

Não use regras de UI como segurança. Sempre trate 401/403 vindos do backend.

## Sprint 3: team foundation

### Types

```ts
export type UserTheme = 'SYSTEM' | 'LIGHT' | 'DARK';

export type UserPermissions = {
  canFinancial: boolean;
  canUsers: boolean;
  canReports: boolean;
  canSchedules: boolean;
  canTemplates: boolean;
};

export type UserPreferences = {
  id: string;
  userId: string;
  theme: UserTheme;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TeamUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  avatarAssetId: string | null;
  phone: string | null;
  jobTitle: string | null;
  notes: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  permission: UserPermissions;
  preferences: UserPreferences | null;
};
```

V1 is exclusively `pt-BR`. Do not send or expect `language`, `locale` or i18n fields in user
payloads.

### Session bootstrap

After login:

1. call `GET /users/me`;
2. if `user.mustChangePassword` is `true`, navigate to the mandatory password screen;
3. do not load normal application modules before the password is changed;
4. after `PATCH /users/change-password`, clear both tokens;
5. require a new login because all sessions were revoked.

The backend also enforces this. Normal calls return HTTP 403 with
`PASSWORD_CHANGE_REQUIRED` until the change is complete. `/auth/me`, `/users/me` and
`/users/change-password` remain available for bootstrap.

### Team list

```http
GET /users?page=1&limit=20&search=manager
Authorization: Bearer <accessToken>
```

Expected data:

```ts
type PaginatedUsers = {
  items: TeamUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

Access:

- OWNER: full team screen and actions;
- MANAGER: read-only team screen;
- VIEWER: read-only team screen;
- OPERATOR: do not show the team route.

### User creation

Only OWNER:

```ts
type CreateUserPayload = {
  email: string;
  username: string;
  name: string;
  role: Role;
  phone?: string;
  jobTitle?: string;
  notes?: string;
  permissions?: Partial<UserPermissions>;
};
```

The response contains:

```ts
type CreateUserResult = {
  user: TeamUser;
  temporaryPassword: string;
};
```

Show the temporary password exactly once in a copyable confirmation dialog. Do not put it in
analytics, console logs, persistent frontend state or URLs.

Email and username conflict returns `USER_CONFLICT`.

### Update, status and soft delete

- `PATCH /users/:id`: update profile, role and permission flags;
- `PATCH /users/:id/disable`: disable and revoke sessions;
- `PATCH /users/:id/enable`: reactivate;
- `DELETE /users/:id`: soft delete.

Disabled/deleted users remain in list results. Render status from `isActive` and `disabledAt`.

For `USER_LAST_OWNER`, show that another active OWNER is required first. For
`USER_SELF_ACTION_FORBIDDEN`, prevent self-disable/delete in the UI and still handle the backend
error.

### Password reset

Only OWNER:

```http
PATCH /users/:id/reset-password
```

The response contains a new one-time `temporaryPassword`. Display it using the same protected UX as
creation. The target user's sessions are immediately revoked and their next login is restricted to
the mandatory password flow.

### Own password change

```ts
type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string; // 12 to 128 characters
};
```

On success:

```json
{
  "changed": true,
  "reauthenticationRequired": true
}
```

Clear tokens before redirecting to login. Field errors to handle:

- `PASSWORD_CURRENT_INVALID`;
- `PASSWORD_REUSE_NOT_ALLOWED`;
- `VALIDATION_ERROR`.

### Preferences

Read and update:

```http
GET /users/me/preferences
PATCH /users/me/preferences
```

Payload:

```ts
type UpdatePreferencesPayload = Partial<{
  theme: UserTheme;
  notificationsEnabled: boolean;
}>;
```

`notificationsEnabled` is only a stored preference in this sprint; there is no notification
delivery module yet.

### Avatar

Upload:

```http
POST /users/avatar
Content-Type: multipart/form-data
```

Form field: `file`.

Client validation:

- PNG/JPG/JPEG;
- max 2 MiB.

Do not set `Content-Type` manually when using `FormData`.

Read:

```ts
const response = await api.get<ApiSuccess<UserAvatarWithContent>>(`/users/avatar/${avatarAssetId}`);
const src = `data:${response.data.mimeType};base64,${response.data.contentBase64}`;
```

Delete the current user's avatar with `DELETE /users/avatar`.

### Permission rendering

The `role` remains the coarse access model. `permissions` are complementary feature flags:

- OWNER effective flags are always true;
- MANAGER flags are configured by OWNER;
- OPERATOR and VIEWER administrative flags are false.

Use flags to render future module actions, but always honor 403 from the backend. In Sprint 3, team
endpoint access is determined by the role matrix above.

### Team error handling

| Code                         | UI behavior                            |
| ---------------------------- | -------------------------------------- |
| `PASSWORD_CHANGE_REQUIRED`   | Redirect to mandatory password change  |
| `USER_CONFLICT`              | Mark email/username as already used    |
| `USER_NOT_FOUND`             | Refresh list and show unavailable user |
| `USER_LAST_OWNER`            | Explain last OWNER protection          |
| `USER_SELF_ACTION_FORBIDDEN` | Disable self-destructive action        |
| `UPLOAD_FILE_TOO_LARGE`      | Show 2 MiB avatar limit                |
| `UPLOAD_INVALID_MIME_TYPE`   | Reject invalid/forged image            |
| `UPLOAD_INVALID_EXTENSION`   | Accept only PNG/JPG/JPEG               |
| `AUTH_SESSION_REVOKED`       | Clear tokens and return to login       |

## Health

`GET /health` continua público:

- HTTP 200: aplicação e banco disponíveis;
- HTTP 503: processo disponível, banco indisponível.

## Sprint 3.5 development dataset

The optional demo environment provides real persisted organization, users and preferences plus
temporary integration snapshots for domains that are not modeled yet.

Enable locally:

```env
NODE_ENV=development
ENABLE_DEMO_DATA=true
ENABLE_DEMO_ENDPOINTS=true
```

Run:

```bash
npm run build
npm run prisma:seed:demo
```

Use the passwords printed once by the seed. Existing matching users are preserved and do not receive
new passwords.

Real endpoints ready for frontend:

- auth and refresh flow;
- `/users/me`;
- team CRUD/read according to role;
- preferences and avatar;
- organization/settings/templates/assets.

Temporary local bridge:

- `GET /internal/demo/dataset`: dashboard, schedule and finance snapshots;
- `POST /internal/demo/reset`: OWNER-only dataset reset.

Never include the internal demo bridge in production builds. When disabled, it returns
`DEMO_ENDPOINT_DISABLED` as HTTP 404.

The complete frontend-oriented reference is `docs/backend/OPUS_INTEGRATION.md`. Dataset operation is
documented in `docs/backend/DEMO_DATA.md`.

## Customer Domain

Production endpoints are ready; remove customer mocks and `demo.customers.v1`.

```ts
type CustomerType = 'PERSON' | 'COMPANY';
type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  tradeName: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  notes: string | null;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

List:

```http
GET /customers?page=1&limit=20&search=Hospital
```

Response data has `items` and `pagination`. List items include `_count` for addresses, contacts and
attachments. Detail `GET /customers/:id` includes complete arrays.

OWNER/MANAGER can create and edit. OPERATOR/VIEWER are read-only. Only OWNER can soft-delete.

Create payload uses `type` and `name` as required fields; CPF/CNPJ and all communication fields are
optional. Use `/customers/stats` for dashboard counters.

Addresses and contacts are managed through nested endpoints. When `isPrimary=true`, the backend
automatically clears the previous primary record.

Attachment upload:

```http
POST /customers/:id/attachments
Content-Type: multipart/form-data
```

Fields: `category`, `file`. Formats PDF/PNG/JPG/JPEG, maximum 5 MiB. Read returns `contentBase64`.

Important UX states:

- distinguish PERSON and COMPANY forms;
- mask CPF/CNPJ/CEP/phone without changing backend string values;
- keep inactive customers visible with a status badge;
- debounce search;
- use `CUSTOMER_CONFLICT` for CPF/CNPJ field feedback;
- confirm soft delete and attachment deletion;
- show honest empty states when no customers exist.

## Equipment Domain

Production API is ready. Remove equipment mocks and `demo.equipment.v1`.

```ts
type EquipmentType =
  | 'SPLIT'
  | 'CHILLER'
  | 'CONDENSER'
  | 'EVAPORATOR'
  | 'AIR_HANDLER'
  | 'SOLAR_INVERTER'
  | 'ELECTRICAL_PANEL'
  | 'GENERATOR'
  | 'OTHER';
type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'RETIRED';
```

List:

```http
GET /equipments?page=1&limit=20&search=Samsung&customerId=<uuid>&addressId=<uuid>&status=ACTIVE&type=SPLIT
```

All filters combine with AND. Search is debounced and partial. Items include customer/address and
counts for children, metrics and attachments.

Create/update fields are documented in API_CONTRACTS. `customerId`, `type`, `name` are required on
create. Address and parent selectors must be restricted to the selected customer.

Detail includes:

- customer and address;
- parent summary and direct children;
- attachment metadata;
- latest 20 metrics;
- `qrToken` and `qrCode`.

QR UX: render a client-side visual QR from `qrCode`; do not interpret it as authentication. Image
generation and public scan resolution are not implemented.

Metrics: OWNER/MANAGER/OPERATOR may POST key/value/unit; all roles read. Use complete metric history
endpoint when opening charts.

Attachments: multipart category `PHOTO|MANUAL|WARRANTY|DOCUMENT` plus file. PDF/PNG/JPG/JPEG,
5 MiB. GET returns base64.

Status cards use `/equipments/stats`; `byType` always contains every official type. Inactive records
remain visible after soft delete.

Errors to map: `EQUIPMENT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `EQUIPMENT_ADDRESS_MISMATCH`,
`EQUIPMENT_HIERARCHY_INVALID`, validation and upload codes.
