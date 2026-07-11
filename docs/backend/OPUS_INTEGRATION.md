# OPUS Frontend Integration

## Product Backlog Closure 05 — Reports and signature consistency

Use somente `DocumentViewer` para modelo, preview real, renderização e download.

Matriz de preview:

| Ação UI | Endpoint | Dados reais? | Assinatura de execução? |
|---|---|---:|---:|
| Visualizar modelo | `GET /documents/templates/:templateId/preview` | Não | Não |
| Preview com Operation | `GET /documents/operations/:operationId/:type/preview` | Sim | Sim, quando aplicável |
| Renderizar documento | `POST /documents/operations/:operationId/:type/render` | Sim | Sim, quando aplicável |
| Download | `GET /documents/:documentId/download` | Sim | Sim, mesmo blueprint renderizado |

Tipos que aceitam assinatura coletada da Operation:

- `WORK_ORDER`
- `TECHNICAL_REPORT`
- `REPORT`
- `RECEIPT`

O Opus não deve tentar interpretar base64 de assinatura fora do `SignatureComponent`. Renderize a
imagem somente quando `component.kind === "signature"` e `signature.image` existir.

## Product Backlog Closure 05.1 — Visit evidence workflow

`/reports/visita` deve ser tratado como workflow de evidências de uma Operation real.

Contrato de persistência:

- `PATCH /operations/:id`
- campos: `observations`, `checklist`, `photos[]`, `signatureData`, `signedAt`.

Contrato de preview/render:

- preview: `GET /documents/operations/:operationId/TECHNICAL_REPORT/preview`;
- render: `POST /documents/operations/:operationId/TECHNICAL_REPORT/render`;
- download: `GET /documents/:documentId/download`.

Fotos aparecem no blueprint como `component.kind === "image"` e, quando autorizadas/resolvidas pelo
backend, possuem `component.image.contentBase64`. Não usar object URLs como fonte documental.

## Sprint 21 — Performance notes for Opus

Nenhum endpoint de negócio foi alterado. O Opus deve continuar usando os contratos oficiais já
integrados.

Novos endpoints técnicos:

| Endpoint | Uso |
|---|---|
| `GET /health/live` | liveness de processo |
| `GET /health/ready` | readiness com DB/storage |
| `GET /metrics` | Prometheus text/plain para infraestrutura, não para UI |

Baseline medido localmente com fixture de performance:

- dashboard fan-out: p95 181.06 ms, 0% erro;
- inventory consumption: p95 58.39 ms, 0% erro;
- procurement receipt: p95 117.54 ms, 0% erro;
- financial settlement: p95 45.32 ms, 0% erro;
- document preview/render/download: p95 104.04 ms, 0% erro;
- operator read path: p95 28.31 ms, 0% erro.

Regras para manter esses números:

- usar paginação em todas as listas;
- não buscar páginas grandes por padrão;
- cancelar requisições obsoletas em busca/filtros;
- não montar documentos no frontend;
- manter `DocumentViewer` como componente único para preview/render/download;
- não criar polling agressivo sem debounce/backoff.

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
      state: 'OVERDUE' | 'IN_PROGRESS' | 'SCHEDULED' | 'DONE';
      // Enriched for the production Agenda (optional, backward compatible):
      equipment?: string;
      serviceType?: 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'PROJETO';
      endsAt?: string;
      notes?: string;
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

## Pagination contract after Sprint 14.5

All paginated backend lists follow:

```ts
type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number; // minimum 1
  };
};
```

Frontend notes:

- do not special-case `totalPages=0`; it should no longer happen;
- keep active filters while navigating pages;
- use `total === 0` for empty states;
- Asset Lifecycle may include additional `timelineGroups` next to `items` and `pagination`.

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
identifiers, not access credentials. Use `GET /equipments/lookup/:qrCode` to resolve scans.

### Demo

Real `/equipments` returns Samsung split, LG VRF condenser/evaporator, Trane chiller and Fronius
inverter linked to demo customers and addresses. Each includes a metric and manual. Remove the
equipment demo snapshot/mock.

## Equipment QR lookup

`GET /equipments/lookup/:qrCode` (todas as roles) resolve o equipamento pelo
identificador do QR (aceita `qrCode` ou `qrToken`) e retorna o mesmo payload de
`GET /equipments/:id`. O frontend lê o QR pela câmera (PWA, `@zxing/browser`) e
seleciona o equipamento automaticamente no wizard de atendimento. Erros:
`VALIDATION_ERROR` (400) e `EQUIPMENT_NOT_FOUND` (404).

## Templates: ativar/desativar

`DocumentTemplate` ganhou `isActive` (default `true`). `POST/PATCH /organization/templates`
aceitam `isActive`; o frontend usa para ativar/desativar modelos na tela de Relatórios (Modelos).
Migration: `20260627120000_template_is_active`.

## Operations (domínio operacional central)

`Operation` é o atendimento de campo — fundação única reutilizada por OS, PMOC,
Laudo, Relatório, Visita, Orçamento e Recibo (sem implementações paralelas). Toda
OS nasce de uma Operation; criar uma Operation gera automaticamente um
`OperationDocument` `WORK_ORDER` em `DRAFT` (`OS-000001`).

Endpoints: `GET /operations` (lista/filtros `customerId,equipmentId,operatorId,type,status,search`),
`GET /operations/stats`, `GET /operations/:id`, `GET /operations/photos/:photoId`
(base64), `POST /operations` (cria + OS rascunho; `operatorId` opcional para delegação por OWNER/MANAGER),
`PATCH /operations/:id`. Fotos como data URL (PNG/JPEG, máx. 16 × 5 MiB);
assinatura como data URL (texto). O histórico de equipamento/cliente é derivado de
`/operations` por `equipmentId`/`customerId`. Migration:
`20260627150000_operation_domain_foundation`.

