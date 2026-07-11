# API Contracts

## Product Backlog Closure 06.1 — runtime-confirmed contracts

`GET /operations` e `GET /operations/:id` retornaram em runtime `createdAt` e `scheduledFor`.
`scheduledFor` permanece o campo canônico; `null` significa “Não agendado”.

Preview e render de OS usam o mesmo tipo/template/componentes. Download continua retornando
`409 DOCUMENT_STALE` após mudança semântica e funciona após re-render explícito. O formato HTTP do
PDF não mudou; somente o binário passou a incorporar fonte Unicode e apresentação equivalente.

## Product Backlog Closure 06 — current Work Order contract

Contratos existentes preservados:

- `GET /documents/operations/:operationId/WORK_ORDER/preview` retorna o blueprint atual e
  `metadata.sourceFingerprint`.
- `POST /documents/operations/:operationId/WORK_ORDER/render` sempre reconstrói a fonte atual e
  persiste `renderMetadata.sourceFingerprint`.
- `GET /documents/:documentId/download` retorna `409 DOCUMENT_STALE` quando a fonte atual diverge do
  último render (ou o render legado não possui fingerprint). `error.details.rerenderRequired = true`.
- `PATCH /operations/:id` só conclui depois de persistir a mutation e processar evidências; retorna a
  `OperationDetail` recarregada.

`OperationSummary` e `OperationDetail` mantêm campos temporais distintos:

```json
{
  "createdAt": "2026-07-11T10:00:00.000Z",
  "scheduledFor": "2026-07-12T13:00:00.000Z",
  "startedAt": null,
  "completedAt": null,
  "signedAt": null
}
```

`scheduledFor: null` significa explicitamente que a Operation não está agendada.

## Product Backlog Closure 05 — Document preview/render consistency

Contratos HTTP preservados. Nenhum endpoint novo foi criado e nenhum payload público obrigatório foi
alterado.

Impacto nos contratos existentes do Document Engine:

- `GET /documents/operations/:operationId/:type/preview`
- `POST /documents/operations/:operationId/:type/render`
- `GET /documents/:documentId/preview`
- `POST /documents/:documentId/render`
- `GET /documents/:documentId/download`

Quando a Operation possuir assinatura de execução válida (`signatureData` + `signedAt`) e o tipo
documental aceitar assinatura operacional, o blueprint retornará um componente:

```json
{
  "kind": "signature",
  "mode": "COLLECTED",
  "signatures": [
    {
      "id": "collected-signature",
      "role": "collected",
      "label": "Assinatura do cliente/responsável",
      "name": null,
      "title": null,
      "signedAt": "2026-07-10T12:00:00.000Z",
      "caption": "Assinatura coletada na execução",
      "image": {
        "mimeType": "image/png",
        "fileSize": 1024,
        "contentBase64": "..."
      }
    }
  ]
}
```

Tipos com assinatura operacional automática quando há execução assinada:

- `WORK_ORDER`
- `TECHNICAL_REPORT`
- `REPORT`
- `RECEIPT`

`QUOTE`, `BUDGET`, `PMOC` e `TECHNICAL_OPINION` continuam dependendo apenas da configuração
documental do template.

`Operation.signatureData` na criação continua sendo opcional, mas quando informado deve ser
`data:image/png;base64,...` ou `data:image/jpeg;base64,...`; binários inválidos retornam
`400 OPERATION_PHOTO_INVALID`.

## Product Backlog Closure 05.1 — Operation evidence update

`PATCH /operations/:id` foi estendido, sem novo domínio, para persistir evidências oficiais de uma
Operation já existente.

Payload adicional opcional:

```json
{
  "observations": "Serviço executado conforme checklist.",
  "checklist": [
    { "label": "Teste de funcionamento", "done": true, "note": "Operação normal" }
  ],
  "signatureData": "data:image/png;base64,...",
  "signedAt": "2026-07-10T12:00:00.000Z",
  "photos": [
    {
      "dataUrl": "data:image/jpeg;base64,...",
      "caption": "Condensadora após manutenção"
    }
  ]
}
```

Regras:

- `signatureData` aceita apenas PNG/JPEG data URL válido.
- `photos[].dataUrl` aceita apenas PNG/JPEG data URL válido.
- Fotos são armazenadas via StorageProvider e retornam somente metadados públicos.
- `storageKey` nunca é retornado.
- A resposta segue `OperationDetail` existente.

## Conventions

- Base path: `/api/v1`
- Media type JSON: `application/json`
- Upload de assets: `multipart/form-data`
- Datas: ISO 8601 UTC.
- Campos JSON: `camelCase`.
- Toda resposta inclui `X-Request-Id`.
- Endpoints protegidos usam `Authorization: Bearer <accessToken>`.

### Success envelope

```json
{
  "success": true,
  "data": {}
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Use `error.code` para lógica de cliente. Mensagens podem mudar sem quebra de contrato.

## Common protected errors

| HTTP | Code                       | Condition                              |
| ---- | -------------------------- | -------------------------------------- |
| 401  | `UNAUTHORIZED`             | Bearer token ausente/malformado        |
| 401  | `AUTH_INVALID_TOKEN`       | Access token inválido ou expirado      |
| 401  | `AUTH_SESSION_REVOKED`     | Sessão rotacionada, revogada ou expira |
| 401  | `AUTH_USER_INACTIVE`       | Usuário desativado                     |
| 403  | `FORBIDDEN`                | Papel sem permissão                    |
| 403  | `PASSWORD_CHANGE_REQUIRED` | Conta ainda usa senha temporária       |
| 429  | `RATE_LIMIT_EXCEEDED`      | Limite global excedido                 |

## Standard pagination contract

Sprint 14.5 consolidou a semântica de paginação para todas as listagens paginadas do backend.

Query params padrão:

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `page` | number | `1` | inteiro positivo, mínimo `1` |
| `limit` | number | `20` | inteiro positivo, máximo definido pelo DTO do módulo, normalmente `100` |

Response padrão:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 1
    }
  }
}
```

Regras:

- `totalPages` nunca deve ser menor que `1`;
- filtros e ordenação específicos de cada domínio preservam nomes já documentados;
- payloads enriquecidos podem adicionar campos irmãos de `items` e `pagination`, como
  `timelineGroups`, sem alterar a semântica da paginação.

## Authentication model

- Access token: JWT HS256, padrão de 900 segundos.
- Refresh token: JWT HS256, padrão de 2.592.000 segundos.
- Refresh tokens são single-use.
- Rotação ou logout invalidam imediatamente o access token vinculado à sessão anterior.

## Auth endpoints

Contratos preservados da Sprint 1:

### POST `/api/v1/auth/login`

Request:

```json
{
  "email": "owner@example.com",
  "password": "user-supplied-password"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": 900
  }
}
```

Erros principais: `VALIDATION_ERROR`, `AUTH_INVALID_CREDENTIALS`, `AUTH_USER_INACTIVE`,
`RATE_LIMIT_EXCEEDED`.

### POST `/api/v1/auth/refresh`

Request:

```json
{
  "refreshToken": "<current-refresh-jwt>"
}
```

Response 200: novo `accessToken`, novo `refreshToken`, `expiresIn`.

Erros principais: `VALIDATION_ERROR`, `AUTH_INVALID_TOKEN`, `AUTH_SESSION_REVOKED`,
`RATE_LIMIT_EXCEEDED`.

### POST `/api/v1/auth/logout`

Request:

```json
{
  "refreshToken": "<current-refresh-jwt>"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

### GET `/api/v1/auth/me`

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "f33e0c47-1cb8-4bc9-b4c7-97356ff8749e",
    "email": "owner@example.com",
    "username": "daniel",
    "name": "Daniel",
    "role": "OWNER",
    "isActive": true
  }
}
```

## Health

### GET `/api/v1/health`

Public.

Response 200:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 124.199,
    "timestamp": "2026-06-23T17:44:58.554Z",
    "database_connection": "connected"
  }
}
```

Response 503:

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "uptime": 130.412,
    "timestamp": "2026-06-23T17:45:00.000Z",
    "database_connection": "disconnected"
  }
}
```

### GET `/api/v1/health/live`

Public. Liveness leve para orquestradores. Não consulta banco nem storage.

Response 200:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 124.199,
    "timestamp": "2026-07-06T12:41:18.702Z",
    "version": "0.1.0"
  }
}
```

### GET `/api/v1/health/ready`

Public. Readiness de produção local/staging. Verifica conexão com PostgreSQL e disponibilidade do
storage configurado.

Response 200:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 124.199,
    "timestamp": "2026-07-06T12:41:18.702Z",
    "database_connection": "connected",
    "storage_connection": "available",
    "version": "0.1.0"
  }
}
```

Response 503:

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "uptime": 130.412,
    "timestamp": "2026-07-06T12:45:00.000Z",
    "database_connection": "disconnected",
    "storage_connection": "unavailable",
    "version": "0.1.0"
  }
}
```

### GET `/api/v1/metrics`

Public para ambiente interno/orquestrador. Retorna `text/plain; version=0.0.4` no formato
Prometheus e não usa o envelope JSON global.

Exemplo parcial:

```text
# HELP orbit_process_uptime_seconds Process uptime in seconds.
# TYPE orbit_process_uptime_seconds gauge
orbit_process_uptime_seconds 124.199
# HELP orbit_http_requests_total Total HTTP requests.
# TYPE orbit_http_requests_total counter
orbit_http_requests_total{method="GET",route="/api/v1/health/ready",status="200"} 1
```

Métricas expostas não incluem payloads, tokens, e-mails, nomes de clientes ou identificadores
fornecidos via query string.

## Organization

Permissions:

- `OWNER`: leitura e escrita.
- `MANAGER`: somente leitura.
- `OPERATOR` e `VIEWER`: sem acesso.

### GET `/api/v1/organization`

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
    "legalName": "ERP Operation",
    "tradeName": "ERP Operation",
    "cnpj": "00.000.000/0001-00",
    "email": "contato@example.com",
    "phone": "+55 00 00000-0000",
    "city": "Recife",
    "state": "PE",
    "primaryColor": "#0F172A",
    "secondaryColor": "#2563EB",
    "segment": "HVAC",
    "isActive": true,
    "createdAt": "2026-06-23T17:45:00.000Z",
    "updatedAt": "2026-06-23T17:45:00.000Z"
  }
}
```

Errors: common protected errors, `ORGANIZATION_NOT_FOUND`.

### PATCH `/api/v1/organization`

Role: `OWNER`.

Request: todos os campos são opcionais; campos extras são rejeitados.

```json
{
  "legalName": "Empresa Exemplo LTDA",
  "tradeName": "Empresa Exemplo",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@empresa.com",
  "phone": "+55 81 99999-9999",
  "city": "Recife",
  "state": "PE",
  "primaryColor": "#111827",
  "secondaryColor": "#2563EB",
  "segment": "HVAC",
  "isActive": true
}
```

Response 200: objeto `Organization` atualizado.

Errors:

| HTTP | Code                     | Condition                   |
| ---- | ------------------------ | --------------------------- |
| 400  | `VALIDATION_ERROR`       | Payload inválido            |
| 404  | `ORGANIZATION_NOT_FOUND` | Seed organizacional ausente |
| 403  | `FORBIDDEN`              | Não-OWNER tentando escrever |

## Organization settings

### GET `/api/v1/organization/settings`

Roles: `OWNER`, `MANAGER`.

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "6bed5b82-0e9e-4f3e-94d0-e2f8e08c6e9c",
    "organizationId": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
    "language": "pt-BR",
    "timezone": "America/Recife",
    "currency": "BRL",
    "documentPrefix": "ERP",
    "createdAt": "2026-06-23T17:45:00.000Z",
    "updatedAt": "2026-06-23T17:45:00.000Z"
  }
}
```

### PATCH `/api/v1/organization/settings`

Role: `OWNER`.

Request:

```json
{
  "language": "pt-BR",
  "timezone": "America/Recife",
  "currency": "BRL",
  "documentPrefix": "ERP"
}
```

Response 200: objeto `OrganizationSettings` atualizado.

Errors: common protected errors, `VALIDATION_ERROR`, `ORGANIZATION_NOT_FOUND`.

## Document templates

`type` é um de:

- `QUOTE`
- `WORK_ORDER`
- `RECEIPT`
- `REPORT`
- `TECHNICAL_REPORT`
- `PMOC`

### GET `/api/v1/organization/templates`

Roles: `OWNER`, `MANAGER`.

Response 200:

```json
{
  "success": true,
  "data": [
    {
      "id": "f38b0b79-5c79-4f74-8d66-e6f3f77ad9aa",
      "organizationId": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
      "type": "QUOTE",
      "name": "Orçamento padrão",
      "headerContent": "",
      "footerContent": "",
      "observations": "",
      "isDefault": true,
      "isSystem": true,
      "isActive": true,
      "requiresSignature": false,
      "signatureMode": "NONE",
      "signatureId": null,
      "createdAt": "2026-06-23T17:45:00.000Z",
      "updatedAt": "2026-06-23T17:45:00.000Z"
    }
  ]
}
```

### POST `/api/v1/organization/templates`

Role: `OWNER`.

Request:

```json
{
  "type": "QUOTE",
  "name": "Orçamento com cabeçalho comercial",
  "headerContent": "<p>Conteúdo livre controlado pelo frontend</p>",
  "footerContent": "",
  "observations": "",
  "isDefault": false,
  "isActive": true,
  "requiresSignature": true,
  "signatureMode": "FIXED",
  "signatureId": "7198f91a-418f-4c3d-b8db-4ff7f8a9c0b1"
}
```

Response 201: objeto `DocumentTemplate` criado. `isActive` é opcional (default `true`)
e habilita o controle de ativar/desativar modelos.

Configuração de assinatura:

- `signatureMode`: `NONE`, `FIXED`, `COLLECTED` ou `HYBRID`;
- `NONE`: `requiresSignature=false` e `signatureId=null`;
- `FIXED` e `HYBRID`: exigem `requiresSignature=true` e `signatureId` de uma assinatura ativa;
- `COLLECTED`: exige `requiresSignature=true` e não usa `signatureId`.

### PATCH `/api/v1/organization/templates/:id`

Role: `OWNER`. `:id` deve ser UUID v4.

Request: todos os campos são opcionais.

```json
{
  "name": "Orçamento padrão atualizado",
  "observations": "Validade de 7 dias",
  "isDefault": true,
  "isActive": false,
  "signatureMode": "COLLECTED",
  "requiresSignature": true,
  "signatureId": null
}
```

Response 200: objeto `DocumentTemplate` atualizado. `isActive` controla ativar/desativar o modelo.

### DELETE `/api/v1/organization/templates/:id`

Role: `OWNER`. `:id` deve ser UUID v4.

Response 200:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

Errors para templates:

| HTTP | Code                        | Condition                                  |
| ---- | --------------------------- | ------------------------------------------ |
| 400  | `VALIDATION_ERROR`          | Body ou UUID inválido                      |
| 404  | `NOT_FOUND`                 | Template inexistente na organização        |
| 403  | `FORBIDDEN`                 | Papel sem permissão                        |
| 409  | `SYSTEM_TEMPLATE_PROTECTED` | Tentativa de excluir template do sistema   |
| 409  | `SIGNATURE_INACTIVE`        | Template apontando para assinatura inativa |
| 404  | `SIGNATURE_NOT_FOUND`       | `signatureId` inexistente                  |

Quando `isDefault=true`, templates anteriores do mesmo `type` são marcados como não-default.
Templates criados pela API recebem `isSystem=false`. Templates com `isSystem=true` podem ser
editados, mas não excluídos.

## Document configuration

Sprint 7 cria a camada de consulta centralizada para configuração documental. O frontend pode usar
estes endpoints para montar telas de configuração e inspecionar o comportamento efetivo de cada
tipo de documento.

Permissões: `OWNER`, `MANAGER` e `VIEWER`. `OPERATOR` não acessa.

### GET `/api/v1/documents/configuration`

Response 200:

```json
{
  "success": true,
  "data": [
    {
      "type": "WORK_ORDER",
      "organization": {
        "id": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
        "legalName": "ERP Operation",
        "tradeName": "ERP Operation",
        "cnpj": "00.000.000/0001-00",
        "email": "contato@example.com",
        "phone": "+55 81 99999-9999",
        "city": "Recife",
        "state": "PE",
        "primaryColor": "#111827",
        "secondaryColor": "#2563EB"
      },
      "settings": {
        "id": "22ae5a08-04db-4ad0-b49e-311230fb5991",
        "language": "pt-BR",
        "timezone": "America/Recife",
        "currency": "BRL",
        "documentPrefix": "ERP"
      },
      "defaultTemplate": {
        "id": "f38b0b79-5c79-4f74-8d66-e6f3f77ad9aa",
        "type": "WORK_ORDER",
        "name": "Ordem de serviço padrão",
        "isDefault": true,
        "isSystem": true,
        "isActive": true,
        "requiresSignature": false,
        "signatureMode": "NONE",
        "signatureId": null,
        "signature": null
      },
      "templates": []
    }
  ]
}
```

### GET `/api/v1/documents/configuration/types/:type`

`:type` deve ser `QUOTE`, `WORK_ORDER`, `RECEIPT`, `REPORT`, `TECHNICAL_REPORT` ou `PMOC`.

Response 200: mesmo objeto de configuração para um único tipo.

### GET `/api/v1/documents/configuration/templates/:templateId`

`:templateId` deve ser UUID v4.

Response 200: configuração completa do tipo ao qual o template pertence.

Erros: common protected errors, `VALIDATION_ERROR`, `NOT_FOUND`, `ORGANIZATION_NOT_FOUND`.

## Signatures

Domínio de assinaturas cadastra assinaturas fixas reutilizáveis por templates. Imagens ficam no
StorageProvider; o backend mantém a storage key apenas internamente. O contrato público retorna
`hasImage` e nunca expõe `imageStorageKey`.

Permissões:

- `OWNER`: criar, editar, upload, soft delete, listar e baixar;
- `MANAGER`: listar, detalhar e baixar;
- `VIEWER`: listar, detalhar e baixar;
- `OPERATOR`: sem acesso.

### GET `/api/v1/signatures`

Query:

- `page` default `1`;
- `limit` default `20`, máximo `100`;
- `search` opcional;
- `active` opcional.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "7198f91a-418f-4c3d-b8db-4ff7f8a9c0b1",
        "name": "Responsável Técnico",
        "title": "Eng. Mecânico CREA 000000",
        "hasImage": true,
        "mimeType": "image/png",
        "originalFileName": "assinatura.png",
        "fileSize": 18432,
        "active": true,
        "deletedAt": null,
        "createdAt": "2026-06-29T15:00:00.000Z",
        "updatedAt": "2026-06-29T15:02:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### GET `/api/v1/signatures/:id`

Response 200: objeto `Signature`.

### POST `/api/v1/signatures`

Role: `OWNER`.

```json
{
  "name": "Responsável Técnico",
  "title": "Eng. Mecânico CREA 000000",
  "active": true
}
```

Response 201: objeto `Signature`.

### PATCH `/api/v1/signatures/:id`

Role: `OWNER`. Campos opcionais: `name`, `title`, `active`.

### DELETE `/api/v1/signatures/:id`

Role: `OWNER`. Soft delete (`active=false`).

Response 200:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### POST `/api/v1/signatures/:id/upload`

Role: `OWNER`. `multipart/form-data` com campo `file`.

Regras:

- formatos permitidos: PNG, JPG, JPEG;
- tamanho máximo: 2 MiB;
- valida MIME, extensão e assinatura binária;
- nome original é sanitizado;
- storage key é gerada pelo backend.

Response 201: objeto `Signature` atualizado.

### GET `/api/v1/signatures/:id/download`

Roles: `OWNER`, `MANAGER`, `VIEWER`.

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "7198f91a-418f-4c3d-b8db-4ff7f8a9c0b1",
    "name": "Responsável Técnico",
    "title": "Eng. Mecânico CREA 000000",
    "mimeType": "image/png",
    "fileSize": 18432,
    "active": true,
    "contentBase64": "iVBORw0KGgoAAA..."
  }
}
```

