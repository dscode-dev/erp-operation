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
StorageProvider; o banco armazena apenas metadados e `imageStorageKey`.

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
        "imageStorageKey": "documents/signatures/8f2c.../signature.png",
        "mimeType": "image/png",
        "originalFileName": "assinatura.png",
        "fileSize": 18432,
        "active": true,
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
| POST   | `/operations`                 | OWNER/MANAGER/OPERATOR        | Cria a Operation (operador = usuário autenticado) + OS rascunho                            |
| PATCH  | `/operations/:id`             | OWNER/MANAGER/OPERATOR        | Atualiza status/datas/checklist/observações                                                |

`POST /operations` (body):

```jsonc
{
  "customerId": "<uuid>", // obrigatório
  "addressId": "<uuid>", // opcional (deve pertencer ao cliente)
  "equipmentId": "<uuid>", // opcional (deve pertencer ao cliente)
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

Fotos: PNG/JPEG (data URL), máx. 16 por operação, 5 MiB cada; persistidas via
storage provider. Assinatura: data URL armazenada como texto.

Errors: `CUSTOMER_NOT_FOUND` (404), `VALIDATION_ERROR` (400, endereço/equipamento
fora do cliente), `OPERATION_PHOTO_INVALID` (400), `OPERATION_NOT_FOUND` (404),
`OPERATION_PHOTO_NOT_FOUND` (404).

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
  metadata: Record<string, unknown>;
  createdAt: string;
  equipment?: { id: string; name: string; tag: string; type: string; status: string };
  operation?: { id: string; number: number; type: string; status: string } | null;
  document?: { id: string; number: string; type: string; status: string } | null;
  performer?: { id: string; name: string; email: string; username: string } | null;
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
  eventId: string;
  storageKey: string;
  originalFileName: string;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg';
  fileSize: number;
  category: string;
  deletedAt: string | null;
  createdAt: string;
};
```

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
        "metadata": { "operationNumber": 12 },
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
          "email": "joao@climatize.example",
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
