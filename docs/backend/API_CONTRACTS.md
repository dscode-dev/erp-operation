# API Contracts

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
  "isDefault": false
}
```

Response 201: objeto `DocumentTemplate` criado.

### PATCH `/api/v1/organization/templates/:id`

Role: `OWNER`. `:id` deve ser UUID v4.

Request: todos os campos são opcionais.

```json
{
  "name": "Orçamento padrão atualizado",
  "observations": "Validade de 7 dias",
  "isDefault": true
}
```

Response 200: objeto `DocumentTemplate` atualizado.

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

| HTTP | Code                        | Condition                                |
| ---- | --------------------------- | ---------------------------------------- |
| 400  | `VALIDATION_ERROR`          | Body ou UUID inválido                    |
| 404  | `NOT_FOUND`                 | Template inexistente na organização      |
| 403  | `FORBIDDEN`                 | Papel sem permissão                      |
| 409  | `SYSTEM_TEMPLATE_PROTECTED` | Tentativa de excluir template do sistema |

Quando `isDefault=true`, templates anteriores do mesmo `type` são marcados como não-default.
Templates criados pela API recebem `isSystem=false`. Templates com `isSystem=true` podem ser
editados, mas não excluídos.

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