Erros:

| HTTP | Code                       | Condition                           |
| ---- | -------------------------- | ----------------------------------- |
| 400  | `VALIDATION_ERROR`         | Body, query ou UUID inválido        |
| 400  | `SIGNATURE_IMAGE_REQUIRED` | Upload ausente                      |
| 400  | `UPLOAD_FILE_TOO_LARGE`    | Arquivo vazio ou acima de 2 MiB     |
| 400  | `UPLOAD_INVALID_MIME_TYPE` | MIME/binário incompatível           |
| 400  | `UPLOAD_INVALID_EXTENSION` | Extensão não permitida              |
| 403  | `FORBIDDEN`                | Papel sem permissão                 |
| 404  | `SIGNATURE_NOT_FOUND`      | Assinatura inexistente              |
| 409  | `SIGNATURE_IMAGE_REQUIRED` | Download solicitado antes do upload |

## Brand assets

`type` é um de:

- `LOGO`
- `HEADER`
- `FOOTER`

### POST `/api/v1/organization/assets`

Role: `OWNER`.

Content-Type: `multipart/form-data`

Campos:

- `type`: `LOGO`, `HEADER` ou `FOOTER`;
- `file`: arquivo.

Regras:

- tamanho máximo: 5 MiB;
- extensões permitidas: `png`, `jpg`, `jpeg`, `svg`, `pdf`;
- MIME types permitidos: `image/png`, `image/jpeg`, `image/svg+xml`, `application/pdf`.

Response 201:

```json
{
  "success": true,
  "data": {
    "id": "ec60c6ae-391b-40d8-80e1-2d850a4d931b",
    "organizationId": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
    "type": "LOGO",
    "storageKey": "organization/logo/b3f0f7e4-5802-40e6-b346-4d42adf67143.png",
    "mimeType": "image/png",
    "originalFileName": "logo.png",
    "fileSize": 8,
    "createdAt": "2026-06-23T17:45:00.000Z"
  }
}
```

### GET `/api/v1/organization/assets/:id`

Roles: `OWNER`, `MANAGER`. `:id` deve ser UUID v4.

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "ec60c6ae-391b-40d8-80e1-2d850a4d931b",
    "organizationId": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
    "type": "LOGO",
    "storageKey": "organization/logo/b3f0f7e4-5802-40e6-b346-4d42adf67143.png",
    "mimeType": "image/png",
    "originalFileName": "logo.png",
    "fileSize": 8,
    "createdAt": "2026-06-23T17:45:00.000Z",
    "contentBase64": "iVBORw0KGgo="
  }
}
```

O frontend pode montar uma data URL:

```text
data:<mimeType>;base64,<contentBase64>
```

### DELETE `/api/v1/organization/assets/:id`

Role: `OWNER`. `:id` deve ser UUID v4.

Response 200:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

Errors para assets:

| HTTP | Code                       | Condition                        |
| ---- | -------------------------- | -------------------------------- |
| 400  | `VALIDATION_ERROR`         | `type` ou UUID inválido          |
| 400  | `UPLOAD_FILE_REQUIRED`     | Campo `file` ausente             |
| 400  | `UPLOAD_FILE_TOO_LARGE`    | Arquivo maior que 5 MiB          |
| 400  | `UPLOAD_INVALID_MIME_TYPE` | MIME type não permitido          |
| 400  | `UPLOAD_INVALID_EXTENSION` | Extensão não permitida           |
| 404  | `NOT_FOUND`                | Asset inexistente no banco       |
| 404  | `STORAGE_FILE_NOT_FOUND`   | Registro existe, arquivo ausente |
| 403  | `FORBIDDEN`                | Papel sem permissão              |

## Users and team

### Access matrix

| Operation                          | OWNER | MANAGER | OPERATOR | VIEWER |
| ---------------------------------- | ----- | ------- | -------- | ------ |
| List/get team                      | Sim   | Sim     | Não      | Sim    |
| Create/update/disable/delete/reset | Sim   | Não     | Não      | Não    |
| Own profile/preferences/password   | Sim   | Sim     | Sim      | Sim    |
| Own avatar                         | Sim   | Sim     | Sim      | Sim    |

### User object

```json
{
  "id": "6c9f1fc4-8bfd-4873-b068-b1bc834fef12",
  "email": "manager@example.com",
  "username": "manager",
  "name": "Manager Teste",
  "role": "MANAGER",
  "avatarAssetId": null,
  "phone": "+55 81 99999-9999",
  "jobTitle": "Supervisor",
  "notes": null,
  "mustChangePassword": true,
  "isActive": true,
  "disabledAt": null,
  "lastLoginAt": null,
  "createdAt": "2026-06-24T12:00:00.000Z",
  "updatedAt": "2026-06-24T12:00:00.000Z",
  "permission": {
    "canFinancial": false,
    "canUsers": false,
    "canReports": true,
    "canSchedules": true,
    "canTemplates": false
  },
  "preferences": {
    "id": "6c5b5034-a180-44d5-9198-cab4589a8043",
    "userId": "6c9f1fc4-8bfd-4873-b068-b1bc834fef12",
    "theme": "SYSTEM",
    "notificationsEnabled": true,
    "createdAt": "2026-06-24T12:00:00.000Z",
    "updatedAt": "2026-06-24T12:00:00.000Z"
  }
}
```

Passwords and hashes never appear inside the user object.

### GET `/api/v1/users`

Roles: `OWNER`, `MANAGER`, `VIEWER`.

Query:

- `page`: integer >= 1, default `1`;
- `limit`: integer from 1 to 100, default `20`;
- `search`: optional, searches name, email, username, phone and job title.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### GET `/api/v1/users/:id`

Roles: `OWNER`, `MANAGER`, `VIEWER`. `:id` is UUID v4.

Response 200: User object.

Errors: `VALIDATION_ERROR`, `USER_NOT_FOUND`, common protected errors.

### POST `/api/v1/users`

Role: `OWNER`.

Request:

```json
{
  "email": "manager@example.com",
  "username": "manager",
  "name": "Manager Teste",
  "role": "MANAGER",
  "phone": "+55 81 99999-9999",
  "jobTitle": "Supervisor",
  "notes": "Internal administrative note",
  "permissions": {
    "canFinancial": false,
    "canUsers": false,
    "canReports": true,
    "canSchedules": true,
    "canTemplates": false
  }
}
```

Response 201:

```json
{
  "success": true,
  "data": {
    "user": {},
    "temporaryPassword": "<shown-once-random-password>"
  }
}
```

The password is generated by the backend, is not logged, and is returned only in this response.
The created user has `mustChangePassword=true`.

Errors:

| HTTP | Code               | Condition                      |
| ---- | ------------------ | ------------------------------ |
| 400  | `VALIDATION_ERROR` | Invalid payload                |
| 409  | `USER_CONFLICT`    | Email or username already used |
| 403  | `FORBIDDEN`        | Actor is not OWNER             |

### PATCH `/api/v1/users/:id`

Role: `OWNER`.

Request: partial form of the create payload. Password, active status and `mustChangePassword`
cannot be changed here.

Response 200: updated User object.

Additional error: `USER_LAST_OWNER` when attempting to demote the last active OWNER.

### DELETE `/api/v1/users/:id`

Role: `OWNER`. Performs soft delete.

Response 200:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

The user remains queryable with `isActive=false` and `disabledAt` populated. Active sessions are
revoked.

Errors: `USER_NOT_FOUND`, `USER_SELF_ACTION_FORBIDDEN`, `USER_LAST_OWNER`.

### PATCH `/api/v1/users/:id/disable`

Role: `OWNER`. No body.

Response 200: User object with `isActive=false` and `disabledAt` populated. Sessions are revoked.

### PATCH `/api/v1/users/:id/enable`

Role: `OWNER`. No body.

Response 200: User object with `isActive=true` and `disabledAt=null`.

### PATCH `/api/v1/users/:id/reset-password`

Role: `OWNER`. No body.

Response 200:

```json
{
  "success": true,
  "data": {
    "userId": "6c9f1fc4-8bfd-4873-b068-b1bc834fef12",
    "temporaryPassword": "<shown-once-random-password>",
    "mustChangePassword": true
  }
}
```

All existing sessions for the target user are revoked.

### PATCH `/api/v1/users/change-password`

All authenticated roles, own account.

Request:

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password-with-at-least-12-characters"
}
```

Response 200:

```json
{
  "success": true,
  "data": {
    "changed": true,
    "reauthenticationRequired": true
  }
}
```

All sessions, including the current one, are revoked. The client must clear tokens and log in
again.

Errors:

| HTTP | Code                         | Condition                       |
| ---- | ---------------------------- | ------------------------------- |
| 400  | `PASSWORD_CURRENT_INVALID`   | Current password does not match |
| 400  | `PASSWORD_REUSE_NOT_ALLOWED` | New password equals current one |
| 400  | `VALIDATION_ERROR`           | Password shorter than 12 chars  |

### GET `/api/v1/users/me`

All authenticated roles. Allowed while password change is required.