Ao criar Operation, `OWNER` e `MANAGER` podem enviar `operatorId` para delegar a
execução. Sem `operatorId`, o backend usa o próprio usuário autenticado.
`OPERATOR` nunca delega; se enviar `operatorId`, a API atribui ao próprio operador
após validação do UUID. O usuário delegado deve estar ativo, não desativado e ter
perfil operacional (`OWNER`, `MANAGER` ou `OPERATOR`). Erro:
`OPERATION_OPERATOR_INVALID`.

## Document Engine (Sprint 6)

O backend agora possui preview estruturado e render/download PDF oficial. Remover previews mocks
para documentos oficiais conforme as telas forem conectadas.

Endpoints:

```http
GET  /documents/operations/:operationId/:type/preview
POST /documents/operations/:operationId/:type/render
GET  /documents/templates/:templateId/preview
GET  /documents/:documentId/preview
POST /documents/:documentId/render
GET  /documents/:documentId/download
```

Tipos:

- `WORK_ORDER`
- `REPORT`
- `TECHNICAL_REPORT`
- `PMOC`
- `QUOTE` (somente OWNER)
- `RECEIPT` (somente OWNER)

Fluxo UX sugerido:

1. Na lista de documentos, usar `GET /operations` e os `documents[]` reais.
2. Ao abrir o preview, chamar `GET /documents/:documentId/preview`.
3. Se o usuário clicar "Gerar PDF", chamar `POST /documents/:documentId/render`.
4. Se `downloadReady=true`, chamar `GET /documents/:documentId/download`.
5. Converter `contentBase64` para `Blob` com `mimeType=application/pdf`.

Fluxo UX para Modelos de Documentos:

1. Listar templates com `GET /organization/templates`.
2. Ao clicar em "Visualizar modelo", chamar `GET /documents/templates/:templateId/preview`.
3. Renderizar o retorno no `DocumentViewer`.
4. Não criar Operation, não usar Demo Dataset e não usar preview local.

Estados:

- `DRAFT`: mostrar "Gerar PDF";
- `READY`: mostrar "Baixar PDF" e permitir "Gerar novamente";
- `DOCUMENT_DOWNLOAD_NOT_READY`: ainda não renderizado;
- `DOCUMENT_FORBIDDEN_TYPE`: esconder Orçamento/Recibo para MANAGER/OPERATOR/VIEWER;
- `DOCUMENT_SIZE_LIMIT_EXCEEDED`: o documento ficou grande demais;
- `DOCUMENT_RENDER_FAILED`: mostrar retry e incluir `X-Request-Id` no suporte.
- `TEMPLATE_NOT_FOUND`: modelo removido/inexistente;
- `TEMPLATE_INACTIVE`: modelo inativo;
- `SIGNATURE_NOT_FOUND`, `SIGNATURE_INACTIVE`, `SIGNATURE_IMAGE_REQUIRED`: configuração de assinatura inválida;
- `STORAGE_FILE_NOT_FOUND`: asset referenciado não existe no storage.

Blueprint:

O preview retorna `sections[]` com componentes reutilizáveis (`metadata`, `paragraph`, `table`,
`list`, `image`, `qrCode`, `checklist`, `signaturePlaceholder`, `observation`). O frontend pode
renderizar esses componentes em tela, mas o PDF oficial sempre vem do backend.

Observações de UX:

- fotos ainda aparecem como componentes/metadados seguros no PDF; embed binário inline não é parte
  da Sprint 6;
- assinatura é placeholder arquitetural (`none`, `fixed`, `collected`, `hybrid`), sem CRUD;
- QR Code do equipamento aparece como componente lógico e não autentica acesso.

Próximos endpoints previstos:

- versionamento de documentos;
- uso efetivo da configuração de assinatura no Builder;
- envio por e-mail/WhatsApp;
- editor visual de templates.

## Document Configuration & Signatures (Sprint 7)

A Sprint 7 é backend-only e prepara o domínio de assinatura/configuração. Não altera o render PDF
oficial ainda. O frontend pode remover mocks de configuração de assinatura e consumir estes dados
reais.

Enums:

```ts
type SignatureMode = 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';
type DocumentTemplateType =
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'PMOC';
```

Campos novos em `DocumentTemplate`:

```ts
{
  requiresSignature: boolean;
  signatureMode: SignatureMode;
  signatureId: string | null;
}
```

Estados de assinatura por template:

- `NONE`: sem assinatura;
- `FIXED`: seleciona assinatura cadastrada;
- `COLLECTED`: assinatura será coletada em fluxo futuro;
- `HYBRID`: aceita assinatura cadastrada e futura coleta.

Endpoints disponíveis:

```http
GET /documents/configuration
GET /documents/configuration/types/:type
GET /documents/configuration/templates/:templateId

GET    /signatures?page=1&limit=20&search=&active=true
GET    /signatures/:id
POST   /signatures
PATCH  /signatures/:id
DELETE /signatures/:id
POST   /signatures/:id/upload
GET    /signatures/:id/download
```

Paginação de assinaturas:

