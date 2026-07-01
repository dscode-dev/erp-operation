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
- `metadata`: dados auxiliares, não usar como fonte única de regra visual.

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