Response 200:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6c9f1fc4-8bfd-4873-b068-b1bc834fef12",
      "email": "manager@example.com",
      "username": "manager",
      "name": "Manager Teste",
      "avatarAssetId": null,
      "phone": "+55 81 99999-9999",
      "jobTitle": "Supervisor",
      "role": "MANAGER",
      "isActive": true,
      "mustChangePassword": false
    },
    "organization": {
      "id": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
      "legalName": "Empresa Exemplo LTDA",
      "tradeName": "Empresa Exemplo",
      "segment": "HVAC",
      "primaryColor": "#111827",
      "secondaryColor": "#2563EB",
      "isActive": true
    },
    "role": "MANAGER",
    "permissions": {
      "canFinancial": false,
      "canUsers": false,
      "canReports": true,
      "canSchedules": true,
      "canTemplates": false
    },
    "preferences": {
      "id": "6c5b5034-a180-44d5-9198-cab4589a8043",
      "userId": "6c9f1fc4-8bfd-4873-b068-b1bc834fef12",
      "theme": "DARK",
      "notificationsEnabled": false,
      "createdAt": "2026-06-24T12:00:00.000Z",
      "updatedAt": "2026-06-24T12:00:00.000Z"
    }
  }
}
```

### GET `/api/v1/users/me/preferences`

All authenticated roles, own account.

Response 200: preferences object. `theme` is `SYSTEM`, `LIGHT` or `DARK`.

### PATCH `/api/v1/users/me/preferences`

Request:

```json
{
  "theme": "DARK",
  "notificationsEnabled": false
}
```

Response 200: updated preferences.

No language or locale property exists in V1.

## User avatar

### POST `/api/v1/users/avatar`

All authenticated roles, own account. `multipart/form-data`, field `file`.

Rules:

- maximum 2 MiB;
- extensions `png`, `jpg`, `jpeg`;
- MIME `image/png` or `image/jpeg`;
- PNG/JPEG binary signature must match the declared MIME.

Response 201:

```json
{
  "success": true,
  "data": {
    "id": "406aa7f1-f008-470a-a99d-a8998780635c",
    "storageKey": "users/avatar/08e2664f-fba5-448f-83fa-16e23335aca1.png",
    "mimeType": "image/png",
    "originalFileName": "avatar.png",
    "fileSize": 182034,
    "createdAt": "2026-06-24T12:00:00.000Z"
  }
}
```

Uploading a new avatar replaces the previous one.

### GET `/api/v1/users/avatar/:id`

All authenticated roles. `:id` is the `avatarAssetId`.

Response 200: avatar metadata plus `contentBase64`.

### DELETE `/api/v1/users/avatar`

All authenticated roles, own avatar.

Response 200:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

Deletion is idempotent when the user has no avatar.

## Team-specific errors

| HTTP | Code                         | Frontend meaning                       |
| ---- | ---------------------------- | -------------------------------------- |
| 403  | `PASSWORD_CHANGE_REQUIRED`   | Redirect to mandatory password screen  |
| 404  | `USER_NOT_FOUND`             | User does not exist                    |
| 409  | `USER_CONFLICT`              | Email/username already exists          |
| 409  | `USER_LAST_OWNER`            | Protected last active OWNER            |
| 409  | `USER_SELF_ACTION_FORBIDDEN` | OWNER tried to disable/delete self     |
| 400  | `UPLOAD_INVALID_MIME_TYPE`   | Invalid or forged avatar content       |
| 400  | `UPLOAD_INVALID_EXTENSION`   | Avatar extension not allowed           |
| 413  | `UPLOAD_FILE_TOO_LARGE`      | Multipart exceeded the hard size limit |

## Internal demo integration

These endpoints are not production domain contracts. They exist only when:

- `NODE_ENV=development`;
- `ENABLE_DEMO_DATA=true`;
- `ENABLE_DEMO_ENDPOINTS=true`;
- caller is authenticated as `OWNER`.

Otherwise they return HTTP 404 `DEMO_ENDPOINT_DISABLED`. Production configuration rejects enabled
demo flags during startup.

### GET `/api/v1/internal/demo/dataset`

Response 200:

```json
{
  "success": true,
  "data": {
    "demo.dashboard.v1": {
      "generatedAt": "2026-06-24T12:00:00.000Z",
      "counters": {
        "atendimentosHoje": 8,
        "ordensPendentes": 5,
        "operadoresAtivos": 2,
        "servicosEmAndamento": 3
      }
    },
    "demo.schedule.v1": {
      "generatedAt": "2026-06-24T12:00:00.000Z",
      "items": []
    },
    "demo.finance.v1": {
      "generatedAt": "2026-06-24T12:00:00.000Z",
      "currency": "BRL",
      "summary": {
        "entradas": 48750,
        "saidas": 18320,
        "despesas": 7650,
        "projecao30Dias": 62400
      },
      "entries": []
    }
  }
}
```

The actual seed returns populated arrays. `demo.manifest.v1` is never exposed.

### POST `/api/v1/internal/demo/reset`

No request body.

Response 200:

```json
{
  "success": true,
  "data": {
    "reset": true,
    "organization": "preserved",
    "usersCreated": ["ricardo", "joao", "maria", "financeiro"],
    "usersPreserved": ["ninja"],
    "snapshotKeys": ["demo.dashboard.v1", "demo.schedule.v1", "demo.finance.v1"]
  }
}
```

`organization` is `created`, `converted-bootstrap` or `preserved`. Generated passwords are not
returned by HTTP; they are emitted only in the seed execution log.

## Customers

`CustomerType`: `PERSON` ou `COMPANY`. CPF e CNPJ são opcionais; quando informados, são únicos.

RBAC:

- leitura/lista/stats/detalhes/anexo: todos os papéis;
- criação, atualização, enable/disable, addresses e contacts: OWNER/MANAGER;
- soft delete de customer e delete de attachment: OWNER.

### GET `/api/v1/customers`

Query: `page` (default 1), `limit` (default 20, máximo 100), `search` opcional. Busca parcial em
name, tradeName, phone, secondaryPhone, email, cpf e cnpj.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "COMPANY",
        "name": "Hospital Santa Clara",
        "tradeName": "Hospital Santa Clara",
        "cpf": null,
        "cnpj": "27.584.162/0001-08",
        "email": "hospital@demo.example",
        "phone": "+55 81 3030-4040",
        "secondaryPhone": null,
        "notes": null,
        "isActive": true,
        "disabledAt": null,
        "createdAt": "2026-06-24T12:00:00.000Z",
        "updatedAt": "2026-06-24T12:00:00.000Z",
        "_count": { "addresses": 1, "contacts": 1, "attachments": 1 }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### GET `/api/v1/customers/stats`

Response data:

```json
{ "total": 4, "active": 4, "inactive": 0, "people": 0, "companies": 4 }
```

### GET `/api/v1/customers/:id`

Returns the customer with complete `addresses`, `contacts` and attachment metadata arrays.

### POST `/api/v1/customers`

```json
{
  "type": "COMPANY",
  "name": "Hospital Santa Clara",
  "tradeName": "Santa Clara",
  "cnpj": "27.584.162/0001-08",
  "email": "hospital@example.com",
  "phone": "+55 81 3030-4040",
  "secondaryPhone": "+55 81 3030-4041",
  "notes": "Contrato preventivo"
}
```

Response 201: Customer. `cpf`, `cnpj`, `tradeName`, email, phones and notes are optional.

### PATCH `/api/v1/customers/:id`

Partial form of create payload. Response 200: updated Customer.

### DELETE `/api/v1/customers/:id`

OWNER only. Soft delete. Response: `{ "deleted": true }`.

### PATCH `/api/v1/customers/:id/disable` and `/enable`

OWNER/MANAGER. No body. Response: Customer with updated `isActive`/`disabledAt`.

### Addresses

POST `/customers/:id/addresses`:

```json
{
  "name": "Unidade principal",
  "zipCode": "51020-000",
  "street": "Rua das Acácias",
  "number": "120",
  "complement": "Bloco A",
  "district": "Boa Viagem",
  "city": "Recife",
  "state": "PE",
  "isPrimary": true
}
```

PATCH `/customers/:id/addresses/:addressId` accepts partial payload. DELETE returns
`{ "deleted": true }`. Setting `isPrimary=true` clears the previous primary address.

### Contacts

POST `/customers/:id/contacts`:

```json
{
  "name": "Mariana Costa",
  "role": "Engenharia Clínica",
  "phone": "+55 81 99999-0000",
  "email": "mariana@example.com",
  "notes": "",
  "isPrimary": true
}
```

PATCH is partial; DELETE returns `{ "deleted": true }`. Phone and email are optional.

### Attachments

POST `/customers/:id/attachments`, multipart fields:

- `category`: string, 2–80 chars;
- `file`: PDF/PNG/JPG/JPEG, máximo 5 MiB.

GET `/customers/attachments/:attachmentId` returns metadata plus `contentBase64`.
DELETE `/customers/attachments/:attachmentId` is OWNER-only.

Errors:

| HTTP | Code                       | Condition                 |
| ---- | -------------------------- | ------------------------- |
| 404  | `CUSTOMER_NOT_FOUND`       | Customer inexistente      |
| 404  | `NOT_FOUND`                | Sub-recurso inexistente   |
| 409  | `CUSTOMER_CONFLICT`        | CPF/CNPJ já utilizado     |
| 400  | `VALIDATION_ERROR`         | Payload inválido          |
| 400  | `UPLOAD_FILE_REQUIRED`     | Arquivo ausente           |
| 400  | `UPLOAD_INVALID_EXTENSION` | Extensão inválida         |
| 400  | `UPLOAD_INVALID_MIME_TYPE` | MIME/conteúdo inválido    |
| 413  | `UPLOAD_FILE_TOO_LARGE`    | Multipart maior que 5 MiB |

## Equipments

Enums:

- type: `SPLIT`, `CHILLER`, `CONDENSER`, `EVAPORATOR`, `AIR_HANDLER`, `SOLAR_INVERTER`,
  `ELECTRICAL_PANEL`, `GENERATOR`, `OTHER`;
- status: `ACTIVE`, `MAINTENANCE`, `INACTIVE`, `RETIRED`;
- attachment category: `PHOTO`, `MANUAL`, `WARRANTY`, `DOCUMENT`.

### GET `/api/v1/equipments`

Query: `page`, `limit`, `search`, `customerId`, `addressId`, `status`, `type`. Search is partial over
name, tag, serialNumber, model and manufacturer.

Response data: `{ items, pagination }`. Each item includes summarized customer/address and `_count`
for children, attachments and metrics.

### GET `/api/v1/equipments/stats`

```json
{
  "total": 5,
  "active": 4,
  "maintenance": 1,
  "inactive": 0,
  "retired": 0,
  "byType": {
    "SPLIT": 1,
    "CHILLER": 1,
    "CONDENSER": 1,
    "EVAPORATOR": 1,
    "AIR_HANDLER": 0,
    "SOLAR_INVERTER": 1,
    "ELECTRICAL_PANEL": 0,
    "GENERATOR": 0,
    "OTHER": 0
  }
}
```

### POST `/api/v1/equipments`

OWNER/MANAGER:

```json
{
  "customerId": "uuid",
  "addressId": "uuid",
  "parentEquipmentId": null,
  "type": "SPLIT",
  "status": "ACTIVE",
  "name": "Split Samsung 24.000 BTU",
  "tag": "CBV-SPL-001",
  "manufacturer": "Samsung",
  "model": "WindFree 24K",
  "serialNumber": "SN-2026-001",
  "capacity": "24.000 BTU",
  "voltage": "220V",
  "installationDate": "2024-03-15",
  "warrantyExpiration": "2027-03-15",
  "observations": "Unidade da sala 12"
}
```

Response 201 adds UUID `qrToken`, stable `qrCode`, timestamps and state fields. Address and parent
must belong to the selected Customer.

### GET/PATCH/DELETE `/api/v1/equipments/:id`

GET all roles; PATCH OWNER/MANAGER; DELETE OWNER and performs soft delete. Detail includes customer,
address, parent, children, attachment metadata and the 20 latest metrics.

PATCH `/equipments/:id/disable` and `/enable`: OWNER/MANAGER. Disable sets status `INACTIVE`;
enable sets `ACTIVE`.

### Attachments

POST `/equipments/:id/attachments`: OWNER/MANAGER, multipart `category` + `file`, 5 MiB,
PDF/PNG/JPG/JPEG.

GET `/equipments/attachments/:attachmentId`: all roles, metadata plus `contentBase64`.

DELETE `/equipments/attachments/:attachmentId`: OWNER/MANAGER.

### Metrics

POST `/equipments/:id/metrics`: OWNER/MANAGER/OPERATOR.

```json
{ "key": "temperature", "value": 22.4, "unit": "°C", "recordedAt": "2026-06-24T12:00:00Z" }
```

`recordedAt` is optional and defaults to server time.

GET `/equipments/:id/metrics`: all roles, newest first.

DELETE `/equipments/:id/metrics/:metricId`: OWNER/MANAGER.

Errors: `EQUIPMENT_NOT_FOUND`, `EQUIPMENT_ADDRESS_MISMATCH`, `EQUIPMENT_HIERARCHY_INVALID`,
`CUSTOMER_NOT_FOUND`, `NOT_FOUND`, validation/upload/common protected errors.

## Schedule (Agenda)

> Domínio operacional de Agenda é escopo futuro. Hoje o frontend consome o
> snapshot `demo.schedule.v1` via o bridge `/internal/demo/dataset` e aplica o
> filtro de intervalo no cliente. Quando o domínio existir, expor:

```http
GET /api/v1/schedule?from=<ISO>&to=<ISO>
```

Query (todos opcionais; combinam com AND):

- `from` / `to`: intervalo ISO 8601 (inclusive) — usado pela navegação do calendário;
- `month` (1–12) + `year`: alternativa ao intervalo;
- `operatorId`, `customerId`, `status`: filtros;
- `page` / `limit`: paginação quando o volume exigir.

Item (alinhado ao snapshot demo, campos enriquecidos opcionais):

```ts
type ScheduleItem = {
  id: string;
  title: string;
  customer: string; // futuramente customerId + nome
  operator: string; // futuramente operatorId + nome
  startsAt: string; // ISO 8601
  endsAt?: string;
  state: 'OVERDUE' | 'IN_PROGRESS' | 'SCHEDULED' | 'DONE';
  equipment?: string;
  serviceType?: 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'PROJETO';
  notes?: string;
};
```

O calendário mensal consulta o backend a cada navegação (mês/ano/Hoje) usando
`from`/`to` da grade visível (6 semanas). Drag-and-drop, criação e edição
pertencem ao domínio operacional (fora do escopo desta entrega).

## Equipment lookup by QR

### GET `/api/v1/equipments/lookup/:qrCode`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Localiza o equipamento pelo identificador do QR. `:qrCode` deve vir
URL-encoded (o valor inclui `:`, ex.: `equipment%3A<uuid>`). Aceita tanto o
`qrCode` (`equipment:<qrToken>`) quanto o `qrToken`, preparando o terreno para
formatos futuros de QR assinado/tokenizado — sem alterar o formato atual.

Response 200: mesmo payload de `GET /equipments/:id` (equipamento completo com
customer, address, parent, children, attachments e métricas).

Errors:

| HTTP | Code                  | Condition                    |
| ---- | --------------------- | ---------------------------- |
| 400  | `VALIDATION_ERROR`    | QR vazio/ausente             |
| 404  | `EQUIPMENT_NOT_FOUND` | Nenhum equipamento para o QR |

> O formato do QR exibido na Platform não muda; o QR codifica o `qrCode`.

## Operations (domínio operacional central)

Uma `Operation` é o atendimento de campo — fundação reutilizada por todos os
documentos (OS, PMOC, Laudo, Relatório, Orçamento, Recibo). Toda OS nasce de uma
Operation. Ao criar uma Operation, o backend gera automaticamente um
`OperationDocument` do tipo `WORK_ORDER` em `DRAFT`, com número derivado do número
sequencial da operação (`OS-000001`).

| Método | Rota                          | Roles                         | Descrição                                                                                  |
| ------ | ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/operations`                 | OWNER/MANAGER/OPERATOR/VIEWER | Lista paginada. Filtros: `page,limit,search,customerId,equipmentId,operatorId,type,status` |
| GET    | `/operations/stats`           | OWNER/MANAGER/OPERATOR/VIEWER | `{ total, byStatus }`                                                                      |
| GET    | `/operations/:id`             | OWNER/MANAGER/OPERATOR/VIEWER | Detalhe (customer, address, equipment, operator, checklist, photos, documents, signature)  |
| GET    | `/operations/photos/:photoId` | OWNER/MANAGER/OPERATOR/VIEWER | Foto em base64 (`{ mimeType, contentBase64, ... }`)                                        |
| POST   | `/operations`                 | OWNER/MANAGER/OPERATOR        | Cria a Operation + OS rascunho. OWNER/MANAGER podem delegar via `operatorId`; OPERATOR sempre cria para si |
| PATCH  | `/operations/:id`             | OWNER/MANAGER/OPERATOR        | Atualiza status/datas/checklist/observações                                                |

`POST /operations` (body):

```jsonc
{
  "customerId": "<uuid>", // obrigatório
  "addressId": "<uuid>", // opcional (deve pertencer ao cliente)
  "equipmentId": "<uuid>", // opcional (deve pertencer ao cliente)
  "operatorId": "<uuid>", // opcional; delegação permitida apenas para OWNER/MANAGER
  "type": "PREVENTIVA", // PREVENTIVA|CORRETIVA|INSTALACAO|PROJETO
  "status": "COMPLETED", // opcional, default DRAFT
  "startedAt": "<iso>",
  "completedAt": "<iso>",
  "checklist": [{ "label": "…", "done": true, "note": null }],
  "observations": "…",
  "signatureData": "data:image/png;base64,…", // texto (data URL)
  "signedAt": "<iso>",
  "photos": [{ "dataUrl": "data:image/jpeg;base64,…", "caption": "…" }],
}
```

Delegação: `OWNER` e `MANAGER` podem informar `operatorId`. Se omitido, o backend
usa o usuário autenticado. `OPERATOR` não delega: mesmo enviando `operatorId`, a
operação é atribuída ao próprio usuário autenticado e o campo enviado é ignorado
após validação de UUID. O operador informado precisa existir, estar ativo, não
estar desativado e possuir perfil operacional (`OWNER`, `MANAGER` ou `OPERATOR`).
Como a instalação é single-company, a validação de organização é garantida pelo
banco isolado da empresa; não há atribuição cross-tenant.

Fotos: PNG/JPEG (data URL), máx. 16 por operação, 5 MiB cada; persistidas via
storage provider. Assinatura: data URL armazenada como texto.

Errors: `CUSTOMER_NOT_FOUND` (404), `VALIDATION_ERROR` (400, endereço/equipamento
fora do cliente), `OPERATION_PHOTO_INVALID` (400), `OPERATION_NOT_FOUND` (404),
`OPERATION_PHOTO_NOT_FOUND` (404), `OPERATION_OPERATOR_INVALID` (400, operador
delegado inexistente, inativo, desativado ou sem perfil operacional).

Migration: `20260627150000_operation_domain_foundation` (tabelas `operations`,
`operation_photos`, `operation_documents` + enums).

## Document Engine

Sprint 6 cria o motor oficial de documentos de produção:

```text
Operation → DocumentBuilder → DocumentBlueprint → DocumentRenderer → PDF Engine
```

O Builder resolve dados operacionais e gera um Blueprint independente de PDF. O Renderer pagina o
Blueprint. O PDF Engine gera PDF diretamente, sem HTML/print.

Tipos válidos em `:type`:

```ts
type DocumentTemplateType =
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'PMOC';
```

Permissões:

- `OWNER`: todos os tipos e ações;
- `MANAGER`: preview/render/download de tipos não financeiros;
- `OPERATOR`: preview/render/download de tipos não financeiros;
- `VIEWER`: preview/download de tipos não financeiros;
- `QUOTE` e `RECEIPT`: somente `OWNER`.

### Blueprint response

Preview retorna o documento estruturado, sem PDF:

```ts
type DocumentBlueprint = {
  version: '1.0';
  metadata: {
    operationId: string;
    documentId: string | null;
    documentType: DocumentTemplateType;
    documentNumber: string;
    generatedAt: string;
    locale: 'pt-BR';
    timezone: string;
    currency: string;
    organization: {
      legalName: string;
      tradeName: string;
      cnpj: string;
      email: string;
      phone: string;
      city: string;
      state: string;
      primaryColor: string;
      secondaryColor: string;
    };
  };
  header: {
    title: string;
    subtitle?: string;
    organizationName: string;
    documentNumber: string;
  };
  footer: { content: string; generatedAt: string };
  sections: Array<{
    id: string;
    title: string;
    critical?: boolean;
    components: Array<
      | { id: string; kind: 'metadata'; items: Array<{ label: string; value: string }> }
      | { id: string; kind: 'paragraph'; text: string; emphasis?: 'normal' | 'strong' }
      | {
          id: string;
          kind: 'table';
          columns: Array<{ key: string; label: string; width?: number }>;
          rows: Array<Record<string, string>>;
        }
      | { id: string; kind: 'list'; items: string[] }
      | {
          id: string;
          kind: 'image';
          sourceId: string;
          caption: string | null;
          mimeType: string;
          fileSize: number;
        }
      | { id: string; kind: 'qrCode'; label: string; value: string }
      | {
          id: string;
          kind: 'checklist';
          items: Array<{ label: string; done: boolean; note: string | null }>;
        }
      | {
          id: string;
          kind: 'signaturePlaceholder';
          label: string;
          strategy: 'none' | 'fixed' | 'collected' | 'hybrid';
          signedAt: string | null;
        }
      | {
          id: string;
          kind: 'signature';
          mode: 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';
          keepTogether?: boolean;
          signatures: Array<{
            id: string;
            role: 'fixed' | 'collected';
            label: string;
            name: string | null;
            title: string | null;
            signedAt: string | null;
            caption: string | null;
            image?: {
              mimeType: 'image/png' | 'image/jpeg';
              fileSize: number;
              contentBase64: string;
            } | null;
          }>;
        }
      | { id: string; kind: 'observation'; text: string }
    >;
  }>;
};
```

Sprint 8 adicionou o componente `signature`. `signaturePlaceholder` permanece documentado por
compatibilidade, mas o fluxo oficial usa `signature` quando o template exige assinatura.

Comportamento por `signatureMode`:

- `NONE`: nenhuma seção de assinatura é adicionada;
- `FIXED`: inclui assinatura cadastrada e imagem resolvida do storage;
- `COLLECTED`: inclui área manual sem imagem fixa;
- `HYBRID`: inclui assinatura fixa e área manual.

### GET `/api/v1/documents/operations/:operationId/:type/preview`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER` respeitando restrição financeira.

Response 200:

```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "metadata": {
      "operationId": "7db71471-0cf4-4414-8d06-83eb9c1917c9",
      "documentId": "f4ea14f7-859b-452d-b669-e12338d23b39",
      "documentType": "WORK_ORDER",
      "documentNumber": "OS-000001",
      "generatedAt": "2026-06-29T10:00:00.000Z",
      "locale": "pt-BR",
      "timezone": "America/Recife",
      "currency": "BRL",
      "organization": {
        "legalName": "Climatize Nordeste LTDA",
        "tradeName": "Climatize Nordeste",
        "cnpj": "00.000.000/0001-00",
        "email": "contato@example.com",
        "phone": "+55 81 99999-9999",
        "city": "Recife",
        "state": "PE",
        "primaryColor": "#111827",
        "secondaryColor": "#2563EB"
      }
    },
    "header": {
      "title": "Ordem de Serviço",
      "subtitle": "Operação 000001",
      "organizationName": "Climatize Nordeste",
      "documentNumber": "OS-000001"
    },
    "footer": {
      "content": "Gerado por Climatize Nordeste · contato@example.com",
      "generatedAt": "2026-06-29T10:00:00.000Z"
    },
    "sections": []
  }
}
```

### GET `/api/v1/documents/templates/:templateId/preview`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER` respeitando restrição financeira (`QUOTE` e
`RECEIPT` somente `OWNER`).

Gera preview oficial de um `DocumentTemplate` sem `Operation`, sem `Customer`, sem `Equipment` e
sem Demo Dataset. O retorno é o mesmo `DocumentBlueprint` usado pelos demais previews.

Fluxo interno:

```text
DocumentTemplate
↓
DocumentContextService.buildTemplatePreviewContext(templateId)
↓
DocumentBuilder
↓
DocumentBlueprint
↓
DocumentViewer
```

Response 200:

```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "metadata": {
      "operationId": "8498a905-49f1-4e77-99a4-e84e5151f5ed",
      "documentId": null,
      "documentType": "WORK_ORDER",
      "documentNumber": "MODELO-WORK_ORDER",
      "generatedAt": "2026-07-01T10:00:00.000Z",
      "locale": "pt-BR",
      "timezone": "America/Recife",
      "currency": "BRL",
      "organization": {
        "legalName": "Climatize Nordeste LTDA",
        "tradeName": "Climatize Nordeste",
        "cnpj": "00.000.000/0001-00",
        "email": "contato@example.com",
        "phone": "+55 81 99999-9999",
        "city": "Recife",
        "state": "PE",
        "primaryColor": "#111827",
        "secondaryColor": "#2563EB"
      }
    },
    "header": {
      "title": "OS padrão",
      "subtitle": "Pré-visualização de modelo",
      "organizationName": "Climatize Nordeste",
      "documentNumber": "MODELO-WORK_ORDER"
    },
    "footer": {
      "content": "Texto de rodapé do template",
      "generatedAt": "2026-07-01T10:00:00.000Z"
    },
    "sections": []
  }
}
```

Erros principais: common protected errors, `VALIDATION_ERROR`, `TEMPLATE_NOT_FOUND`,
`TEMPLATE_INACTIVE`, `SIGNATURE_NOT_FOUND`, `SIGNATURE_INACTIVE`, `SIGNATURE_IMAGE_REQUIRED`,
`STORAGE_FILE_NOT_FOUND`, `DOCUMENT_FORBIDDEN_TYPE`, `DOCUMENT_SIZE_LIMIT_EXCEEDED`.

### POST `/api/v1/documents/operations/:operationId/:type/render`

Roles: `OWNER`, `MANAGER`, `OPERATOR` respeitando restrição financeira.

Cria o `OperationDocument` caso ainda não exista, renderiza o Blueprint, gera PDF direto, grava no
storage e atualiza metadados.

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "f4ea14f7-859b-452d-b669-e12338d23b39",
    "operationId": "7db71471-0cf4-4414-8d06-83eb9c1917c9",
    "type": "WORK_ORDER",
    "number": "OS-000001",
    "status": "READY",
    "mimeType": "application/pdf",
    "fileSize": 48213,
    "renderedAt": "2026-06-29T10:00:02.000Z",
    "renderMetadata": {
      "engine": "direct-pdf-v1",
      "blueprintVersion": "1.0",
      "pageCount": 3,
      "generatedAt": "2026-06-29T10:00:00.000Z"
    },
    "createdAt": "2026-06-29T09:58:00.000Z",
    "updatedAt": "2026-06-29T10:00:02.000Z",
    "downloadReady": true
  }
}
```

### GET `/api/v1/documents/:documentId/preview`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER` respeitando restrição financeira.

Gera o Blueprint a partir do `OperationDocument` existente.

### POST `/api/v1/documents/:documentId/render`

Roles: `OWNER`, `MANAGER`, `OPERATOR` respeitando restrição financeira.

Renderiza novamente o documento existente. Se já houver PDF anterior, o arquivo antigo é removido
do storage após a nova versão ser salva.

### GET `/api/v1/documents/:documentId/download`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER` respeitando restrição financeira.

Response 200:

```json
{
  "success": true,
  "data": {
    "id": "f4ea14f7-859b-452d-b669-e12338d23b39",
    "operationId": "7db71471-0cf4-4414-8d06-83eb9c1917c9",
    "type": "WORK_ORDER",
    "number": "OS-000001",
    "status": "READY",
    "mimeType": "application/pdf",
    "fileSize": 48213,
    "renderedAt": "2026-06-29T10:00:02.000Z",
    "renderMetadata": { "engine": "direct-pdf-v1", "pageCount": 3 },
    "createdAt": "2026-06-29T09:58:00.000Z",
    "updatedAt": "2026-06-29T10:00:02.000Z",
    "downloadReady": true,
    "contentBase64": "JVBERi0xLjcK..."
  }
}
```

Errors:

| HTTP | Code                           | Condition                              |
| ---- | ------------------------------ | -------------------------------------- |
| 400  | `VALIDATION_ERROR`             | UUID/type inválido                     |
| 400  | `DOCUMENT_SIZE_LIMIT_EXCEEDED` | Blueprint/PDF excede limites           |
| 403  | `DOCUMENT_FORBIDDEN_TYPE`      | Não-OWNER acessando `QUOTE`/`RECEIPT`  |
| 404  | `OPERATION_NOT_FOUND`          | Operation ausente                      |
| 404  | `DOCUMENT_NOT_FOUND`           | OperationDocument ausente              |
| 404  | `ORGANIZATION_NOT_FOUND`       | Seed organizacional/config ausente     |
| 404  | `SIGNATURE_NOT_FOUND`          | Template exige assinatura fixa ausente |
| 409  | `SIGNATURE_INACTIVE`           | Assinatura configurada inativa         |
| 409  | `SIGNATURE_IMAGE_REQUIRED`     | Assinatura fixa sem imagem enviada     |
| 409  | `DOCUMENT_DOWNLOAD_NOT_READY`  | Download solicitado antes do render    |
| 500  | `DOCUMENT_RENDER_FAILED`       | Falha inesperada no render             |

Migrations relacionadas: `20260629110000_document_engine_foundation` e
`20260629150000_document_configuration_signature_domain`. Sprint 8 não cria migration.

## Asset Lifecycle (Sprint 9)

Eventos do ciclo de vida de equipamento são imutáveis. Não existe `PATCH` ou `DELETE` de evento.
Quando um histórico precisa ser corrigido, criar um novo evento do tipo adequado.

Tipos:

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

Payload base:

```ts
type AssetLifecycleEvent = {
  id: string;
  equipmentId: string;
  operationId: string | null;
  documentId: string | null;
  type: AssetLifecycleEventType;
  occurredAt: string;
  performedBy: string | null;
  description: string;
  createdAt: string;
  equipment?: {
    id: string;
    name: string;
    tag: string | null;
    type: string;
    status: string;
    customer?: { id: string; name: string; tradeName: string | null } | null;
  };
  operation?: { id: string; number: number; type: string; status: string } | null;
  document?: { id: string; number: string; type: string; status: string } | null;
  performer?: { id: string; name: string; username: string } | null;
  attachments?: AssetLifecycleAttachment[];
  timeline?: AssetLifecycleTimelineItem;
};

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

type AssetLifecycleAttachment = {
  id: string;
  originalFileName: string;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg';
  fileSize: number;
  category: string;
  createdAt: string;
};
```

Sprint 20.5 removeu campos internos do payload público. O frontend não deve esperar `metadata`,
`storageKey`, `eventId`, `deletedAt` nem e-mail do performer em respostas de Asset Lifecycle. Dados
auxiliares continuam disponíveis pelo objeto seguro `timeline` e pelas referências navegáveis.

### GET `/api/v1/asset-lifecycle`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Query:

```http
?page=1&limit=20&customerId=<uuid>&equipmentId=<uuid>&operationId=<uuid>&type=PREVENTIVE&performedBy=<uuid>&from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z
```

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "fdbff227-5bd2-4be8-bb14-8bdfc0fda945",
        "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
        "operationId": "0d095617-4c7b-45a1-95c1-c8d1a950d587",
        "documentId": null,
        "type": "PREVENTIVE",
        "occurredAt": "2026-06-30T12:00:00.000Z",
        "performedBy": "9ca64187-aecf-4717-8805-16c942133e3d",
        "description": "Preventiva concluída",
        "createdAt": "2026-06-30T12:00:02.000Z",
        "equipment": {
          "id": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
          "name": "Split 24.000 BTU",
          "tag": "CBV-SPL-001",
          "type": "SPLIT",
          "status": "ACTIVE"
        },
        "operation": {
          "id": "0d095617-4c7b-45a1-95c1-c8d1a950d587",
          "number": 12,
          "type": "PREVENTIVA",
          "status": "COMPLETED"
        },
        "document": null,
        "performer": {
          "id": "9ca64187-aecf-4717-8805-16c942133e3d",
          "name": "João Técnico",
          "username": "joao"
        },
        "attachments": [],
        "timeline": {
          "id": "fdbff227-5bd2-4be8-bb14-8bdfc0fda945",
          "icon": "shield-check",
          "color": "#16A34A",
          "title": "Atendimento #12 · PREVENTIVA",
          "subtitle": "Intervenção planejada/preventiva",
          "category": "maintenance",
          "description": "Preventiva concluída",
          "date": "2026-06-30T12:00:00.000Z",
          "groupKey": "2026-06-30",
          "sortKey": "2026-06-30T12:00:00.000Z_fdbff227-5bd2-4be8-bb14-8bdfc0fda945",
          "user": {
            "id": "9ca64187-aecf-4717-8805-16c942133e3d",
            "name": "João Técnico",
            "username": "joao"
          },
          "type": "PREVENTIVE",
          "operationId": "0d095617-4c7b-45a1-95c1-c8d1a950d587",
          "documentId": null,
          "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
          "references": {
            "equipment": {
              "id": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
              "name": "Split 24.000 BTU",
              "tag": "CBV-SPL-001",
              "type": "SPLIT",
              "status": "ACTIVE"
            },
            "customer": {
              "id": "b98be991-9aa5-4721-aeb2-6486e9615cbb",
              "name": "Colégio Boa Viagem",
              "tradeName": "Colégio Boa Viagem"
            },
            "operation": {
              "id": "0d095617-4c7b-45a1-95c1-c8d1a950d587",
              "number": 12,
              "type": "PREVENTIVA",
              "status": "COMPLETED"
            },
            "document": null
          },
          "attachments": [],
          "badges": ["maintenance", "preventive"]
        }
      }
    ],
    "timelineGroups": [
      {
        "date": "2026-06-30",
        "count": 1,
        "items": []
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### GET `/api/v1/asset-lifecycle/:id`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Retorna um `AssetLifecycleEvent` completo com o campo aditivo `timeline`.

### POST `/api/v1/asset-lifecycle`

Roles: `OWNER`, `MANAGER`, `OPERATOR`.

Request:

```json
{
  "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
  "operationId": "0d095617-4c7b-45a1-95c1-c8d1a950d587",
  "documentId": null,
  "type": "NOTE",
  "occurredAt": "2026-06-30T12:00:00.000Z",
  "performedBy": "9ca64187-aecf-4717-8805-16c942133e3d",
  "description": "Observação técnica registrada no ativo.",
  "metadata": { "source": "field-note" }
}
```

Campos opcionais: `operationId`, `documentId`, `occurredAt`, `performedBy`, `metadata`.

Response 201: `AssetLifecycleEvent`.

### GET `/api/v1/equipments/:id/lifecycle`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Mesmo contrato de `GET /asset-lifecycle`, com `equipmentId` fixado pelo path. O filtro
`customerId` é ignorado para esta rota quando conflitar com o path.

### GET `/api/v1/equipments/:id/lifecycle/stats`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Response 200:

```json
{
  "success": true,
  "data": {
    "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
    "total": 8,
    "byType": {
      "INSTALLATION": 1,
      "INSPECTION": 2,
      "PREVENTIVE": 3,
      "CORRECTIVE": 1,
      "MAINTENANCE": 0,
      "PART_REPLACEMENT": 0,
      "WARRANTY": 0,
      "DOCUMENT": 1,
      "NOTE": 0,
      "CUSTOM": 0
    },
    "preventiveCount": 3,
    "correctiveCount": 1,
    "documentCount": 1,
    "inspectionCount": 2,
    "firstInstallation": "2024-03-15T00:00:00.000Z",
    "lastMaintenance": "2026-06-30T12:00:00.000Z",
    "meanDaysBetweenInterventions": 46.5
  }
}
```

### GET `/api/v1/asset-lifecycle/:id/attachments`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Retorna apenas anexos ativos (`deletedAt=null`).

### POST `/api/v1/asset-lifecycle/:id/attachments`

Roles: `OWNER`, `MANAGER`, `OPERATOR`.

Content-Type: `multipart/form-data`.

Campos:

- `file`: obrigatório;
- `category`: string, default `DOCUMENT`.

Arquivos aceitos:

- MIME: `application/pdf`, `image/png`, `image/jpeg`;
- extensões: `pdf`, `png`, `jpg`, `jpeg`;
- tamanho máximo: 5 MiB.

Response 201: `AssetLifecycleAttachment`.

### DELETE `/api/v1/asset-lifecycle/:id/attachments/:attachmentId`

Roles: `OWNER`, `MANAGER`.

Soft delete do anexo e remoção best-effort do arquivo físico no storage.

Response 200:

```json
{
  "success": true,
  "data": { "deleted": true }
}
```

Erros:

| HTTP | Code                                   | Condition                                |
| ---- | -------------------------------------- | ---------------------------------------- |
| 400  | `VALIDATION_ERROR`                     | Payload, UUID, query ou relação inválida |
| 400  | `UPLOAD_FILE_REQUIRED`                 | Upload sem arquivo                       |
| 400  | `UPLOAD_FILE_TOO_LARGE`                | Arquivo vazio ou maior que 5 MiB         |
| 400  | `UPLOAD_INVALID_MIME_TYPE`             | MIME ou assinatura binária inválida      |
| 400  | `UPLOAD_INVALID_EXTENSION`             | Extensão não permitida                   |
| 401  | `AUTH_TOKEN_INVALID`                   | Token ausente/inválido                   |
| 403  | `AUTH_FORBIDDEN`                       | Papel sem permissão                      |
| 404  | `ASSET_LIFECYCLE_EVENT_NOT_FOUND`      | Evento ausente                           |
| 404  | `ASSET_LIFECYCLE_ATTACHMENT_NOT_FOUND` | Anexo ausente ou já removido             |
| 404  | `EQUIPMENT_NOT_FOUND`                  | Equipamento ausente                      |
| 404  | `OPERATION_NOT_FOUND`                  | Operation informada ausente              |
| 404  | `DOCUMENT_NOT_FOUND`                   | Documento informado ausente              |

Integrações automáticas:

- ao concluir uma `Operation`, o backend cria evento `INSTALLATION`, `PREVENTIVE`, `CORRECTIVE` ou
  `CUSTOM`, conforme `OperationType`;
- ao renderizar um documento oficial, o backend cria evento `DOCUMENT`;
- ambos são idempotentes e não duplicam histórico se a rota for chamada novamente.

Metadata garantida:

- eventos de Operation: `operationId`, `operationNumber`, `operationType`, `operationStatus`;
- eventos `DOCUMENT`: `documentId`, `documentType`, `documentNumber`, `renderStatus`, `renderedAt`.

Consolidação Sprint 9.5:

- a publicação passa exclusivamente pelo `LifecyclePublisher`;
- a timeline pronta para consumo é gerada pelo `TimelineAssembler`;
- payloads antigos permanecem compatíveis e os campos `timeline`/`timelineGroups` são aditivos.

Migrations: `20260630110000_asset_lifecycle_foundation` e
`20260630130000_asset_lifecycle_refinement`.

## Maintenance Planning

Sprint 10 adiciona planejamento de manutenção. Planejamento não executa atendimento sozinho; a
execução operacional continua sendo `Operation`.

Roles:

- leitura: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`;
- criar/editar/desativar planos: `OWNER`, `MANAGER`;
- criar/atualizar execuções planejadas: `OWNER`, `MANAGER`, `OPERATOR`.

Enums:

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

`recurrenceRule`:

```json
{
  "frequency": "MONTHLY",
  "interval": 1
}
```

`interval` é opcional, inteiro de 1 a 3650. Quando ausente, assume 1.

### GET `/api/v1/maintenance-plans/stats`

Response 200:

```json
{
  "success": true,
  "data": {
    "activePlans": 12,
    "overduePlans": 2,
    "upcomingExecutions": 8,
    "completedExecutions": 31,
    "pendingExecutions": 10,
    "meanDaysBetweenExecutions": 28.4
  }
}
```

### GET `/api/v1/maintenance-plans`

Query:

- `page`: default `1`, máximo indireto por `limit`;
- `limit`: default `20`, máximo `100`;
- `equipmentId`: UUID opcional;
- `type`: `MaintenancePlanType`;
- `priority`: `MaintenancePriority`;
- `active`: boolean.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "9d5ff2e4-7f77-4f05-b07f-075a21a9c0f8",
        "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
        "name": "Preventiva mensal",
        "description": "Limpeza, inspeção e medição.",
        "type": "PREVENTIVE",
        "active": true,
        "priority": "MEDIUM",
        "recurrenceRule": { "frequency": "MONTHLY", "interval": 1 },
        "firstExecution": "2026-07-10T12:00:00.000Z",
        "nextExecution": "2026-07-10T12:00:00.000Z",
        "lastExecution": null,
        "createdBy": "4f9a4e4a-c3fd-4e2e-b97f-b2b5d4ce5d5c",
        "createdAt": "2026-06-30T15:00:00.000Z",
        "updatedAt": "2026-06-30T15:00:00.000Z",
        "equipment": {
          "id": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
          "name": "Split Samsung 24.000 BTU",
          "tag": "CBV-SPL-001",
          "type": "SPLIT",
          "status": "ACTIVE",
          "customer": { "id": "20ebef96-bc68-4d3e-9272-7c9383df2232", "name": "Colégio Boa Viagem" }
        },
        "creator": {
          "id": "4f9a4e4a-c3fd-4e2e-b97f-b2b5d4ce5d5c",
          "name": "Darlan Simplicio",
          "username": "ninja"
        },
        "_count": { "executions": 1 }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### GET `/api/v1/maintenance-plans/:id`

Response 200: um `MaintenancePlan` com o mesmo shape da listagem.

### POST `/api/v1/maintenance-plans`

Request:

```json
{
  "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
  "name": "Preventiva mensal",
  "description": "Limpeza, inspeção e medição.",
  "type": "PREVENTIVE",
  "priority": "MEDIUM",
  "recurrenceRule": { "frequency": "MONTHLY", "interval": 1 },
  "firstExecution": "2026-07-10T12:00:00.000Z",
  "active": true
}
```

Response 201: `MaintenancePlan` criado. A criação do plano também cria uma
`MaintenanceExecution` inicial em `PLANNED` com `scheduledAt = firstExecution`; `nextExecution`
continua apontando para essa próxima execução pendente.

### PATCH `/api/v1/maintenance-plans/:id`

Request parcial:

```json
{
  "name": "Preventiva mensal atualizada",
  "priority": "HIGH",
  "recurrenceRule": { "frequency": "INTERVAL_DAYS", "interval": 45 },
  "firstExecution": "2026-07-15T12:00:00.000Z",
  "active": true
}
```

Response 200: `MaintenancePlan` atualizado.

### DELETE `/api/v1/maintenance-plans/:id`

Desativa o plano (`active=false`). Não remove fisicamente.

Response 200:

```json
{
  "success": true,
  "data": { "deleted": true }
}
```

### GET `/api/v1/maintenance-plans/:id/executions`

Query:

- `page`;
- `limit`;
- `status`;
- `from`;
- `to`.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "46bd4114-7fb1-4fb8-8061-9dc99383e311",
        "maintenancePlanId": "9d5ff2e4-7f77-4f05-b07f-075a21a9c0f8",
        "operationId": null,
        "scheduledAt": "2026-07-10T12:00:00.000Z",
        "executedAt": null,
        "status": "PLANNED",
        "notes": "Primeira execução planejada.",
        "createdAt": "2026-06-30T15:00:00.000Z",
        "plan": {},
        "operation": null
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

`plan` usa o mesmo include de `MaintenancePlan`; `operation`, quando presente, contém `id`,
`number`, `type`, `status` e `completedAt`.

### POST `/api/v1/maintenance-plans/:id/executions`

Request:

```json
{
  "scheduledAt": "2026-08-10T12:00:00.000Z",
  "notes": "Execução planejada manualmente."
}
```

`scheduledAt` é opcional. Quando ausente, usa `plan.nextExecution`.

Response 201: `MaintenanceExecution` criada. O plano recalcula `nextExecution` com o
`RecurringEngine`.

### PATCH `/api/v1/maintenance-executions/:id`

Request:

```json
{
  "operationId": "c67bb70d-8d5f-4994-af9a-c206c6ae02ea",
  "status": "COMPLETED",
  "executedAt": "2026-07-10T18:00:00.000Z",
  "notes": "Executada conforme checklist operacional."
}
```

Regras:

- `operationId`, quando informado, deve pertencer ao mesmo equipamento do plano;
- se a Operation vinculada já estiver `COMPLETED`, a execução é concluída;
- ao concluir, o plano atualiza `lastExecution` e `nextExecution`;
- ao concluir, o Asset Lifecycle recebe evento `MAINTENANCE` via `LifecyclePublisher`.

Response 200: `MaintenanceExecution` atualizada.

### GET `/api/v1/equipments/:id/maintenance`

Mesmo contrato de `GET /maintenance-plans`, com `equipmentId` fixado pelo path.

### GET `/api/v1/equipments/:id/maintenance/upcoming`

Mesmo contrato de `GET /maintenance-plans/:id/executions`, filtrado pelo equipamento e, por padrão,
por `status=PLANNED`.

Erros:

| HTTP | Code                              | Condition                                  |
| ---- | --------------------------------- | ------------------------------------------ |
| 400  | `VALIDATION_ERROR`                | Payload/query inválido                     |
| 400  | `MAINTENANCE_RECURRENCE_INVALID`  | Regra de recorrência inválida              |
| 400  | `MAINTENANCE_OPERATION_MISMATCH`  | Operation vinculada pertence a outro ativo |
| 401  | `AUTH_TOKEN_INVALID`              | Token ausente/inválido                     |
| 403  | `AUTH_FORBIDDEN`                  | Papel sem permissão                        |
| 404  | `EQUIPMENT_NOT_FOUND`             | Equipamento ausente                        |
| 404  | `OPERATION_NOT_FOUND`             | Operation vinculada ausente                |
| 404  | `MAINTENANCE_PLAN_NOT_FOUND`      | Plano ausente                              |
| 404  | `MAINTENANCE_EXECUTION_NOT_FOUND` | Execução ausente                           |

Auditoria:

- `MAINTENANCE_PLAN_CREATED`;
- `MAINTENANCE_PLAN_UPDATED`;
- `MAINTENANCE_PLAN_DELETED`;
- `MAINTENANCE_EXECUTION_CREATED`;
- `MAINTENANCE_EXECUTION_UPDATED`;
- `MAINTENANCE_EXECUTION_COMPLETED`.

Migration: `20260630150000_maintenance_planning_domain`.

## PMOC Compliance

Sprint 11 adiciona PMOC como especialização de Maintenance Planning. PMOC não possui recorrência ou
execução própria: usa `MaintenancePlan`, `MaintenanceExecution`, `Operation`, `AssetLifecycle` e
Document Engine.

Roles:

- leitura: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`;
- criação/edição/desativação de PMOC e ambientes: `OWNER`, `MANAGER`.

Enums:

```ts
type PmocComplianceStatus = 'COMPLIANT' | 'WARNING' | 'OVERDUE' | 'NON_COMPLIANT' | 'IN_PROGRESS';
```

### GET `/api/v1/pmoc/stats`

Response 200:

```json
{
  "success": true,
  "data": {
    "activePmocs": 8,
    "expiredPmocs": 1,
    "compliantPmocs": 5,
    "pendingPmocs": 2,
    "environments": 22,
    "monitoredEquipments": 14,
    "upcomingExecutions": 6
  }
}
```

### GET `/api/v1/pmoc`

Query:

- `page`;
- `limit`;
- `customerId`;
- `equipmentId`;
- `active`.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "2b487f6d-4af8-404e-a482-fbc0e52f5207",
        "organizationId": "d8996dbb-a64f-4e51-9a72-951f10c0f36d",
        "customerId": "20ebef96-bc68-4d3e-9272-7c9383df2232",
        "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
        "maintenancePlanId": "9d5ff2e4-7f77-4f05-b07f-075a21a9c0f8",
        "responsibleTechnician": "Ricardo Almeida",
        "artNumber": "ART-PE-2026-00091",
        "contractNumber": "HSC-PMOC-2026",
        "startDate": "2026-01-01T00:00:00.000Z",
        "endDate": "2026-12-31T00:00:00.000Z",
        "active": true,
        "observations": "PMOC anual",
        "organization": {
          "id": "d8996dbb-a64f-4e51-9a72-951f10c0f36d",
          "legalName": "Climatize Refrigeração LTDA",
          "tradeName": "Climatize"
        },
        "customer": {
          "id": "20ebef96-bc68-4d3e-9272-7c9383df2232",
          "name": "Hospital Santa Clara",
          "tradeName": "Hospital Santa Clara"
        },
        "equipment": {
          "id": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
          "name": "Chiller Trane 120 TR",
          "tag": "HSC-CHI-001",
          "type": "CHILLER",
          "status": "ACTIVE"
        },
        "maintenancePlan": {
          "id": "9d5ff2e4-7f77-4f05-b07f-075a21a9c0f8",
          "type": "PREVENTIVE",
          "recurrenceRule": { "frequency": "MONTHLY", "interval": 1 },
          "nextExecution": "2026-07-10T12:00:00.000Z",
          "executions": []
        },
        "equipments": [],
        "environments": [],
        "compliance": {
          "status": "COMPLIANT",
          "reasons": [],
          "evaluatedAt": "2026-06-30T18:00:00.000Z"
        }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### GET `/api/v1/pmoc/:id`

Response 200: `PmocPlan` completo com `compliance`, ambientes, equipamentos monitorados,
`MaintenancePlan` e próximas execuções.

### POST `/api/v1/pmoc`

Request:

```json
{
  "customerId": "20ebef96-bc68-4d3e-9272-7c9383df2232",
  "equipmentId": "7e4333fa-7f52-4d61-a9d3-caa3697d3301",
  "equipmentIds": ["7e4333fa-7f52-4d61-a9d3-caa3697d3301"],
  "responsibleTechnician": "Ricardo Almeida",
  "artNumber": "ART-PE-2026-00091",
  "contractNumber": "HSC-PMOC-2026",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T00:00:00.000Z",
  "observations": "PMOC anual",
  "priority": "HIGH",
  "recurrenceRule": { "frequency": "MONTHLY", "interval": 1 },
  "active": true
}
```

Response 201: PMOC criado. O backend também cria exatamente um `MaintenancePlan` preventivo e a
primeira `MaintenanceExecution` planejada.

### PATCH `/api/v1/pmoc/:id`

Request parcial:

```json
{
  "responsibleTechnician": "Mariana Costa",
  "equipmentIds": ["7e4333fa-7f52-4d61-a9d3-caa3697d3301"],
  "endDate": "2026-12-31T00:00:00.000Z",
  "recurrenceRule": { "frequency": "INTERVAL_MONTHS", "interval": 1 },
  "active": true
}
```

Response 200: PMOC atualizado.

### DELETE `/api/v1/pmoc/:id`

Desativa PMOC e seu `MaintenancePlan`.

Response 200:

```json
{
  "success": true,
  "data": { "deleted": true }
}
```

### GET `/api/v1/pmoc/:id/environments`

Response 200: lista de ambientes do PMOC com equipamentos relacionados.

### POST `/api/v1/pmoc/:id/environments`

Request:

```json
{
  "name": "Central de água gelada",
  "area": "85 m²",
  "occupancy": 4,
  "equipmentIds": ["7e4333fa-7f52-4d61-a9d3-caa3697d3301"],
  "observations": "Ambiente técnico"
}
```

Response 201: ambiente criado.

### PATCH `/api/v1/pmoc/environments/:id`

Request parcial com os mesmos campos de criação.

Response 200: ambiente atualizado.

### DELETE `/api/v1/pmoc/environments/:id`

Remove o ambiente e seus vínculos.

Response 200:

```json
{
  "success": true,
  "data": { "deleted": true }
}
```

### GET `/api/v1/pmoc/:id/compliance`

Response 200:

```json
{
  "success": true,
  "data": {
    "pmocPlanId": "2b487f6d-4af8-404e-a482-fbc0e52f5207",
    "status": "WARNING",
    "reasons": ["There are upcoming PMOC executions within seven days"],
    "evaluatedAt": "2026-06-30T18:00:00.000Z",
    "document": {
      "type": "PMOC",
      "engine": "DocumentEngine",
      "defaultTemplate": {},
      "ready": true
    }
  }
}
```

### GET `/api/v1/equipments/:id/pmoc`

Mesmo contrato de `GET /pmoc`, filtrado por equipamento principal ou equipamento monitorado.

Erros:

| HTTP | Code                         | Condition                                |
| ---- | ---------------------------- | ---------------------------------------- |
| 400  | `VALIDATION_ERROR`           | Payload/query inválido                   |
| 400  | `PMOC_INVALID_RELATIONSHIP`  | Equipamento não pertence ao cliente/PMOC |
| 401  | `AUTH_TOKEN_INVALID`         | Token ausente/inválido                   |
| 403  | `AUTH_FORBIDDEN`             | Papel sem permissão                      |
| 404  | `CUSTOMER_NOT_FOUND`         | Cliente ausente                          |
| 404  | `EQUIPMENT_NOT_FOUND`        | Equipamento ausente                      |
| 404  | `ORGANIZATION_NOT_FOUND`     | Organização ausente                      |
| 404  | `PMOC_PLAN_NOT_FOUND`        | PMOC ausente                             |
| 404  | `PMOC_ENVIRONMENT_NOT_FOUND` | Ambiente ausente                         |

Eventos automáticos:

- `PMOC_CREATED`;
- `PMOC_UPDATED`;
- `PMOC_EXPIRED`;
- `PMOC_COMPLETED` quando uma execução PMOC é concluída via Maintenance Execution.

Migration: `20260630170000_pmoc_compliance_domain`.

## Inventory & Materials

Sprint 12 adiciona o domínio de inventário e materiais. Todos os endpoints utilizam `/api/v1`,
retornam o envelope padrão `{ "success": true, "data": ... }` e usam o formato global de erro.

Conceitos:

- `Product`: catálogo do produto, sem saldo;
- `InventoryItem`: estoque físico de um produto;
- `StockMovement`: movimentação imutável que altera saldo;
- `Supplier`: fornecedor;
- `OperationPart`: material consumido em uma Operation.

Tipos:

```ts
type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'CONSUMPTION' | 'RETURN';

type Product = {
  id: string;
  sku: string;
  internalCode?: string | null;
  manufacturerCode?: string | null;
  name: string;
  unit: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  technicalDescription?: string | null;
  weight?: string | null;
  dimensions?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  suppliers?: ProductSupplier[];
};

type ProductSupplier = {
  id: string;
  productId: string;
  supplierId: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
};

type InventoryItem = {
  id: string;
  productId: string;
  currentQuantity: string;
  minimumQuantity: string;
  idealQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  location?: string | null;
  isActive: boolean;
  product: Product;
};
```

### GET `/api/v1/products`

Query:

- `page?: number`;
- `limit?: number`;
- `search?: string`;
- `category?: string`;
- `brand?: string`;
- `active?: boolean`.

Response 200:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  }
}
```

### GET `/api/v1/products/:id`

Response 200: `Product` com `inventoryItems` e `suppliers`.

### POST `/api/v1/products`

Roles: `OWNER`, `MANAGER`.

```json
{
  "sku": "HVAC-FILTRO-G4-001",
  "internalCode": "MAT-0001",
  "manufacturerCode": "G4-600",
  "name": "Filtro G4 600x600",
  "unit": "UN",
  "brand": "Tecfil",
  "model": "G4",
  "category": "Filtros",
  "technicalDescription": "Filtro para AHU",
  "weight": 1.2,
  "dimensions": "600x600x50",
  "primarySupplierId": "a57b10a6-c070-4955-945f-5e0e6ab32c4c"
}
```

Response 201: produto criado com `inventoryItems` e `suppliers`. O backend cria item de inventário
inicial com saldo zero. Quando `primarySupplierId` é enviado, o fornecedor precisa existir e estar
ativo.

### PATCH `/api/v1/products/:id`

Payload parcial do cadastro. `primarySupplierId: null` remove o fornecedor principal. Response 200:
produto atualizado com relações.

### DELETE `/api/v1/products/:id`

Soft delete. Response 200:

```json
{ "success": true, "data": { "deleted": true } }
```

### GET `/api/v1/inventory`

Query:

- `page?: number`;
- `limit?: number`;
- `search?: string`;
- `productId?: string`;
- `location?: string`;
- `critical?: boolean`;
- `active?: boolean`.

Response 200: lista paginada de `InventoryItem`.

### GET `/api/v1/inventory/:id`

Response 200: `InventoryItem` com produto.

### PATCH `/api/v1/inventory/:id`

Roles: `OWNER`, `MANAGER`.

Permite atualizar parâmetros físicos do item, sem criar movimentação:

```json
{
  "minimumQuantity": 5,
  "idealQuantity": 20,
  "reservedQuantity": 2,
  "location": "Almoxarifado principal",
  "isActive": true
}
```

O saldo disponível é recalculado pelo backend.

### GET `/api/v1/inventory/stats`

Response 200:

```json
{
  "success": true,
  "data": {
    "totalItems": 12,
    "activeProducts": 8,
    "minimumStockAlerts": 2,
    "productsWithoutStock": 1,
    "consumptionMovementsLast30Days": 6,
    "consumptionByPeriod": [],
    "consumptionByEquipment": [],
    "consumptionByCustomer": [],
    "productsMostUsed": []
  }
}
```

### POST `/api/v1/inventory/movements`

Roles: `OWNER`, `MANAGER`, `OPERATOR`.

```json
{
  "inventoryItemId": "f8165f3c-3e6b-4e2a-94a9-71402af96d0b",
  "quantity": 10,
  "type": "IN",
  "reason": "Entrada inicial",
  "operationId": null,
  "occurredAt": "2026-07-01T12:00:00.000Z"
}
```

Response 201: movimentação criada e estoque recalculado.

### GET `/api/v1/inventory/movements`

Query:

- `page?: number`;
- `limit?: number`;
- `inventoryItemId?: string`;
- `productId?: string`;
- `operationId?: string`;
- `type?: StockMovementType`;
- `from?: string`;
- `to?: string`.

Response 200: lista paginada de movimentos. Movimentos não possuem endpoint de edição.

### GET `/api/v1/suppliers`

Roles: `OWNER`, `MANAGER`.

Query: `page`, `limit`, `search`, `active`.

Response 200: lista paginada.

### POST `/api/v1/suppliers`

```json
{
  "legalName": "Friopeças Distribuidora LTDA",
  "tradeName": "Friopeças",
  "document": "12.345.678/0001-90",
  "contacts": [{ "name": "Comercial", "phone": "+55 81 3333-0000" }],
  "address": { "city": "Recife", "state": "PE" },
  "notes": "Fornecedor homologado"
}
```

Response 201: fornecedor criado.

### PATCH `/api/v1/suppliers/:id`

Payload parcial. Response 200: fornecedor atualizado.

### DELETE `/api/v1/suppliers/:id`

Soft delete. Response 200:

```json
{ "success": true, "data": { "deleted": true } }
```

### GET `/api/v1/operations/:id/materials`

Response 200: materiais vinculados à Operation.

### POST `/api/v1/operations/:id/materials`

Roles: `OWNER`, `MANAGER`, `OPERATOR`.

```json
{
  "productId": "1f6ad0fb-24bb-481d-8154-7e22f32c1404",
  "inventoryItemId": "f8165f3c-3e6b-4e2a-94a9-71402af96d0b",
  "quantity": 1,
  "notes": "Substituição de filtro saturado"
}
```

Response 201: cria `OperationPart`, `StockMovement(CONSUMPTION)`, recalcula estoque e publica
`PART_REPLACEMENT` no Asset Lifecycle quando a Operation possui equipamento.

### DELETE `/api/v1/operations/:id/materials/:id`

Roles: `OWNER`, `MANAGER`.

Soft delete do material e criação de `StockMovement(RETURN)`.

Erros:

| HTTP | Code                         | Condition                                      |
| ---- | ---------------------------- | ---------------------------------------------- |
| 400  | `VALIDATION_ERROR`           | Payload/query inválido                         |
| 400  | `INVENTORY_NEGATIVE_STOCK`   | Movimentação deixaria saldo negativo           |
| 400  | `INVENTORY_PRODUCT_MISMATCH` | InventoryItem não pertence ao produto enviado  |
| 401  | `AUTH_TOKEN_INVALID`         | Token ausente/inválido                         |
| 403  | `AUTH_FORBIDDEN`             | Papel sem permissão                            |
| 404  | `PRODUCT_NOT_FOUND`          | Produto inexistente                            |
| 404  | `SUPPLIER_NOT_FOUND`         | Fornecedor inexistente                         |
| 404  | `INVENTORY_ITEM_NOT_FOUND`   | Item de inventário inexistente                 |
| 404  | `OPERATION_NOT_FOUND`        | Operation inexistente                          |
| 409  | `PRODUCT_CONFLICT`           | SKU/código já cadastrado                       |
| 409  | `SUPPLIER_CONFLICT`          | Documento de fornecedor já cadastrado          |

Nota Product↔Supplier:

- `Product` continua sem preço e sem saldo;
- fornecedor principal é persistido via `ProductSupplier`, não em campo direto de `Product`;
- a instalação é single-company, então não há `tenant_id`/`company_id` na relação;
- `primarySupplierId` é validado por UUID, existência e `isActive=true`;
- `GET /products` e `GET /products/:id` retornam `suppliers[]`, ordenados com o primário primeiro.

Eventos de auditoria:

- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`;
- `SUPPLIER_CREATED`, `SUPPLIER_UPDATED`, `SUPPLIER_DELETED`;
- `INVENTORY_ITEM_CREATED`, `INVENTORY_ITEM_UPDATED`;
- `STOCK_MOVEMENT_CREATED`;
- `MATERIAL_CONSUMED`, `MATERIAL_RETURNED`.