```ts
{
  items: Signature[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

UX sugerida:

- Em Configurações → Documentos, carregar `GET /documents/configuration`.
- Para escolher assinatura fixa/híbrida, listar `GET /signatures?active=true`.
- Mostrar upload apenas para OWNER.
- Para preview de imagem, chamar `GET /signatures/:id/download` e montar `Blob` a partir de
  `contentBase64`.
- Ocultar toda a área para OPERATOR.

Mocks que podem ser removidos:

- lista local de assinaturas;
- estados locais de assinatura por template;
- imagem de assinatura fixa mockada.

## Document Signature Integration (Sprint 8)

O Builder agora usa a configuração de assinatura no PDF oficial. O frontend deve continuar usando os
mesmos endpoints de preview/render/download; contratos de rota não mudaram.

Novo componente possível no Blueprint:

```ts
type SignatureComponent = {
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

UX:

- se `kind='signature'`, renderize bloco não quebrável;
- `fixed` pode exibir a imagem no preview;
- `collected` deve exibir linha manual;
- o PDF baixado já vem com assinatura fixa quando configurada;
- erros possíveis ao renderizar: `SIGNATURE_NOT_FOUND`, `SIGNATURE_INACTIVE`,
  `SIGNATURE_IMAGE_REQUIRED`, `DOCUMENT_RENDER_FAILED`.

Mocks que podem ser removidos:

- placeholder local de assinatura fixa no PDF;
- regra local de qual assinatura aparece por tipo;
- geração local de área de assinatura.

## Asset Lifecycle / Timeline oficial do ativo (Sprint 9)

Use estes endpoints para a linha do tempo de equipamentos. Não derive histórico combinando
`/operations`, documentos e anexos no frontend.

Endpoints disponíveis:

```http
GET  /asset-lifecycle
GET  /asset-lifecycle/:id
POST /asset-lifecycle
GET  /equipments/:id/lifecycle
GET  /equipments/:id/lifecycle/stats
GET  /asset-lifecycle/:id/attachments
POST /asset-lifecycle/:id/attachments
DELETE /asset-lifecycle/:id/attachments/:attachmentId
```

Paginação:

```ts
{
  items: AssetLifecycleEvent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

Filtros:

- `page`;
- `limit`;
- `customerId` (`GET /asset-lifecycle`);
- `equipmentId`;
- `operationId`;
- `type`;
- `performedBy`;
- `from`;
- `to`.

Para tela de equipamento, prefira:

```http
GET /equipments/:id/lifecycle?page=1&limit=20&type=&performedBy=&from=&to=
```

Campos importantes:

- `timeline`: card pronto para UI, preferir este objeto na renderização;
- `type`: badge/ícone do evento;
- `occurredAt`: data operacional do evento;
- `createdAt`: data em que o registro foi gravado;
- `performedBy`/`performer`: técnico/usuário relacionado;
- `operation`: link para atendimento;
- `document`: link para documento;
- `attachments`: anexos ativos do evento;
- `metadata`: não faz parte do payload público após a Sprint 20.5; use `timeline.references` e os
  campos explícitos do evento.

Campos que o frontend não deve esperar em Asset Lifecycle:

- `storageKey`;
- `eventId` e `deletedAt` em anexos;
- e-mail do performer;
- valores financeiros, credenciais, tokens ou binários em metadata.

Downloads e exclusões de anexos devem sempre passar pelos endpoints oficiais autorizados.

Sprint 9.5:

O backend agora entrega o objeto `timeline` em cada evento e `timelineGroups` nas listagens. O Opus
não precisa mais mapear enum para ícone/cor/título.

Use:

```ts
event.timeline.icon;
event.timeline.color;
event.timeline.title;
event.timeline.subtitle;
event.timeline.category;
event.timeline.references;
event.timeline.attachments;
```

Para infinite scroll:

- continue paginando com `page`/`limit`;
- use `timeline.sortKey` como chave estável visual;
- use `timeline.groupKey` ou `timelineGroups[].date` para separar por dia;
- ao mudar filtros, reinicie a paginação.

Para tela de cliente:

```http
GET /asset-lifecycle?customerId=<customerId>&page=1&limit=20
```

Para tela de equipamento:

```http
GET /equipments/:id/lifecycle?page=1&limit=20
```

Tipos e sugestão visual:

- `INSTALLATION`: instalação / início do ativo;
- `INSPECTION`: inspeção;
- `PREVENTIVE`: preventiva;
- `CORRECTIVE`: corretiva;
- `MAINTENANCE`: manutenção geral;
- `PART_REPLACEMENT`: peça trocada;
- `WARRANTY`: garantia;
- `DOCUMENT`: documento gerado;
- `NOTE`: observação;
- `CUSTOM`: evento especial.

Estatísticas:

```http
GET /equipments/:id/lifecycle/stats
```

Retorna:

- `preventiveCount`;
- `correctiveCount`;
- `documentCount`;
- `inspectionCount`;
- `firstInstallation`;
- `lastMaintenance`;
- `meanDaysBetweenInterventions`;
- `byType` com todos os tipos oficiais.

Upload de anexos:

```ts
const form = new FormData();
form.append('file', file);
form.append('category', 'PHOTO');
await api.post(`/asset-lifecycle/${eventId}/attachments`, form);
```

Aceito:

- PDF;
- PNG;
- JPG/JPEG;
- 5 MiB.

RBAC para UX:

- OWNER/MANAGER/OPERATOR/VIEWER: podem ver;
- OWNER/MANAGER/OPERATOR: podem criar evento e anexar arquivo;
- OWNER/MANAGER: podem remover anexo;
- nenhum papel edita ou exclui evento.

Integrações automáticas:

- concluir Operation cria evento no ativo;
- renderizar documento cria evento `DOCUMENT`;
- depois dessas ações, invalide a query de lifecycle do equipamento.

Metadata confiável para navegação:

- eventos de Operation carregam `operationId`, `operationNumber`, `operationType`,
  `operationStatus`;
- eventos `DOCUMENT` carregam `documentId`, `documentType`, `documentNumber`, `renderStatus`,
  `renderedAt`;
- para UI, prefira `timeline.references.operation` e `timeline.references.document`, pois já vêm
  normalizados.

Mocks que podem ser removidos:

- timeline local de equipamento;
- contadores locais de preventiva/corretiva/documentos;
- histórico derivado manualmente de `/operations`;
- anexos temporários de evento.
- mapeamento local de enum para cor/ícone/título.

Próximos endpoints previstos:

- alertas de garantia/SLA;
- manutenção recorrente;
- PMOC;
- agenda automática;
- indicadores agregados globais.

## Maintenance Planning — Sprint 10

O Opus já pode integrar a fundação de planejamento de manutenção. Não gere Operations no frontend
automaticamente; esta sprint apenas agenda futuras execuções e permite vincular uma Operation real.

Endpoints disponíveis:

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

Payload para criar plano:

```ts
type CreateMaintenancePlanRequest = {
  equipmentId: string;
  name: string;
  description?: string;
  type: 'PREVENTIVE' | 'INSPECTION' | 'WARRANTY' | 'CUSTOM';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recurrenceRule: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL_DAYS' | 'INTERVAL_MONTHS';
    interval?: number;
  };
  firstExecution: string;
  active?: boolean;
};
```

Payload de execução:

```ts
type MaintenanceExecution = {
  id: string;
  maintenancePlanId: string;
  operationId: string | null;
  scheduledAt: string;
  executedAt: string | null;
  status: 'PLANNED' | 'LINKED' | 'COMPLETED' | 'CANCELED';
  notes: string | null;
  createdAt: string;
  plan: MaintenancePlan;
  operation: {
    id: string;
    number: number;
    type: string;
    status: string;
    completedAt: string | null;
  } | null;
};
```

Estados importantes:

- `PLANNED`: execução planejada sem operação concluída;
- `LINKED`: execução vinculada a uma Operation ainda não concluída;
- `COMPLETED`: execução realizada; backend atualiza plano e Asset Lifecycle;
- `CANCELED`: execução cancelada para fins operacionais.

Paginação:

Todas as listagens retornam:

```ts
{
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

UX recomendada:

- Em equipamento, carregar `GET /equipments/:id/maintenance` para planos e
  `GET /equipments/:id/maintenance/upcoming` para próximas execuções.
- Em dashboard, usar `GET /maintenance-plans/stats`.
- Exibir `nextExecution`, `lastExecution`, `priority` e `_count.executions` nos cards.
- Após concluir uma execução, invalidar timeline do equipamento; o backend cria evento
  `MAINTENANCE`.
- Não montar recorrência local além de validação visual; o cálculo oficial é do `RecurringEngine`.

Mocks que podem ser removidos:

- cards locais de manutenção futura;
- próximas preventivas simuladas;
- estatísticas manuais de planos ativos/vencidos;
- recorrência calculada no frontend como fonte de verdade.

Próximos endpoints previstos:

- PMOC sobre Maintenance Planning;
- geração assistida de Operations a partir de execuções planejadas;
- alertas;
- agenda automática;
- garantias inteligentes.

## PMOC Compliance — Sprint 11

O backend já expõe PMOC como domínio de conformidade sobre Maintenance Planning. Não criar mocks,
agenda paralela, execução paralela, timeline paralela ou PDF local.

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
GET /equipments/:id/pmoc
```

Payload de criação:

```ts
type CreatePmocRequest = {
  customerId: string;
  equipmentId: string;
  equipmentIds?: string[];
  responsibleTechnician: string;
  artNumber?: string;
  contractNumber?: string;
  startDate: string;
  endDate: string;
  observations?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recurrenceRule: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL_DAYS' | 'INTERVAL_MONTHS';
    interval?: number;
  };
  active?: boolean;
};
```

Status:

- `COMPLIANT`: ativo, vigente e sem pendências próximas/vencidas;
- `WARNING`: execução PMOC próxima;
- `OVERDUE`: validade vencida ou execução vencida;
- `NON_COMPLIANT`: PMOC ou plano inativo;
- `IN_PROGRESS`: vigência ainda não iniciou.

Campos importantes:

- `maintenancePlan`: plano oficial de recorrência;
- `maintenancePlan.executions`: próximas execuções planejadas;
- `equipments`: equipamentos reais monitorados pelo PMOC;
- `environments`: ambientes e equipamentos associados;
- `compliance`: status calculado pelo backend;
- `document`: em `/pmoc/:id/compliance`, indica preparação para Document Engine.

UX:

- Página de cliente: carregar `GET /pmoc?customerId=<id>`.
- Página de equipamento: carregar `GET /equipments/:id/pmoc`.
- Dashboard: carregar `GET /pmoc/stats`.
- Detalhe PMOC: carregar `GET /pmoc/:id` e `GET /pmoc/:id/compliance`.
- Timeline: continuar usando Asset Lifecycle; eventos PMOC chegam como `PMOC_CREATED`,
  `PMOC_UPDATED`, `PMOC_COMPLETED`, `PMOC_EXPIRED`.

Mocks que podem ser removidos:

- status PMOC calculado localmente;
- próximas execuções PMOC simuladas;
- ambientes mockados;
- PDFs PMOC montados no frontend;
- timeline PMOC local.

Próximos endpoints previstos:

- Compliance Engine genérico;
- geração assistida de Operation a partir de PMOC;
- alertas de vencimento;
- workflow de aprovação;
- assinatura digital avançada.

## Inventory & Materials — Sprint 12

O backend agora possui o domínio oficial de inventário. Para frontend, a separação central é:

- `Product`: catálogo, descrição técnica e códigos;
- `InventoryItem`: saldo físico de um produto em uma localização;
- `StockMovement`: histórico imutável de entradas, saídas, consumo e retorno;
- `OperationPart`: material consumido em um atendimento.

Endpoints disponíveis:

```http
GET    /products
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id

