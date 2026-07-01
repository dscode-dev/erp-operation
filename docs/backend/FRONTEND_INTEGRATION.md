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

export type SignatureMode = 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';

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
  isActive: boolean;
  requiresSignature: boolean;
  signatureMode: SignatureMode;
  signatureId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Signature = {
  id: string;
  name: string;
  title: string;
  imageStorageKey: string | null;
  mimeType: string | null;
  originalFileName: string | null;
  fileSize: number | null;
  active: boolean;
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
  isActive?: boolean;
  requiresSignature?: boolean;
  signatureMode?: SignatureMode;
  signatureId?: string | null;
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

Assinatura por template:

- `signatureMode='NONE'`: sem assinatura; envie `requiresSignature=false` e `signatureId=null`;
- `FIXED`: usa uma assinatura cadastrada; exige `signatureId`;
- `COLLECTED`: indica assinatura coletada no futuro; não usa `signatureId`;
- `HYBRID`: aceita assinatura cadastrada e futura coleta; exige `signatureId`.

Conteúdo de `headerContent`, `footerContent` e `observations` é texto livre controlado pelo
frontend. Se o frontend permitir HTML, sanitize no cliente antes de renderizar. O backend apenas
valida tamanho e tipo.

## Document configuration and signatures

Sprint 7 adiciona configuração documental. Não há mudança no fluxo de render/download ainda; o
builder continuará usando o placeholder de assinatura até sprint posterior.

Endpoints para tela de configuração:

```http
GET /documents/configuration
GET /documents/configuration/types/:type
GET /documents/configuration/templates/:templateId
```

Use esses endpoints para exibir organização, settings, template default, templates ativos e a
assinatura associada. `OPERATOR` recebe 403.

CRUD de assinaturas:

```http
GET    /signatures?page=1&limit=20&search=&active=true
GET    /signatures/:id
POST   /signatures
PATCH  /signatures/:id
DELETE /signatures/:id
POST   /signatures/:id/upload
GET    /signatures/:id/download
```

Permissões de UX:

- `OWNER`: mostrar criação/edição/upload/exclusão;
- `MANAGER` e `VIEWER`: mostrar leitura/download;
- `OPERATOR`: ocultar tela/ações.

Upload de assinatura:

```ts
const form = new FormData();
form.append('file', file); // png, jpg ou jpeg; máximo 2 MiB
await api.post(`/signatures/${id}/upload`, form);
```

Download retorna `contentBase64`; crie um `Blob` com `mimeType` para preview. Erros importantes:
`SIGNATURE_IMAGE_REQUIRED`, `UPLOAD_INVALID_MIME_TYPE`, `UPLOAD_INVALID_EXTENSION`,
`UPLOAD_FILE_TOO_LARGE`.

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

## Agenda (calendário mensal)

A Agenda da Platform é um calendário mensal de produção. Cada navegação
(mês anterior/próximo, seleção de mês/ano, "Hoje") consulta o backend para o
intervalo visível da grade (`getScheduleRange(from, to)`), hoje sobre o snapshot
`demo.schedule.v1` (enriquecido com `equipment`, `serviceType`, `endsAt`,
`notes` e estado `DONE`). Eventos são clicáveis e abrem um Drawer lateral com
cliente, equipamento, operador, tipo, data/horário, status e observações; ações
de edição/reagendamento são gated por RBAC e pertencem ao domínio futuro de
Agenda. Quando `GET /schedule?from=&to=` existir, troca-se apenas a
implementação de `getScheduleRange` — a UI permanece igual.

## QR Code operacional

O QR é o identificador oficial do equipamento. No fluxo do Operador
(Novo Atendimento → Buscar Equipamento) há o botão "Escanear QR Code" que abre
a câmera real (PWA, `@zxing/browser` — apenas QR), lê o código e chama
`GET /equipments/lookup/:qrCode`. O equipamento retornado é pré-selecionado no
wizard (mostrando nome, cliente, endereço, patrimônio, série, status e foto)
e o fluxo avança sem nova busca. A página `/operator/qr` usa o mesmo scanner +
lookup. Tratamentos: permissão negada, câmera indisponível, QR inválido (400),
equipamento inexistente (404). O formato do QR não muda.

## Relatórios (modelos) × Documentos (central)

Responsabilidades separadas:

- **Relatórios** (`/reports`): gestão de **modelos** de documento. Consome `GET /organization/templates`; OWNER cria/edita/exclui (`POST/PATCH/DELETE /organization/templates/:id`), define padrão (`isDefault`), ativa/desativa (`isActive`) e importa modelo do cliente (`POST /organization/assets`). Modelos profissionais (OS, Relatório Técnico, Visita Técnica, PMOC, Laudo, Orçamento, Recibo) compartilham identidade/cabeçalho/rodapé/tipografia e são pré-visualizados no `DocumentPaper` (preparado para a renderização dinâmica do backend).
- **Documentos** (`/documentos`): **central** de documentos emitidos. Mescla os documentos reais gerados por Operations (`GET /operations` → `documents[]`, incluindo a OS rascunho) com o snapshot `demo.documents.v1`, com filtros cumulativos (cliente, equipamento, operador, tipo, status, período). A Sprint 6 adiciona preview oficial via Blueprint e render/download PDF pelo backend.

## Operations (atendimentos)

Domínio operacional central. O **Operator** finaliza o wizard chamando
`POST /operations` (cliente, endereço, equipamento, tipo, checklist, observações,
fotos como data URL, assinatura) — o backend cria a Operation e gera a **OS em
rascunho** automaticamente; a tela de sucesso mostra `OS #000001 criada`.

A **Platform** lista em `/operacoes` (`GET /operations`) e abre um drawer com
Timeline + Checklist + Fotos (`GET /operations/photos/:id`) + Observações +
Assinatura + Documentos relacionados (preview via `DocumentPaper`). O histórico de
cada equipamento/cliente é derivado de `GET /operations?equipmentId=` /
`?customerId=` (sem duplicação de dados). API no frontend: `operationApi`
(`@erp/api`) — distinto do `operationsApi` (snapshots de demo).

## Document Engine (produção)

A Sprint 6 expõe o motor oficial de documentos. O frontend não deve montar PDF no cliente para
documentos oficiais; use o backend.

Fluxo recomendado na central de documentos:

1. Listar operações com `GET /operations` e usar `documents[]` para descobrir `documentId`, `type`,
   `number` e `status`;
2. Preview: `GET /documents/:documentId/preview`;
3. Render PDF: `POST /documents/:documentId/render`;
4. Download: `GET /documents/:documentId/download` e criar `Blob` a partir de `contentBase64`.

Fluxo sem `documentId` ainda conhecido:

```http
GET  /documents/operations/:operationId/:type/preview
POST /documents/operations/:operationId/:type/render
```

Fluxo de preview de modelo, sem Operation e sem documento emitido:

```http
GET /documents/templates/:templateId/preview
```

Use este endpoint na tela de Modelos de Documentos/Relatórios. Ele retorna o mesmo
`DocumentBlueprint` do preview oficial e deve ser aberto pelo `DocumentViewer`. Não criar Operation
fictícia, não usar Demo Dataset e não montar preview local no frontend.

Tipos:

```ts
type DocumentTemplateType =
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'PMOC';
```

Preview retorna `DocumentBlueprint`:

- `header`;
- `footer`;
- `metadata`;
- `sections[]`;
- componentes: `metadata`, `paragraph`, `table`, `list`, `image`, `qrCode`, `checklist`,
  `signature`, `signaturePlaceholder`, `observation`.

Sprint 8: quando o template exige assinatura, o backend envia componente `signature` no Blueprint.
O frontend não deve decidir regra de assinatura; apenas renderizar o componente recebido.

```ts
type SignatureBlueprintComponent = {
  id: string;
  kind: 'signature';
  mode: 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';
  keepTogether?: boolean;
  signatures: Array<{
    role: 'fixed' | 'collected';
    label: string;
    name: string | null;
    title: string | null;
    signedAt: string | null;
    caption: string | null;
    image?: { mimeType: string; fileSize: number; contentBase64: string } | null;
  }>;
};
```

PDF oficial já contém a assinatura conforme configuração do template:

- `NONE`: sem assinatura;
- `FIXED`: assinatura cadastrada;
- `COLLECTED`: área manual;
- `HYBRID`: assinatura cadastrada + área manual.

Use esse Blueprint para preview visual no frontend, mas trate o PDF oficial como produto do backend.

Download:

```ts
type DocumentDownload = {
  id: string;
  operationId: string;
  type: DocumentTemplateType;
  number: string;
  status: 'DRAFT' | 'READY' | 'VALIDATED' | 'SENT';
  mimeType: 'application/pdf';
  fileSize: number;
  renderedAt: string;
  renderMetadata: { engine: string; pageCount: number; blueprintVersion?: string };
  downloadReady: boolean;
  contentBase64: string;
};
```

Erros de UX:

- `DOCUMENT_DOWNLOAD_NOT_READY` (409): mostrar botão "Gerar PDF" antes do download;
- `DOCUMENT_FORBIDDEN_TYPE` (403): ocultar orçamento/recibo para não-OWNER;
- `DOCUMENT_SIZE_LIMIT_EXCEEDED` (400): orientar reduzir fotos/checklist/tabelas;
- `DOCUMENT_RENDER_FAILED` (500): exibir retry e registrar `X-Request-Id`.

Limitação consciente atual: fotos de operação ainda aparecem como componentes/metadados seguros no
PDF; assinatura fixa já é embutida no PDF pela Sprint 8.

## Asset Lifecycle / Timeline de Equipamento (Sprint 9)

O histórico oficial do equipamento agora vem de `AssetLifecycleEvent`. Não monte timeline juntando
Operations, documentos e anexos no frontend; use a API de ciclo de vida.

Endpoints principais:

```http
GET  /asset-lifecycle?page=1&limit=20&equipmentId=&operationId=&type=&performedBy=&from=&to=
GET  /asset-lifecycle/:id
POST /asset-lifecycle

GET  /equipments/:id/lifecycle?page=1&limit=20&type=&performedBy=&from=&to=
GET  /equipments/:id/lifecycle/stats

GET    /asset-lifecycle/:id/attachments
POST   /asset-lifecycle/:id/attachments
DELETE /asset-lifecycle/:id/attachments/:attachmentId
```

Sprint 9.5 adiciona também `customerId` em `GET /asset-lifecycle` para telas agregadas por cliente:

```http
GET /asset-lifecycle?customerId=<uuid>&page=1&limit=20
```

Roles:

- OWNER/MANAGER/OPERATOR/VIEWER: leitura da timeline;
- OWNER/MANAGER/OPERATOR: criação de evento e upload de anexo;
- OWNER/MANAGER: remoção de anexo;
- eventos não são editáveis nem removíveis.

Eventos oficiais:

```ts
type AssetLifecycleEventType =
  | 'INSTALLATION'
  | 'INSPECTION'
  | 'PREVENTIVE'
  | 'CORRECTIVE'
  | 'MAINTENANCE'
  | 'PART_REPLACEMENT'
  | 'WARRANTY'
  | 'DOCUMENT'
  | 'NOTE'
  | 'CUSTOM';
```

UX recomendada para a página/drawer de equipamento:

1. Abrir detalhes do equipamento com `GET /equipments/:id`.
2. Carregar timeline oficial com `GET /equipments/:id/lifecycle?page=1&limit=20`.
3. Carregar cards de indicadores com `GET /equipments/:id/lifecycle/stats`.
4. Para filtros, enviar cumulativamente `type`, `performedBy`, `from` e `to`.
5. Para anexos de um evento, usar `GET /asset-lifecycle/:eventId/attachments`.

O backend cria automaticamente:

- evento de manutenção/instalação quando uma Operation é concluída;
- evento `DOCUMENT` quando um PDF oficial é renderizado.

Portanto, após concluir atendimento ou gerar documento, basta invalidar/refazer a query da timeline
do equipamento.

Payload pronto para UI:

Cada item preserva os campos originais e inclui `timeline`. Use `timeline` para renderizar cards,
badges, cor, ícone, navegação e agrupamento. Não interprete enum no frontend.

```ts
type AssetLifecycleTimelineItem = {
  id: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  date: string;
  groupKey: string;
  sortKey: string;
  user: { id: string; name: string; username: string } | null;
  type: AssetLifecycleEventType;
  operationId: string | null;
  documentId: string | null;
  equipmentId: string;
  references: {
    equipment: { id: string; name: string; tag: string; type: string; status: string } | null;
    customer: { id: string; name: string; tradeName: string | null } | null;
    operation: { id: string; number: number; type: string; status: string } | null;
    document: {
      id: string;
      number: string;
      type: string;
      status: string;
      renderedAt: string | null;
      fileSize: number | null;
    } | null;
  };
  attachments: Array<{
    id: string;
    category: string;
    mimeType: string;
    fileSize: number;
    originalFileName: string;
    createdAt: string;
  }>;
  badges: string[];
};
```

Listagens incluem `timelineGroups`, preparado para infinite scroll/agrupamento por dia. O frontend
pode usar `items` para lista plana ou `timelineGroups` para seções por data.

Navegação direta:

- se `timeline.operationId` existir, abrir drawer/página da operação;
- se `timeline.documentId` existir, abrir preview/download do documento;
- usar `timeline.references.customer` para link de cliente;
- usar `timeline.references.equipment` para link do ativo.

Payload de criação manual:

```ts
type CreateLifecycleEventRequest = {
  equipmentId: string;
  operationId?: string;
  documentId?: string;
  type: AssetLifecycleEventType;
  occurredAt?: string;
  performedBy?: string;
  description: string;
  metadata?: Record<string, unknown>;
};
```

Anexos:

- `multipart/form-data`;
- campo `file`;
- campo opcional `category`;
- PDF/PNG/JPG/JPEG;
- máximo 5 MiB;
- o cliente deve validar para UX, mas o backend é autoridade.

Estados vazios:

- sem eventos: mostrar "Nenhum evento registrado para este equipamento";
- sem estatísticas: os contadores retornam zero e datas retornam `null`;
- sem anexos: mostrar lista vazia.

Erros de UX:

- `ASSET_LIFECYCLE_EVENT_NOT_FOUND`: evento removido/inexistente; atualizar timeline;
- `ASSET_LIFECYCLE_ATTACHMENT_NOT_FOUND`: anexo já removido; atualizar lista;
- `UPLOAD_INVALID_MIME_TYPE` / `UPLOAD_INVALID_EXTENSION`: rejeitar arquivo e orientar formatos;
- `UPLOAD_FILE_TOO_LARGE`: orientar limite de 5 MiB;
- `VALIDATION_ERROR`: revisar filtros/payload.

## Maintenance Planning (Sprint 10)

O backend agora expõe planejamento de manutenção. Importante: planejamento não é execução. Execuções
reais continuam sendo `Operation`; uma execução planejada pode ser vinculada a uma Operation.

Endpoints:

```http
GET    /maintenance-plans/stats
GET    /maintenance-plans?page=1&limit=20&equipmentId=&type=&priority=&active=
GET    /maintenance-plans/:id
POST   /maintenance-plans
PATCH  /maintenance-plans/:id
DELETE /maintenance-plans/:id

GET   /maintenance-plans/:id/executions?page=1&limit=20&status=&from=&to=
POST  /maintenance-plans/:id/executions
PATCH /maintenance-executions/:id

GET /equipments/:id/maintenance?page=1&limit=20
GET /equipments/:id/maintenance/upcoming?page=1&limit=20&status=&from=&to=
```

Roles para UI:

- OWNER/MANAGER: podem criar, editar e desativar planos;
- OWNER/MANAGER/OPERATOR: podem criar/atualizar execuções planejadas;
- OWNER/MANAGER/OPERATOR/VIEWER: podem visualizar planos, execuções e estatísticas.

Tipos:

```ts
type MaintenancePlanType = 'PREVENTIVE' | 'INSPECTION' | 'WARRANTY' | 'CUSTOM';
type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type MaintenanceExecutionStatus = 'PLANNED' | 'LINKED' | 'COMPLETED' | 'CANCELED';
type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'INTERVAL_DAYS'
  | 'INTERVAL_MONTHS';
```

Criação de plano:

```ts
await api.post('/maintenance-plans', {
  equipmentId,
  name: 'Preventiva mensal',
  description: 'Limpeza, inspeção e medição.',
  type: 'PREVENTIVE',
  priority: 'MEDIUM',
  recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
  firstExecution: '2026-07-10T12:00:00.000Z',
  active: true,
});
```

Criação de execução:

```ts
await api.post(`/maintenance-plans/${planId}/executions`, {
  scheduledAt: '2026-08-10T12:00:00.000Z',
  notes: 'Execução planejada manualmente.',
});
```

Vincular/concluir execução:

```ts
await api.patch(`/maintenance-executions/${executionId}`, {
  operationId,
  status: 'COMPLETED',
  executedAt: new Date().toISOString(),
  notes: 'Executada conforme checklist operacional.',
});
```

Após concluir uma execução, invalide/refaça:

- plano (`GET /maintenance-plans/:id`);
- lista de execuções;
- timeline do equipamento (`GET /equipments/:id/lifecycle`);
- estatísticas de manutenção (`GET /maintenance-plans/stats`).

Estados de UX:

- sem planos: mostrar CTA conforme papel (`OWNER/MANAGER`);
- plano vencido: compare `nextExecution` com relógio do cliente apenas para destaque visual; o
  backend é autoridade;
- `VIEWER`: ocultar ações de escrita, mas ainda tratar 403;
- `OPERATOR`: pode atualizar execução, mas não criar/editar plano.

Erros principais:

- `MAINTENANCE_RECURRENCE_INVALID`: revisar frequência/intervalo;
- `MAINTENANCE_OPERATION_MISMATCH`: Operation não pertence ao equipamento do plano;
- `MAINTENANCE_PLAN_NOT_FOUND`: plano inexistente/desativado para a ação;
- `MAINTENANCE_EXECUTION_NOT_FOUND`: execução inexistente;
- `VALIDATION_ERROR`: datas ISO, UUIDs ou enums inválidos.

## PMOC Compliance (Sprint 11)

PMOC é uma especialização de Maintenance Planning. O frontend não deve criar calendário, execução ou
timeline paralelos.

Endpoints:

```http
GET    /pmoc/stats
GET    /pmoc?page=1&limit=20&customerId=&equipmentId=&active=
GET    /pmoc/:id
POST   /pmoc
PATCH  /pmoc/:id
DELETE /pmoc/:id

GET    /pmoc/:id/environments
POST   /pmoc/:id/environments
PATCH  /pmoc/environments/:id
DELETE /pmoc/environments/:id

GET /pmoc/:id/compliance
GET /equipments/:id/pmoc?page=1&limit=20
```

Roles para UI:

- OWNER/MANAGER: criam, editam e desativam PMOC/ambientes;
- OWNER/MANAGER/OPERATOR/VIEWER: visualizam PMOCs, ambientes, compliance e stats.

Status:

```ts
type PmocComplianceStatus = 'COMPLIANT' | 'WARNING' | 'OVERDUE' | 'NON_COMPLIANT' | 'IN_PROGRESS';
```

Criação:

```ts
await api.post('/pmoc', {
  customerId,
  equipmentId,
  equipmentIds: [equipmentId],
  responsibleTechnician: 'Ricardo Almeida',
  artNumber: 'ART-PE-2026-00091',
  contractNumber: 'HSC-PMOC-2026',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  priority: 'HIGH',
  recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
});
```

O backend cria o `MaintenancePlan` e a primeira `MaintenanceExecution`. Para mostrar agenda, use os
campos de `maintenancePlan.executions` ou os endpoints de Maintenance Planning.

Ambiente:

```ts
await api.post(`/pmoc/${pmocId}/environments`, {
  name: 'Central de água gelada',
  area: '85 m²',
  occupancy: 4,
  equipmentIds: [equipmentId],
});
```

Documentos:

`GET /pmoc/:id/compliance` retorna `document.type = 'PMOC'`, `engine = 'DocumentEngine'` e o
template padrão. A renderização/preview/download do documento continua usando os endpoints oficiais
do Document Engine. Não montar PDF PMOC no frontend.

Após concluir uma execução PMOC:

- invalidar `GET /pmoc/:id`;
- invalidar `GET /pmoc/:id/compliance`;
- invalidar `GET /equipments/:id/lifecycle`;
- invalidar Maintenance Planning relacionado.

Erros principais:

- `PMOC_INVALID_RELATIONSHIP`: equipamento não pertence ao cliente ou ambiente referencia ativo fora
  do PMOC;
- `PMOC_PLAN_NOT_FOUND`: PMOC inexistente;
- `PMOC_ENVIRONMENT_NOT_FOUND`: ambiente inexistente;
- `VALIDATION_ERROR`: datas, enum, paginação ou payload inválido.

## Inventory & Materials (Sprint 12)

O backend expõe a fundação de estoque e materiais. O frontend deve tratar `Product` como catálogo e
`InventoryItem` como saldo físico. Não calcular saldo localmente; sempre usar `currentQuantity`,
`reservedQuantity` e `availableQuantity` retornados pela API.

Endpoints disponíveis:

```http
GET    /products?page=1&limit=20&search=&category=&brand=&active=
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id

GET    /inventory?page=1&limit=20&search=&productId=&location=&critical=&active=
GET    /inventory/:id
PATCH  /inventory/:id
GET    /inventory/stats
POST   /inventory/movements
GET    /inventory/movements?page=1&limit=20&inventoryItemId=&productId=&operationId=&type=&from=&to=

GET    /suppliers?page=1&limit=20&search=&active=
POST   /suppliers
PATCH  /suppliers/:id
DELETE /suppliers/:id

GET    /operations/:id/materials
POST   /operations/:id/materials
DELETE /operations/:id/materials/:id
```

Roles para UI:

- OWNER/MANAGER: gerenciam produtos, fornecedores, parâmetros de estoque e materiais de Operation;
- OPERATOR: consulta produtos/estoque e pode registrar consumo/movimentação operacional;
- VIEWER: somente leitura em produtos, estoque e materiais;
- fornecedores ficam restritos a OWNER/MANAGER.

Payload de produto:

```ts
type ProductPayload = {
  sku: string;
  internalCode?: string;
  manufacturerCode?: string;
  name: string;
  unit: string;
  brand?: string;
  model?: string;
  category?: string;
  technicalDescription?: string;
  weight?: number;
  dimensions?: Record<string, unknown>;
  isActive?: boolean;
};
```

Payload de consumo em Operation:

```ts
await api.post(`/operations/${operationId}/materials`, {
  productId,
  inventoryItemId,
  quantity: 1,
  notes: 'Substituição de filtro saturado',
});
```

Após consumo:

- invalidar `GET /operations/:id/materials`;
- invalidar `GET /inventory/:id`;
- invalidar `GET /inventory/stats`;
- invalidar `GET /equipments/:id/lifecycle` quando a Operation possuir equipamento.

UX recomendada:

- Produtos: tabela paginada com filtros por busca, categoria, marca e ativo;
- Estoque: destacar `availableQuantity <= minimumQuantity` e itens sem saldo;
- Movimentos: linha do tempo/auditoria paginada, sem edição;
- Operation: seletor de produto + item de estoque, mostrando saldo disponível antes de consumir;
- nunca permitir no cliente uma experiência que dependa de saldo calculado em memória.

Erros principais:

- `PRODUCT_CONFLICT`: SKU/código duplicado;
- `PRODUCT_NOT_FOUND`: produto inexistente;
- `SUPPLIER_CONFLICT`: documento duplicado;
- `SUPPLIER_NOT_FOUND`: fornecedor inexistente;
- `INVENTORY_ITEM_NOT_FOUND`: item de estoque inexistente;
- `INVENTORY_NEGATIVE_STOCK`: consumo/saída deixaria saldo negativo;
- `INVENTORY_PRODUCT_MISMATCH`: item de estoque não pertence ao produto selecionado;
- `OPERATION_NOT_FOUND`: Operation inexistente.