Migration: `20260701120000_inventory_materials_domain`.

## Pricing

Sprint 13 adiciona o domínio oficial de Pricing. Preço e custo não existem em `Product` nem em
`InventoryItem`. A única fonte comercial é `ProductPricing`.

Roles:

- leitura e estatísticas: `OWNER`, `MANAGER`;
- criação/revisão de preços: `OWNER`;
- `OPERATOR` e `VIEWER` não acessam Pricing.

Tipo:

```ts
type ProductPricing = {
  id: string;
  organizationId: string;
  productId: string;
  costPrice: string;
  replacementCost: string;
  averageCost: string;
  salePrice: string;
  minimumSalePrice: string;
  suggestedSalePrice: string;
  marginPercentage: string;
  validFrom: string;
  validUntil?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    sku: string;
    internalCode?: string | null;
    name: string;
    unit: string;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    isActive: boolean;
  };
};
```

### GET `/api/v1/pricing/stats`

Query:

- `at?: string`.

Response 200:

```json
{
  "success": true,
  "data": {
    "productsWithoutPrice": 1,
    "expiredPrices": 0,
    "highestMargins": [],
    "lowestMargins": [],
    "averageCost": "55.10",
    "averageSalePrice": "97.33",
    "averageMarginPercentage": "42.80",
    "activePricings": 3,
    "evaluatedAt": "2026-07-01T12:00:00.000Z"
  }
}
```

### GET `/api/v1/pricing`

Query:

- `page?: number`;
- `limit?: number`;
- `productId?: string`;
- `active?: boolean`;
- `at?: string`;
- `expired?: boolean`;
- `search?: string`.

Response 200: lista paginada de `ProductPricing`.

### GET `/api/v1/pricing/:id`

Response 200: `ProductPricing`.

### GET `/api/v1/products/:id/pricing`

Resolve o preço vigente do produto.

Response 200:

```json
{
  "success": true,
  "data": {
    "pricingId": "3ffbc3d5-88e2-4241-9d13-e3f43b322ac8",
    "organizationId": "f398fb45-16d3-4278-b531-2c4e16a5297b",
    "productId": "4d375bb8-151f-4e84-b151-7a0c57a8cb93",
    "costPrice": "42.50",
    "replacementCost": "45.00",
    "averageCost": "43.80",
    "salePrice": "78.00",
    "minimumSalePrice": "68.00",
    "suggestedSalePrice": "82.00",
    "marginPercentage": "43.85",
    "validFrom": "2026-07-01T00:00:00.000Z",
    "validUntil": null,
    "active": true,
    "resolvedAt": "2026-07-01T12:00:00.000Z"
  }
}
```

### POST `/api/v1/products/:id/pricing`

Cria uma nova vigência de preço para o produto. Vigências ativas sobrepostas são rejeitadas.

```json
{
  "costPrice": 42.5,
  "replacementCost": 45,
  "averageCost": 43.8,
  "salePrice": 78,
  "minimumSalePrice": 68,
  "suggestedSalePrice": 82,
  "validFrom": "2026-07-01T00:00:00.000Z",
  "validUntil": null,
  "active": true
}
```

`marginPercentage` é opcional. Quando omitido, o backend calcula a margem a partir de
`salePrice` e `averageCost`.

Response 201: `ProductPricing` criado.

### PATCH `/api/v1/pricing/:id`

Cria uma revisão histórica baseada no preço anterior. Não sobrescreve valores comerciais antigos.

Payload parcial:

```json
{
  "salePrice": 84,
  "minimumSalePrice": 72,
  "suggestedSalePrice": 88,
  "validFrom": "2026-08-01T00:00:00.000Z"
}
```

Response 200: nova revisão criada. O registro anterior é desativado e sua vigência é encerrada.

### GET `/api/v1/pricing/history/:productId`

Query: `page`, `limit`.

Response 200: evolução paginada de preços do produto, ordenada por `validFrom desc`.

Erros:

| HTTP | Code                     | Condition                              |
| ---- | ------------------------ | -------------------------------------- |
| 400  | `VALIDATION_ERROR`       | Payload/query inválido                 |
| 400  | `PRICING_INVALID_MARGIN` | Preço/margem comercial inconsistente   |
| 400  | `PRICING_INVALID_PERIOD` | Vigência inválida                      |
| 401  | `AUTH_TOKEN_INVALID`     | Token ausente/inválido                 |
| 403  | `AUTH_FORBIDDEN`         | Papel sem permissão                    |
| 404  | `PRODUCT_NOT_FOUND`      | Produto inexistente/inativo            |
| 404  | `PRICING_NOT_FOUND`      | Registro/preço vigente inexistente     |
| 409  | `PRICING_OVERLAP`        | Vigência sobreposta a preço ativo      |

Eventos de auditoria:

- `PRICING_CREATED`;
- `PRICING_UPDATED`;
- `PRICING_DEACTIVATED`.

Migration: `20260701150000_pricing_domain`.

## Assignments (execução operacional)

`Assignment` é a camada oficial de execução da `Operation`. Não cria agenda paralela nem OS
paralela: controla responsável, aceite, início, conclusão e histórico operacional.

Endpoints:

| Método | Rota                                | Roles                         | Descrição |
| ------ | ----------------------------------- | ----------------------------- | --------- |
| GET    | `/assignments`                      | OWNER/MANAGER/OPERATOR/VIEWER | Lista paginada. OPERATOR vê apenas as próprias Assignments |
| GET    | `/assignments/my`                   | OWNER/MANAGER/OPERATOR        | Fila do usuário autenticado |
| GET    | `/assignments/:id`                  | OWNER/MANAGER/OPERATOR/VIEWER | Detalhe da Assignment |
| GET    | `/assignments/history/:operationId` | OWNER/MANAGER/OPERATOR/VIEWER | Histórico imutável da Operation |
| POST   | `/assignments`                      | OWNER/MANAGER                 | Cria Assignment para Operation existente |
| PATCH  | `/assignments/:id/reassign`         | OWNER/MANAGER                 | Reatribui responsável |
| PATCH  | `/assignments/:id/accept`           | OWNER/MANAGER/OPERATOR        | Operador responsável aceita |
| PATCH  | `/assignments/:id/reject`           | OWNER/MANAGER/OPERATOR        | Operador responsável recusa |
| PATCH  | `/assignments/:id/start`            | OWNER/MANAGER/OPERATOR        | Inicia execução após aceite |
| PATCH  | `/assignments/:id/complete`         | OWNER/MANAGER/OPERATOR        | Conclui execução após início |