GET    /inventory
GET    /inventory/:id
PATCH  /inventory/:id
GET    /inventory/stats
POST   /inventory/movements
GET    /inventory/movements

GET    /suppliers
POST   /suppliers
PATCH  /suppliers/:id
DELETE /suppliers/:id

GET    /operations/:id/materials
POST   /operations/:id/materials
DELETE /operations/:id/materials/:id
```

Paginação:

Todos os endpoints de listagem retornam:

```ts
type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

Campos importantes:

- `Product.sku`: identificador comercial único;
- `Product.internalCode`: código interno opcional e único;
- `Product.suppliers[]`: vínculos Product↔Supplier persistidos, com o fornecedor principal em
  `isPrimary=true`;
- `primarySupplierId`: campo opcional de `POST/PATCH /products` para definir/remover fornecedor
  principal (`null` remove);
- `InventoryItem.currentQuantity`: saldo físico atual recalculado pelo backend;
- `InventoryItem.reservedQuantity`: reserva administrativa;
- `InventoryItem.availableQuantity`: saldo disponível;
- `StockMovement.type`: `IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`, `CONSUMPTION`, `RETURN`;
- `OperationPart.deletedAt`: indica material removido sem apagar histórico.

Consumo de material:

```ts
await api.post(`/operations/${operationId}/materials`, {
  productId,
  inventoryItemId,
  quantity: 1,
  notes: 'Peça substituída em manutenção corretiva',
});
```