Query listagem: `page`, `limit`, `operationId`, `assignedTo`, `customerId`, `equipmentId`, `status`.

Statuses: `ASSIGNED`, `ACCEPTED`, `STARTED`, `PAUSED`, `COMPLETED`, `CANCELED`, `REJECTED`.

Eventos de histórico: `ASSIGNED`, `REASSIGNED`, `ACCEPTED`, `STARTED`, `PAUSED`, `RESUMED`,
`REJECTED`, `COMPLETED`, `CANCELED`.

Payloads:

```json
{ "operationId": "<uuid>", "assignedTo": "<uuid>", "notes": "opcional" }
```

```json
{ "assignedTo": "<uuid>", "notes": "motivo opcional" }
```

```json
{ "rejectionReason": "Motivo da recusa" }
```

```json
{ "notes": "Observação final opcional" }
```

Regras:

- criação de `Operation` cria uma `Assignment` automaticamente;
- `OWNER`/`MANAGER` podem criar e reatribuir;
- somente o `assignedTo` pode aceitar, recusar, iniciar ou concluir;
- iniciar exige status `ACCEPTED`;
- concluir exige status `STARTED`;
- concluir Assignment atualiza a Operation para `COMPLETED` e dispara integrações existentes.

Erros:

| HTTP | Code                            | Condition |
| ---- | ------------------------------- | --------- |
| 400  | `VALIDATION_ERROR`              | Payload/query inválido |
| 400  | `OPERATION_OPERATOR_INVALID`    | Operador inválido/inativo/sem perfil operacional |
| 403  | `ASSIGNMENT_OPERATOR_FORBIDDEN` | Operador tentando agir em Assignment de outro usuário |
| 404  | `ASSIGNMENT_NOT_FOUND`          | Assignment inexistente |
| 404  | `OPERATION_NOT_FOUND`           | Operation inexistente |
| 409  | `ASSIGNMENT_INVALID_TRANSITION` | Estado atual não permite transição |

Migration: `20260701170000_assignment_domain`.

## Budgets

Domínio comercial oficial de orçamentos. Todas as rotas exigem JWT e usam envelope global.

Roles:

- `OWNER` e `MANAGER`: acesso completo ao domínio Budget;
- `OPERATOR` e `VIEWER`: sem acesso aos endpoints de Budget.

Statuses: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELED`.

### GET `/api/v1/budgets`

Query: `page`, `limit`, `search`, `status`, `customerId`, `equipmentId`, `operationId`,
`from`, `to`, `expired`.

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "number": 1,
      "status": "PENDING",
      "title": "Orçamento de manutenção HVAC",
      "subtotal": "301.00",
      "discount": "0.00",
      "additional": "0.00",
      "total": "301.00",
      "expirationDate": "2026-07-17T00:00:00.000Z",
      "customer": { "id": "uuid", "name": "Hospital Santa Clara" },
      "equipment": { "id": "uuid", "name": "Split 24.000 BTU" },
      "operation": { "id": "uuid", "number": 42, "type": "CORRETIVA", "status": "DRAFT" },
      "items": []
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### GET `/api/v1/budgets/:id`

Response 200: `Budget` completo com `items`, `approvals`, `customer`, `equipment`,
`operation`, `creator` e snapshots comerciais.

### GET `/api/v1/operations/:id/budgets`

Lista paginada dos orçamentos vinculados à Operation.

### POST `/api/v1/budgets`

Cria orçamento com snapshots de preço usando `PricingService`.

Payload:

```json
{
  "operationId": "uuid-opcional",
  "customerId": "uuid",
  "customerAddressId": "uuid-opcional",
  "equipmentId": "uuid-opcional",
  "title": "Troca de componentes",
  "description": "Proposta para manutenção corretiva",
  "discount": 0,
  "additional": 0,
  "expirationDate": "2026-07-17T00:00:00.000Z",
  "observations": "Condições comerciais",
  "status": "PENDING",
  "items": [
    { "productId": "uuid", "description": "Filtro G4", "quantity": 2 }
  ]
}
```

Response 201: Budget criado. Cada item retorna:

```json
{
  "productId": "uuid",
  "description": "Filtro G4",
  "quantity": "2.000",
  "unit": "UN",
  "snapshotCost": "42.50",
  "snapshotSalePrice": "78.00",
  "snapshotMargin": "43.85",
  "total": "156.00"
}
```

### PATCH `/api/v1/budgets/:id`

Atualiza orçamento editável. Enviar `items` substitui a lista inteira e recalcula snapshots.
Orçamentos `APPROVED`, `REJECTED`, `EXPIRED` ou `CANCELED` não são editáveis.

Payload parcial:

```json
{
  "title": "Troca de componentes revisada",
  "discount": 25,
  "items": [
    { "productId": "uuid", "quantity": 3 }
  ]
}
```

### PATCH `/api/v1/budgets/:id/approve`

Payload:

```json
{ "observation": "Aprovado pelo cliente" }
```

Regras:

- apenas `DRAFT` ou `PENDING` podem ser aprovados;
- orçamento vencido não pode ser aprovado;
- somente um Budget por Operation pode ficar `APPROVED`;
- publica `BUDGET_APPROVED` no Asset Lifecycle quando há equipamento.

### PATCH `/api/v1/budgets/:id/reject`

Payload:

```json
{ "observation": "Cliente solicitou revisão futura" }
```

Publica `BUDGET_REJECTED` no Asset Lifecycle quando há equipamento.

### DELETE `/api/v1/budgets/:id`

Cancela orçamento editável. Response 200:

```json
{ "deleted": true }
```

### GET `/api/v1/budgets/stats`

Query igual à listagem.

Response 200:

```json
{
  "total": 12,
  "approved": 4,
  "rejected": 2,
  "pending": 3,
  "potentialRevenue": "4820.00",
  "averageTicket": "1205.00"
}
```

### GET `/api/v1/budgets/history/:id`

Retorna histórico imutável paginado do orçamento.

Erros:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 400 | `VALIDATION_ERROR` | Payload/query inválido ou total negativo |
| 400 | `BUDGET_INVALID_RELATIONSHIP` | Customer/address/equipment/operation inconsistentes |
| 400 | `BUDGET_ITEM_REQUIRED` | Orçamento sem itens |
| 400 | `BUDGET_INVALID_STATUS` | Status inválido para criação/alteração/decisão |
| 401 | `UNAUTHORIZED` | Token ausente/inválido |
| 403 | `FORBIDDEN` | Papel sem permissão |
| 404 | `BUDGET_NOT_FOUND` | Budget inexistente |
| 404 | `CUSTOMER_NOT_FOUND` | Cliente inexistente/inativo |
| 404 | `EQUIPMENT_NOT_FOUND` | Equipamento inexistente/inativo |
| 404 | `OPERATION_NOT_FOUND` | Operation inexistente |
| 404 | `PRODUCT_NOT_FOUND` | Produto inexistente/inativo |
| 404 | `PRICING_NOT_FOUND` | Produto sem preço vigente |
| 409 | `BUDGET_APPROVED_IMMUTABLE` | Tentativa de alterar orçamento aprovado |
| 409 | `BUDGET_EXPIRED` | Tentativa de aprovar orçamento vencido |
| 409 | `BUDGET_MULTIPLE_APPROVAL` | Já existe Budget aprovado para a Operation |

Eventos de auditoria:

- `BUDGET_CREATED`;
- `BUDGET_UPDATED`;
- `BUDGET_APPROVED`;
- `BUDGET_REJECTED`;
- `BUDGET_CANCELED`.

Migration: `20260702100000_budget_domain`.

## Backlog — Budget Document Emission

O Budget agora emite documento oficial pelo Document Engine. O domínio Budget não chama
`DocumentBuilder` diretamente; a emissão passa por `DocumentEngineService`, cria/atualiza um
`OperationDocument` vinculado ao `budgetId` e usa os snapshots dos `BudgetItem`.

### POST `/api/v1/budgets/:id/render`

Emite ou reemite o PDF oficial do orçamento.

Access: `OWNER`, `MANAGER`.

Response 200:

```json
{
  "documentId": "uuid",
  "preview": {
    "version": "1.0",
    "metadata": {
      "operationId": "uuid|null",
      "budgetId": "uuid",
      "documentId": "uuid",
      "documentType": "BUDGET",
      "documentNumber": "ORC-000123"
    },
    "sections": []
  },
  "download": "/api/v1/budgets/{id}/download",
  "status": "READY",
  "document": {
    "id": "uuid",
    "operationId": "uuid|null",
    "budgetId": "uuid",
    "type": "BUDGET",
    "number": "ORC-000123",
    "status": "READY",
    "mimeType": "application/pdf",
    "fileSize": 12345,
    "renderedAt": "2026-07-02T12:00:00.000Z",
    "downloadReady": true
  }
}
```

Efeitos colaterais:

- cria/atualiza `OperationDocument`;
- salva PDF via storage do Document Engine;
- registra `BudgetHistory.DOCUMENT_RENDERED`;
- registra auditoria `DOCUMENT_RENDERED`;
- publica Asset Lifecycle `DOCUMENT_RENDERED` quando houver equipamento resolvido.

### GET `/api/v1/budgets/:id/download`

Baixa o PDF oficial já emitido.

Access: `OWNER`, `MANAGER`.

Response 200:

```json
{
  "id": "uuid",
  "operationId": "uuid|null",
  "budgetId": "uuid",
  "type": "BUDGET",
  "number": "ORC-000123",
  "status": "READY",
  "mimeType": "application/pdf",
  "fileSize": 12345,
  "renderedAt": "2026-07-02T12:00:00.000Z",
  "downloadReady": true,
  "contentBase64": "JVBERi0x..."
}
```

Erros adicionais:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 403 | `DOCUMENT_FORBIDDEN_TYPE` | Papel sem permissão para documento comercial |
| 404 | `BUDGET_NOT_FOUND` | Budget inexistente |
| 404 | `DOCUMENT_NOT_FOUND` | Download solicitado antes da emissão |
| 409 | `BUDGET_INVALID_STATUS` | Budget cancelado ou rejeitado |
| 409 | `DOCUMENT_DOWNLOAD_NOT_READY` | Documento existe, mas ainda não possui PDF pronto |
| 500 | `DOCUMENT_RENDER_FAILED` | Falha segura no render/PDF |

Migration: `20260702120000_budget_document_emission`.

## Financial Core

Financial é o único domínio autorizado a representar dinheiro operacional no Orbit V1.

Todos os endpoints exigem `OWNER` ou `MANAGER`. `OPERATOR` e `VIEWER` recebem `403`.

### Financial enums

```ts
type FinancialAccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';
type FinancialCategoryType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
type FinancialEntryType = 'RECEIVABLE' | 'PAYABLE' | 'TRANSFER';
type FinancialEntryStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'OVERDUE';
type FinancialEntryOrigin = 'MANUAL' | 'BUDGET' | 'PURCHASE' | 'OPERATION' | 'PMOC' | 'OTHER';
```

### GET `/api/v1/financial/accounts`

Query: `page`, `limit`, `search`, `type`, `active`.

Response 200: paginado com `FinancialAccount`.

### POST `/api/v1/financial/accounts`

```json
{
  "name": "Banco principal",
  "type": "BANK",
  "description": "Conta operacional",
  "openingBalance": 8500,
  "active": true
}
```

### PATCH `/api/v1/financial/accounts/:id`

Campos opcionais: `name`, `type`, `description`, `active`.

### DELETE `/api/v1/financial/accounts/:id`

Soft delete. Response:

```json
{ "deleted": true }
```

### GET `/api/v1/financial/categories`

Query: `page`, `limit`, `search`, `type`, `active`.

### POST `/api/v1/financial/categories`

```json
{
  "name": "Serviços técnicos",
  "type": "INCOME",
  "color": "#16A34A",
  "icon": "wrench",
  "active": true
}
```

### PATCH `/api/v1/financial/categories/:id`

Campos opcionais: `name`, `type`, `color`, `icon`, `active`.

### DELETE `/api/v1/financial/categories/:id`

Soft delete. Response:

```json
{ "deleted": true }
```

### GET `/api/v1/financial/entries`

Query:

- `page`;
- `limit`;
- `search`;
- `accountId`;
- `categoryId`;
- `type`;
- `origin`;
- `status`;
- `from`;
- `to`.

### GET `/api/v1/financial/entries/:id`

Retorna lançamento com conta, categoria, criador e allocations.

### POST `/api/v1/financial/entries`

```json
{
  "accountId": "uuid",
  "categoryId": "uuid",
  "type": "RECEIVABLE",
  "origin": "BUDGET",
  "originId": "uuid",
  "amount": 1250,
  "dueDate": "2026-07-10T00:00:00.000Z",
  "description": "Recebimento previsto",
  "notes": "Opcional",
  "status": "PENDING"
}
```

Regras:

- `RECEIVABLE` exige categoria `INCOME`;
- `PAYABLE` exige categoria `EXPENSE`;
- `TRANSFER` exige categoria `TRANSFER`;
- `CANCELED` e `OVERDUE` não podem ser status inicial;
- `PAID` inicial atualiza saldo imediatamente.

### PATCH `/api/v1/financial/entries/:id`

Edita lançamentos não finais. Campos opcionais:

- `accountId`;
- `categoryId`;
- `type`;
- `origin`;
- `originId`;
- `amount`;
- `dueDate`;
- `description`;
- `notes`.

### PATCH `/api/v1/financial/entries/:id/pay`

```json
{
  "paidAt": "2026-07-02T12:00:00.000Z",
  "notes": "Pago em dinheiro"
}
```

Regras:

- pagamento duplicado retorna `FINANCIAL_ENTRY_INVALID_STATE`;
- lançamento cancelado não pode ser pago;
- saldo da conta é atualizado em transação.

### PATCH `/api/v1/financial/entries/:id/cancel`

```json
{
  "reason": "Lançamento criado incorretamente"
}
```

Regras:

- lançamento pago não pode ser cancelado na V1;
- lançamento já cancelado retorna `FINANCIAL_ENTRY_INVALID_STATE`.

### GET `/api/v1/financial/stats`

Response 200:

```json
{
  "receivableToday": "1250.00",
  "payableToday": "320.00",
  "overdue": {
    "receivable": "0.00",
    "payable": "0.00"
  },
  "currentBalance": "10000.00",
  "projectedBalance": "10930.00",
  "income": "0.00",
  "expenses": "0.00",
  "monthlyFlow": [
    {
      "month": "2026-07",
      "income": "1250.00",
      "expenses": "320.00",
      "net": "930.00"
    }
  ]
}
```

### GET `/api/v1/financial/history/:id`

Histórico imutável paginado de um lançamento.

Erros:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 400 | `FINANCIAL_INVALID_RELATIONSHIP` | Categoria não corresponde ao tipo do lançamento |
| 400 | `VALIDATION_ERROR` | Payload/query inválido |
| 403 | `FORBIDDEN` | Papel sem permissão financeira |
| 404 | `FINANCIAL_ACCOUNT_NOT_FOUND` | Conta inexistente/inativa |
| 404 | `FINANCIAL_CATEGORY_NOT_FOUND` | Categoria inexistente/inativa |
| 404 | `FINANCIAL_ENTRY_NOT_FOUND` | Lançamento inexistente |
| 409 | `FINANCIAL_ENTRY_INVALID_STATE` | Transição inválida |

Migration: `20260702160000_financial_core`.

## Procurement & Purchasing

Domínio oficial de compras da V1. Todos os endpoints exigem `OWNER` ou `MANAGER`.

### Enums

```ts
type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELED';
type PurchaseHistoryAction = 'CREATED' | 'UPDATED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELED';
```

### GET `/api/v1/purchase-orders`

Query: `page`, `limit`, `search`, `supplierId`, `status`, `from`, `to`.

### GET `/api/v1/purchase-orders/:id`

Retorna pedido com fornecedor, itens, últimos recebimentos e criador.

### POST `/api/v1/purchase-orders`

```json
{
  "supplierId": "uuid",
  "expectedDelivery": "2026-07-15T00:00:00.000Z",
  "notes": "Compra de reposição"
}
```

### PATCH `/api/v1/purchase-orders/:id`

Edita pedidos `DRAFT` ou `SENT`.

### PATCH `/api/v1/purchase-orders/:id/send`

Muda `DRAFT` para `SENT`. Exige pelo menos um item.

### PATCH `/api/v1/purchase-orders/:id/cancel`

Cancela pedido ainda não recebido.

### GET `/api/v1/purchase-orders/:id/items`

Lista itens ativos do pedido.

### POST `/api/v1/purchase-orders/:id/items`

```json
{
  "productId": "uuid",
  "quantity": 10,
  "unit": "UN",
  "snapshotCost": 42.5,
  "snapshotDescription": "Filtro G4"
}
```

Snapshots são obrigatórios para custo/descrição. Renderizações futuras não dependem do Product.

### PATCH `/api/v1/purchase-order-items/:id`

Edita item ainda não recebido.

### DELETE `/api/v1/purchase-order-items/:id`

Soft delete de item ainda não recebido.

### GET `/api/v1/purchase-orders/:id/receipts`

Lista recebimentos do pedido.

### POST `/api/v1/purchase-orders/:id/receipts`

```json
{
  "receivedAt": "2026-07-02T12:00:00.000Z",
  "notes": "Recebimento parcial",
  "items": [
    { "itemId": "uuid", "quantity": 4 }
  ]
}
```

Efeitos:

- cria `PurchaseReceipt`;
- atualiza `receivedQuantity`;
- altera status para `PARTIALLY_RECEIVED` ou `RECEIVED`;
- cria `StockMovement(IN)` via Inventory;
- recalcula estoque pelo Inventory;
- cria `PurchaseHistory`.

### GET `/api/v1/purchase-orders/stats`

Retorna totais por status.

### GET `/api/v1/purchase-orders/history/:id`

Histórico imutável paginado.

Erros:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 400 | `VALIDATION_ERROR` | Payload/query inválido |
| 403 | `FORBIDDEN` | Papel sem permissão |
| 404 | `PURCHASE_ORDER_NOT_FOUND` | Pedido inexistente |
| 404 | `PURCHASE_ITEM_NOT_FOUND` | Item inexistente |
| 404 | `SUPPLIER_NOT_FOUND` | Fornecedor inexistente/inativo |
| 404 | `PRODUCT_NOT_FOUND` | Produto inexistente/inativo |
| 409 | `PURCHASE_INVALID_STATE` | Transição inválida |
| 409 | `PURCHASE_INVALID_RECEIPT` | Quantidade recebida excede compra |

Migration: `20260702180000_procurement_domain`.

## Sprint 19 — Integrity semantics and conflict behavior

No endpoint path or payload shape changed in Sprint 19. The backend now enforces stricter
concurrency semantics for existing commands. Clients must treat the following conflicts as stable
business responses and refresh the resource before retrying.

### Financial

Affected endpoints:

- `PATCH /api/v1/financial/entries/:id/pay`;
- `PATCH /api/v1/financial/entries/:id/cancel`.

Behavior:

- payment is accepted only if the entry is still payable at commit time;
- cancellation is accepted only if the entry is still cancelable at commit time;
- account balance is updated in the same transaction as status/history/audit/lifecycle.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `FINANCIAL_ENTRY_INVALID_STATE` | Duplicate payment, stale payment, paid entry cancellation, or payment/cancel race |

### Inventory and Operation Materials

Affected endpoints:

- `POST /api/v1/inventory/movements`;
- `POST /api/v1/operations/:id/materials`;
- `DELETE /api/v1/operations/:id/materials/:id`.

Behavior:

- negative stock movements are guarded by conditional balance updates;
- `StockMovement` is created only after the inventory delta is accepted;
- duplicate material removal cannot create duplicate `RETURN` movements.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `INVENTORY_NEGATIVE_STOCK` | Movement would make current/available stock negative |
| 409 | `NOT_FOUND` | Operation material was already removed |

### Procurement

Affected endpoint:

- `POST /api/v1/purchase-orders/:id/receipts`.

Behavior:

- receipt processing revalidates order status and item quantities inside the transaction;
- `receivedQuantity`, `PurchaseReceipt`, `StockMovement(IN)`, status, history and audit are atomic;
- concurrent over-receipt attempts fail safely.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `PURCHASE_INVALID_RECEIPT` | Quantity exceeds remaining purchase quantity or concurrent receipt conflict |
| 409 | `PURCHASE_INVALID_STATE` | Order state changed while receiving |

### Assignments

Affected endpoints:

- `PATCH /api/v1/assignments/:id/reassign`;
- `PATCH /api/v1/assignments/:id/accept`;
- `PATCH /api/v1/assignments/:id/reject`;
- `PATCH /api/v1/assignments/:id/start`;
- `PATCH /api/v1/assignments/:id/complete`.

Behavior:

- transition requires the same `status` and `assignedTo` at commit time;
- stale operator actions after reassignment fail with conflict;
- Assignment history remains append-only.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `ASSIGNMENT_INVALID_TRANSITION` | Duplicate, stale, or invalid Assignment transition |

### Budgets

Affected endpoints:

- `PATCH /api/v1/budgets/:id/approve`;
- `PATCH /api/v1/budgets/:id/reject`;
- `DELETE /api/v1/budgets/:id`.

Behavior:

- decisions require the same status at commit time;
- only one approved Budget per Operation is enforced by PostgreSQL partial unique index;
- final budgets remain immutable.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `BUDGET_INVALID_STATUS` | Duplicate/stale approval, rejection or cancellation |
| 409 | `BUDGET_MULTIPLE_APPROVAL` | Another Budget is already approved for the Operation |

### Pricing

Affected endpoints:

- `POST /api/v1/products/:id/pricing`;
- `PATCH /api/v1/pricing/:id`.

Behavior:

- active pricing validity ranges for the same product/organization cannot overlap;
- enforcement exists both in service transaction and database exclusion constraint.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `PRICING_OVERLAP` | Active pricing range overlaps another active range or revision race |

### Document Engine

Affected endpoints:

- `POST /api/v1/documents/:documentId/render`;
- `POST /api/v1/budgets/:id/render`.

Behavior:

- Budget still has a single official `OperationDocument` via `budgetId`;
- render metadata write is conditional on the document not changing during render;
- if a competing render wins, the newly-created binary is deleted and the request fails safely.

Conflict:

| HTTP | Code | Condition |
| ---- | ---- | --------- |
| 409 | `DOCUMENT_RENDER_FAILED` | Document changed while rendering; refresh and retry |

## Sprint 19.5 — verified PostgreSQL behavior

No contract shape changed. The following runtime behaviors are now backed by real PostgreSQL
integration/concurrency tests:

- `PATCH /financial/entries/:id/pay`
  - duplicate payment commits once;
  - independent concurrent payments to the same account are retried safely on PostgreSQL `P2034`;
  - final balance uses exact Decimal persistence.
- `PATCH /financial/entries/:id/cancel`
  - payment/cancel race ends in one coherent terminal state.
- `POST /operations/:id/materials`
  - overspend attempts cannot commit both when stock is insufficient.
- `DELETE /operations/:id/materials/:id`
  - duplicate return applies once.
- `POST /purchase-orders/:id/receipts`
  - concurrent over-receipt cannot exceed purchased quantity.
- Assignment transition endpoints
  - stale assignee transition loses against committed reassignment.
- Budget approval endpoints
  - duplicate approval commits once;
  - database prevents more than one approved Budget per Operation.
- Pricing endpoints
  - PostgreSQL exclusion constraint rejects active overlapping validity ranges.

Developer verification commands:

```bash
TEST_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_integrity_test?schema=public' npm run test:integration
TEST_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_integrity_test?schema=public' npm run test:concurrency
```

Safety rule: `TEST_DATABASE_URL` database name must end with `_test`.

## Sprint 19.6 — integrity closure semantics

Pricing validity:

- períodos ativos são half-open: `[validFrom, validUntil)`;
- `validUntil == next.validFrom` é adjacência válida;
- preço open-ended (`validUntil = null`) bloqueia preços futuros sobrepostos;
- revisão oficial fecha o preço anterior exatamente em `validFrom` da nova vigência;
- conflitos retornam `409 PRICING_OVERLAP`.

Document Engine:

- render concorrente do mesmo documento permite apenas um metadata winner;
- render concorrente perdedor recebe erro controlado `DOCUMENT_RENDER_FAILED`;
- falha de storage write não marca documento como renderizado;
- falha de banco após storage write tenta cleanup best-effort do binário recém-criado;
- download de metadata cujo binário não existe retorna erro controlado sem storage key.

Tested commands:

- `PATCH /assignments/:id/start`;
- `PATCH /assignments/:id/complete`;
- `PATCH /budgets/:id/approve`;
- `PATCH /budgets/:id/reject`;
- `DELETE /budgets/:id`;
- `POST /budgets/:id/render`;
- `GET /documents/:documentId/download`;
- `POST /products/:id/pricing`;
- `PATCH /pricing/:id`.

## Sprint 20 — AppSec contract hardening

No new business endpoint was added in this sprint.

Security-relevant contract clarifications:

- `POST /api/v1/financial/entries`
  - `status` is not accepted in the create payload.
  - `paidAt` is not accepted in the create payload.
  - New entries are always created as `PENDING`.
  - Payment must use `PATCH /api/v1/financial/entries/:id/pay`.
  - Attempts to send `status` or `paidAt` return `400 VALIDATION_ERROR` through the global
    `forbidNonWhitelisted` validation policy.
- `POST /api/v1/organization/assets`
  - MIME type and extension are not sufficient.
  - PDF must start with `%PDF-`.
  - PNG must contain the PNG magic signature.
  - JPEG must contain the JPEG magic signature.
  - SVG must be a real SVG payload and must not contain `<script`, inline event handlers,
    `javascript:` or `foreignObject`.
  - Invalid binary/signature returns `400 UPLOAD_INVALID_MIME_TYPE`.

Security test command:

```bash
TEST_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_security_test?schema=public' npm run test:security
```

The database name must end with `_test`.

## Sprint 20.5 — AppSec closure contract notes

No new business endpoint was added and no migration was created.

Asset Lifecycle public payload is now explicitly sanitized:

- `AssetLifecycleEvent.metadata` is not returned in public API responses;
- `performer.email` is not returned;
- `AssetLifecycleAttachment.storageKey`, `eventId` and `deletedAt` are not returned;
- attachments are handled only by authorized attachment endpoints.

Security closure suites validate Document Engine, Signatures, Maintenance Planning, PMOC,
Asset Lifecycle, Inventory, Procurement, audit metadata, rate limit/proxy trust and IDOR/BOLA
boundaries through the real NestJS HTTP application.

## Sprint 22 — production readiness contract notes

No business API contract was changed.

Operational endpoints verified:

- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `GET /api/v1/metrics`

`GET /api/v1/metrics` returns Prometheus text format (`text/plain; version=0.0.4`) and is the
official metrics route. It is not nested under `/health`.

Release verification scripts added:

```bash
npm run release:smoke:frontend
npm run release:workflows
```

Required environment for smoke/workflow scripts:

- `ORBIT_RELEASE_API_URL`
- `ORBIT_RELEASE_FRONTEND_URL` for frontend smoke
- `ORBIT_RELEASE_OWNER_EMAIL`
- `ORBIT_RELEASE_OWNER_PASSWORD`

The workflow runner uses only official API endpoints and fails on unexpected HTTP status, envelope
errors or missing identifiers.

## Sprint 22.5 — external closure contract notes

No API endpoint contract changed.

Operational decision:

- Orbit V1 remains single-company per installation.
- Production storage contract is local/block persistent storage via `STORAGE_PROVIDER=local`,
  `STORAGE_DRIVER=local` and absolute mounted `STORAGE_PATH`.
- Object storage is not an API/runtime contract certified for V1.
## Product Backlog Closure 02 — Document Engine contracts

Nenhum contrato HTTP novo foi criado.

Contratos oficiais reutilizados:

- `GET /api/v1/documents/operations/:operationId/:type/preview`
- `POST /api/v1/documents/operations/:operationId/:type/render`
- `GET /api/v1/documents/:documentId/preview`
- `POST /api/v1/documents/:documentId/render`
- `GET /api/v1/documents/:documentId/download`
- `GET /api/v1/documents/templates/:templateId/preview`

Mudança compatível:

- o payload `DocumentBlueprint.sections` passou a variar semanticamente por `DocumentTemplateType`
  para documentos operacionais, mantendo o mesmo formato de componentes já contratado.
- `download` continua retornando `contentBase64` apenas pelo endpoint autorizado de download;
  `storageKey` não é exposto.

## Document Semantics Closure — taxonomy update

Contrato de enum atualizado:

- `TECHNICAL_REPORT`: relatório técnico factual/operacional.
- `TECHNICAL_OPINION`: laudo técnico analítico.
- `REPORT`: tipo legado preservado para documentos históricos.

Endpoints não mudaram. Os mesmos contratos aceitam o novo tipo:

- `GET /api/v1/documents/operations/:operationId/TECHNICAL_OPINION/preview`
- `POST /api/v1/documents/operations/:operationId/TECHNICAL_OPINION/render`
- `GET /api/v1/documents/:documentId/preview`
- `GET /api/v1/documents/:documentId/download`

Model preview:

- `GET /api/v1/documents/templates/:templateId/preview`
- não renderiza;
- não cria `OperationDocument`;
- não fornece download oficial.

## Product Backlog Closure 03 — List PDF Exports and Signatures

### GET `/api/v1/operations/export`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Query: `search`, `customerId`, `equipmentId`, `operatorId`, `type`, `status`.

Response 200:

- raw `application/pdf`;
- `Content-Disposition: attachment; filename="orbit-operacoes-YYYY-MM-DD.pdf"`;
- `X-Export-Record-Count`;
- `X-Export-Page-Count`.

### GET `/api/v1/equipments/export`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Query: `search`, `customerId`, `addressId`, `type`, `status`.

Response: raw PDF, mesmo contrato de headers.

### GET `/api/v1/documents/export`

Roles: `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

Query: `search`, `customerId`, `equipmentId`, `operatorId`, `customer`, `equipment`, `operator`,
`type`, `status`, `from`, `to`.

Response: raw PDF, mesmo contrato de headers.

Export limits:

- limite V1: 500 registros;
- acima do limite retorna `400 BAD_REQUEST` com instrução para restringir filtros;
- exports são efêmeros e não criam `OperationDocument`;
- PDF deve iniciar com `%PDF-`;
- `storageKey`, path interno, blueprint bruto e metadados internos não são retornados.

### Signature listing semantics

`GET /api/v1/signatures` retorna apenas assinaturas com `deletedAt=null`.

- assinaturas ativas aparecem;
- assinaturas inativas aparecem;
- assinaturas soft-deleted não aparecem na listagem normal;
- resposta pública de assinatura retorna `hasImage`, não `imageStorageKey`.

`DELETE /api/v1/signatures/:id`:

- soft delete real;
- grava `active=false`;
- grava `deletedAt=now`;
- não remove arquivo do storage para preservar histórico.

## Product Backlog Closure 04 — Avatar e Notifications

`POST /api/v1/users/avatar` retorna metadados públicos sem `storageKey`.

```json
{
  "success": true,
  "data": {
    "id": "1f3f8e65-6d6e-40cc-9a6b-fd8e3d68e6c1",
    "mimeType": "image/png",
    "originalFileName": "avatar-1783700000000.png",
    "fileSize": 18432,
    "createdAt": "2026-07-10T17:00:00.000Z"
  }
}
```

### GET `/api/v1/notifications`

Query: `page`, `limit` máximo 50, `unread`, `type`.

### GET `/api/v1/notifications/unread-count`

```json
{ "success": true, "data": { "count": 3 } }
```

### PATCH `/api/v1/notifications/:id/read`

Marca como lida apenas notificação do usuário autenticado. Cross-user retorna
`NOTIFICATION_NOT_FOUND`.

### PATCH `/api/v1/notifications/read-all`

```json
{ "success": true, "data": { "updated": 3 } }
```