Efeitos do backend:

- cria `OperationPart`;
- cria `StockMovement` do tipo `CONSUMPTION`;
- recalcula `InventoryItem`;
- rejeita saldo negativo;
- publica `PART_REPLACEMENT` no Asset Lifecycle quando a Operation possui equipamento.

Estados de UX:

- item abaixo do mínimo: `Number(availableQuantity) <= Number(minimumQuantity)`;
- item sem saldo: `Number(availableQuantity) <= 0`;
- produto inativo: `isActive = false`;
- movimento imutável: não exibir ação de editar movimento.

Mocks que podem ser removidos:

- estoque calculado localmente;
- materiais de Operation simulados;
- produtos mockados;
- fornecedores mockados;
- indicadores de consumo simulados.

Próximos endpoints previstos:

- compras;
- cotações;
- orçamento integrado a materiais;
- múltiplos almoxarifados;
- código de barras/QR de estoque.

## Pricing — Sprint 13

Pricing concentra custo, preço, margem e vigência. Não existe preço em `Product`; não existe custo em
`InventoryItem`.

Endpoints disponíveis:

```http
GET   /pricing/stats
GET   /pricing
GET   /pricing/:id
GET   /products/:id/pricing
POST  /products/:id/pricing
PATCH /pricing/:id
GET   /pricing/history/:productId
```

Paginação:

`GET /pricing` e `GET /pricing/history/:productId` usam o envelope paginado padrão:

```ts
type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

Campos importantes:

- `costPrice`: custo base;
- `replacementCost`: custo de reposição;
- `averageCost`: custo médio;
- `salePrice`: preço vigente de venda;
- `minimumSalePrice`: piso comercial;
- `suggestedSalePrice`: preço sugerido;
- `marginPercentage`: margem calculada/validada pelo backend;
- `validFrom` / `validUntil`: vigência;
- `active`: preço ativo para resolução.

Fluxo recomendado:

```ts
const current = await api.get(`/products/${productId}/pricing`);
const history = await api.get(`/pricing/history/${productId}?page=1&limit=20`);
```

Criar preço:

```ts
await api.post(`/products/${productId}/pricing`, {
  costPrice: 42.5,
  replacementCost: 45,
  averageCost: 43.8,
  salePrice: 78,
  minimumSalePrice: 68,
  suggestedSalePrice: 82,
  validFrom: '2026-07-01T00:00:00.000Z',
});
```

Revisar preço:

```ts
await api.patch(`/pricing/${pricingId}`, {
  salePrice: 84,
  validFrom: '2026-08-01T00:00:00.000Z',
});
```

O PATCH cria uma nova vigência. A UI deve tratar o retorno como novo registro.

Mocks que podem ser removidos:

- preço hardcoded em produto;
- margem calculada somente no frontend;
- custos simulados em estoque;
- histórico comercial local.

Próximos endpoints previstos:

- tabelas de preço;
- orçamento;
- financeiro;
- descontos;
- contratos comerciais.

## Assignment Domain + Operator Workflow

Use Assignment para todo fluxo de campo do Operator. A Operation continua sendo a entidade principal;
Assignment apenas controla execução.

Endpoints disponíveis:

```http
GET   /assignments?page=1&limit=20&operationId=&assignedTo=&customerId=&equipmentId=&status=
GET   /assignments/my?page=1&limit=20&status=
GET   /assignments/:id
GET   /assignments/history/:operationId
POST  /assignments
PATCH /assignments/:id/reassign
PATCH /assignments/:id/accept
PATCH /assignments/:id/reject
PATCH /assignments/:id/start
PATCH /assignments/:id/complete
```

Payloads:

```ts
type CreateAssignmentPayload = {
  operationId: string;
  assignedTo: string;
  notes?: string | null;
};

type ReassignAssignmentPayload = {
  assignedTo: string;
  notes?: string | null;
};
```

Estados:

- `ASSIGNED`: mostrar CTA Aceitar;
- `ACCEPTED`: mostrar CTA Iniciar;
- `STARTED`: mostrar CTA Continuar/Concluir;
- `COMPLETED`: somente leitura;
- `REJECTED`/`CANCELED`: somente leitura;
- `PAUSED`: reservado para retomada futura.

Observações UX:

- Home Operator deve priorizar Hoje, Minhas atividades, Em andamento, Próximas e Atrasadas;
- Minhas Ordens deve consumir somente `/assignments/my`;
- Timeline da Assignment vem de `/assignments/history/:operationId`;
- Platform Agenda é apenas visão de Assignments; não criar domínio local de agenda;
- Operation Drawer deve exibir responsável, status e histórico de Assignment.

Mocks que podem ser removidos:

- schedule demo no Operator Home/Agenda/Services;
- cards locais de serviços;
- timeline local de execução do operador.

## Budget Domain — Orçamentos comerciais

Use estes endpoints para construir a futura área comercial/orçamentos. Não usar mocks de preço,
subtotal ou margem.

Endpoints disponíveis:

```http
GET    /budgets?page=1&limit=20&search=&status=&customerId=&equipmentId=&operationId=&from=&to=&expired=
GET    /budgets/:id
GET    /operations/:id/budgets?page=1&limit=20
POST   /budgets
PATCH  /budgets/:id
PATCH  /budgets/:id/approve
PATCH  /budgets/:id/reject
DELETE /budgets/:id
GET    /budgets/stats
GET    /budgets/history/:id?page=1&limit=20
```

Campos importantes:

- `number`: sequencial oficial do orçamento;
- `status`: estado comercial;
- `subtotal`, `discount`, `additional`, `total`: strings decimais vindas do backend;
- `items[].snapshotCost`: custo congelado no momento da criação/revisão;
- `items[].snapshotSalePrice`: preço de venda congelado;
- `items[].snapshotMargin`: margem congelada;
- `expirationDate`: data limite para aprovação;
- `operationId`: opcional; uma Operation pode ter vários orçamentos;
- `approvedAt` e `rejectedAt`: timestamps de decisão.

Payload mínimo:

```ts
await api.post('/budgets', {
  customerId,
  operationId,
  equipmentId,
  title: 'Troca de componentes',
  expirationDate: '2026-07-17T00:00:00.000Z',
  status: 'PENDING',
  items: [
    { productId, quantity: 2, description: 'Filtro G4' },
  ],
});
```

Decisão:

```ts
await api.patch(`/budgets/${budgetId}/approve`, {
  observation: 'Aprovado pelo cliente',
});

await api.patch(`/budgets/${budgetId}/reject`, {
  observation: 'Cliente recusou a proposta',
});
```

Estados para UI:

- `DRAFT`: badge cinza/azul, permitir editar;
- `PENDING`: badge amarelo, permitir editar/aprovar/rejeitar;
- `APPROVED`: badge verde, somente leitura;
- `REJECTED`: badge vermelho, somente leitura;
- `EXPIRED`: badge laranja/vermelho, somente leitura;
- `CANCELED`: badge cinza, somente leitura.

Paginação:

- todas as listagens retornam `{ items, pagination }`;
- preservar filtros ao trocar `page` e `limit`.

Observações de UX:

- para adicionar item, mostrar produtos do catálogo e deixar o backend resolver preço;
- se voltar `PRICING_NOT_FOUND`, abrir CTA para cadastro/revisão de preço;
- se voltar `BUDGET_MULTIPLE_APPROVAL`, mostrar orçamento aprovado existente na Operation;
- ao aprovar/rejeitar, atualizar Timeline do equipamento porque o backend publica eventos de lifecycle;
- não exibir Budget para OPERATOR/VIEWER.

Mocks que podem ser removidos:

- orçamentos locais;
- cálculo local de snapshot;
- preço hardcoded em item de orçamento;
- status comercial simulado;
- timeline local de orçamento aprovado/rejeitado.

Próximos endpoints previstos:

- reserva futura de estoque;
- conversão futura para financeiro;
- envio futuro por e-mail/WhatsApp.

## Budget Document Emission

Endpoints disponíveis para a UI:

- `POST /api/v1/budgets/:id/render`;
- `GET /api/v1/budgets/:id/download`.

Contrato de render:

```ts
type BudgetRenderResult = {
  documentId: string;
  preview: DocumentBlueprint;
  download: string;
  status: 'READY' | 'DRAFT' | 'VALIDATED' | 'SENT';
  document: OperationDocument & { budgetId: string };
};
```

Contrato de download:

```ts
type BudgetDownload = OperationDocument & {
  budgetId: string;
  contentBase64: string;
};
```

Observações de UX:

- Remover placeholder de "render/download futuro".
- "Visualizar Documento" deve abrir `DocumentViewer` com `documentId` real.
- "Emitir Documento" chama `POST /budgets/:id/render` e atualiza o Budget/drawer.
- "Baixar PDF" chama `GET /budgets/:id/download`.
- Não utilizar `GET /documents/templates/:templateId/preview` como documento emitido.
- Se o Budget estiver `CANCELED` ou `REJECTED`, a emissão deve ficar bloqueada.
- Em erro 404 de download, mostrar "Documento ainda não emitido".

Mocks que podem ser removidos:

- card de documento aguardando contrato backend;
- qualquer fallback visual baseado apenas no template `BUDGET`;
- qualquer download local de PDF.

## Financial Core — Orbit V1

Endpoints reais:

- `GET/POST/PATCH/DELETE /financial/accounts`;
- `GET/POST/PATCH/DELETE /financial/categories`;
- `GET/POST/PATCH /financial/entries`;
- `PATCH /financial/entries/:id/pay`;
- `PATCH /financial/entries/:id/cancel`;
- `GET /financial/stats`;
- `GET /financial/history/:id`.

Tipos principais:

```ts
type FinancialEntryType = 'RECEIVABLE' | 'PAYABLE' | 'TRANSFER';
type FinancialEntryStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'OVERDUE';
type FinancialEntryOrigin = 'MANUAL' | 'BUDGET' | 'PURCHASE' | 'OPERATION' | 'PMOC' | 'OTHER';
```

Observações de UX:

- exibir Financeiro apenas para OWNER/MANAGER;
- usar `/financial/stats` para cards: receber hoje, pagar hoje, atrasados, saldo atual e saldo previsto;
- `totalPages` segue o contrato global;
- lançamento pago é final para a V1;
- Budget aprovado não gera financeiro automaticamente;
- conversão de Budget para lançamento será fluxo manual/futuro usando `origin=BUDGET`.

Mocks que podem ser removidos:

- cards financeiros locais;
- listas locais de contas/categorias;
- cálculo local de saldo atual/projetado.

## Procurement — Compras V1

Endpoints:

- `GET /purchase-orders`;
- `GET /purchase-orders/:id`;
- `POST /purchase-orders`;
- `PATCH /purchase-orders/:id`;
- `PATCH /purchase-orders/:id/send`;
- `PATCH /purchase-orders/:id/cancel`;
- `GET/POST /purchase-orders/:id/items`;
- `PATCH/DELETE /purchase-order-items/:id`;
- `GET/POST /purchase-orders/:id/receipts`;
- `GET /purchase-orders/stats`;
- `GET /purchase-orders/history/:id`.

UX:

- tela de pedidos com filtros por fornecedor/status/período;
- drawer de pedido com abas: itens, recebimentos, histórico;
- recebimento parcial deve permitir múltiplas linhas;
- mostrar progresso por item: recebido/comprado;
- bloquear edição quando status for `RECEIVED` ou `CANCELED`.

Importante:

- não criar estoque local;
- não alterar saldo físico no frontend;
- recebimento chama backend, backend cria `StockMovement(IN)` via Inventory;
- não criar financeiro automático na V1.

## Sprint 19 — comportamento de concorrência para o frontend

O backend agora rejeita com `409` operações que perderem corrida de estado. Isso é intencional e
protege dinheiro, estoque, documentos e histórico.

Implementação esperada no Opus:

- Para ações destrutivas ou finalizadoras, não usar retry automático silencioso.
- Em `409`, fechar loading, exibir toast informativo e refazer `GET` do recurso.
- Se o usuário ainda puder agir após refresh, deixar a ação disponível novamente.

Áreas com refresh obrigatório após conflito:

- Financeiro: Entry detail/list.
- Compras: PurchaseOrder detail, itens e receipts.
- Estoque: Inventory item e Operation materials.
- Assignments: Assignment detail/my list.
- Budgets: Budget detail/history/document.
- Pricing: Product pricing/history.
- DocumentViewer: document metadata antes de novo render/download.

Não há mocks ou contratos novos nesta etapa.

## Sprint 19.5 — provas disponíveis para o frontend

O backend agora possui scripts oficiais para comprovar concorrência real:

- `npm run test:integration`;
- `npm run test:concurrency`.

Esses testes usam PostgreSQL real e `TEST_DATABASE_URL` obrigatório com banco `_test`.

Impacto para Opus:

- manter tratamento de `409` com refresh;
- não adicionar locks locais;
- não implementar retry automático em comandos de compra/estoque/budget/assignment;
- Financial já trata internamente retry seguro de conflito serializável em pagamento/cancelamento.

Na Sprint 19.5, Document Engine failure boundary ainda bloqueava o veredito final; a Sprint 19.6
fecha esse bloqueio.

## Sprint 19.6 — integração após certificação

O bloqueio de Document Engine foi fechado.

Para Opus:

- Remover qualquer fallback local para falha de render; usar retry oficial após refresh.
- Tratar download indisponível como documento não recuperável no momento, sem exibir storage key.
- Pricing adjacency agora é válida quando `validUntil` de um preço é igual ao `validFrom` do próximo.
- Nenhuma nova rota foi criada para o frontend.

Veredito backend de integridade: `ORBIT_BACKEND_INTEGRITY_READY`.

## Sprint 20 — AppSec notes for Opus

No new routes were added.

Payload changes to respect:

- `POST /financial/entries`: never send `status` or `paidAt`.
- Entries are created as `PENDING`; use `/financial/entries/:id/pay` for payment.

Upload UX:

- Organization assets now reject MIME spoofing and active SVG payloads.
- Treat `UPLOAD_INVALID_MIME_TYPE` as a user-facing invalid-file error.
- Do not expose storage keys or use local file paths.

Commercial confidentiality:

- OPERATOR and VIEWER must not see Pricing/Financial/Budget/Procurement navigation or actions.
- Product endpoints remain safe for OPERATOR/VIEWER and do not include Pricing cost/margin fields.

Security regression command available to backend developers:

```bash
TEST_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_security_test?schema=public' npm run test:security
```

## Sprint 20.5 — AppSec closure notes for Opus

No new routes were added.

Asset Lifecycle is now a sanitized public timeline API:

- do not read or expect raw `metadata`;
- do not read or expect `storageKey`;
- do not read or expect attachment `eventId`/`deletedAt`;
- do not display performer e-mail from timeline payloads;
- render cards from `timeline.title`, `timeline.subtitle`, `timeline.description`, `timeline.icon`,
  `timeline.color`, `timeline.badges` and `timeline.references`;
- object URLs in local photo preview flows must be revoked after use.

The closure suite verifies Document Engine, Signatures, Maintenance, PMOC, Asset Lifecycle,
Inventory, Procurement, audit metadata, rate limit and IDOR/BOLA boundaries against the real backend.
## Sprint 22 — production readiness notes for Opus

No business endpoint was added or removed.

For production-like frontend integration, use:

- API base URL: `/api/v1` when served behind the same reverse proxy;
- demo flag: `NEXT_PUBLIC_ENABLE_DEMO=false`;
- metrics endpoint: `GET /api/v1/metrics`;
- health endpoints: `GET /api/v1/health` and `GET /api/v1/health/ready`.

Release validation commands available to the backend package:

```bash
npm run release:smoke:frontend
npm run release:workflows
```

The critical workflow runner validates real API flows for auth, users, customers, equipment/QR,
inventory, pricing, delegated operations, Assignment workflow, Asset Lifecycle, budgets/document
rendering, financial entries and procurement receipts.

Opus/frontend should not depend on Demo Dataset being enabled in production. Demo bridge is now
disabled by default and must be enabled explicitly only in demo/dev environments.

## Sprint 22.5 — Opus external closure notes

No frontend-facing API contract changed.

Operational assumptions for V1:

- one frontend/API deployment per customer installation;
- one database per customer installation;
- one persistent storage scope/path per customer installation;
- no shared application-level multi-tenancy;
- object storage is not certified for V1.

Frontend lockfile supply-chain status:

- `postcss` advisory remediated through targeted override;
- `npm audit --json` reports 0 vulnerabilities after the Sprint 22.5 change.
## Product Backlog Closure 02 — Opus integration notes

Para implementar UX de relatórios:

- use `DocumentViewer` com `source={{ operationId, type }}`;
- use apenas tipos existentes: `WORK_ORDER`, `TECHNICAL_REPORT`, `REPORT`, `PMOC`, `QUOTE`, `RECEIPT`, `BUDGET`;
- para Budget, preserve o fluxo próprio de `/budgets/:id/render` quando estiver na Central Comercial;
- para documentos de Operation, use `/documents/operations/:operationId/:type/*`;
- após render, o documento aparece no histórico oficial de documentos quando o backend criar/atualizar `OperationDocument`.

Limitação V1:

- “Relatório Técnico” e “Laudo” do frontend ainda compartilham `DocumentTemplateType.REPORT`.
- Não criar tipo local novo; se o produto precisar diferenciar ambos, abrir backlog para novo enum/contrato backend.

## Document Semantics Closure — Opus update

A limitação acima foi fechada.

Use:

- `TECHNICAL_REPORT` para Relatório Técnico.
- `TECHNICAL_OPINION` para Laudo Técnico.
- `REPORT` apenas como tipo legado/histórico quando retornado pelo backend.

Na UI:

- “Visualizar modelo” deve usar template preview e ocultar render/download.
- “Pré-visualizar com dados reais” deve exigir Operation e permitir render/download conforme RBAC.

## Product Backlog Closure 03 — Opus integration notes

PDF exports:

```http
GET /operations/export
GET /documents/export
GET /equipments/export
```

- retornam `application/pdf` raw;
- usar `Blob`;
- usar filename de `Content-Disposition` quando existir;
- preservar filtros ativos;
- limite: 500 registros.

Assinaturas:

- `GET /signatures` retorna ativas e inativas, nunca soft-deleted;
- campo de imagem público: `hasImage`;
- não existe `imageStorageKey` no contrato público;
- desenho livre deve virar PNG e ser enviado ao mesmo `POST /signatures/:id/upload`.

## Product Backlog Closure 04 — Avatar Crop e Notifications

Frontend deve usar:

- `POST /users/avatar` para persistir PNG final já recortado;
- `GET /users/me` após upload/remove para sincronizar shell;
- `GET /users/avatar/:id` para render autenticado;
- `GET /notifications/unread-count` para badge;
- `GET /notifications` para painel;
- `PATCH /notifications/:id/read` e `/notifications/read-all` para estados reais.

Não usar storage keys, AuditLog, notificações locais fake ou URLs externas.
# Closure 06 — instruções para Work Order

Para OS, use somente `operationId + WORK_ORDER`. `templateId` é preview estrutural e
`TECHNICAL_REPORT` pertence ao relatório de visita. Depois de qualquer mutation de assinatura,
checklist, observação, foto, material ou estado, recarregue a Operation e renderize novamente.
Download com HTTP 409/`DOCUMENT_STALE` deve mostrar ação de re-renderização.

Datas: `createdAt` é criação; `scheduledFor` é agendamento; nunca faça fallback para `assignedAt`.
# Closure 06.1 — verificação de produto

Verificado em `/operacoes`: colunas Criado/Data do agendamento, seção Datas no drawer e OS real com
assinatura. O PDF usa Noto Sans incorporada e preserva português. Não comparar preview de modelo com
PDF real; para emissão use sempre `operationId + WORK_ORDER`.
