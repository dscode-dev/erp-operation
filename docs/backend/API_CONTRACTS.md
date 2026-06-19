# API Contracts

## Conventions

- Base path: `/api/v1`
- Media type: `application/json`
- Datas: ISO 8601 UTC.
- Campos JSON: `camelCase`, exceto contratos legados explícitos.
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

## Authentication model

- Access token: JWT HS256, padrão de 900 segundos.
- Refresh token: JWT HS256, padrão de 2.592.000 segundos.
- Refresh tokens são single-use: cada refresh retorna um par novo.
- Rotação ou logout invalidam imediatamente o access token vinculado à sessão anterior.
- Reutilizar um refresh já rotacionado é tratado como replay e revoga todas as sessões ativas do
  usuário.

## POST `/api/v1/auth/login`

Cria uma sessão.

### Request

```json
{
  "email": "owner@example.com",
  "password": "user-supplied-password"
}
```

`email` é normalizado com trim e lowercase. Propriedades extras são rejeitadas.

### Response — 200

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

`expiresIn` informa a validade do access token em segundos.

### Errors

| HTTP | Code                       | Condition                        |
| ---- | -------------------------- | -------------------------------- |
| 400  | `VALIDATION_ERROR`         | Email/body inválido              |
| 401  | `AUTH_INVALID_CREDENTIALS` | Email ou senha incorretos        |
| 401  | `AUTH_USER_INACTIVE`       | Conta desativada                 |
| 429  | `RATE_LIMIT_EXCEEDED`      | Mais de 10 tentativas por minuto |
| 500  | `INTERNAL_SERVER_ERROR`    | Falha interna não exposta        |

Credencial inválida:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {}
  }
}
```

## POST `/api/v1/auth/refresh`

Rotaciona o refresh token e a sessão associada.

### Request

```json
{
  "refreshToken": "<current-refresh-jwt>"
}
```

### Response — 200

```json
{
  "success": true,
  "data": {
    "accessToken": "<new-access-jwt>",
    "refreshToken": "<new-refresh-jwt>",
    "expiresIn": 900
  }
}
```

O cliente deve substituir os dois tokens de forma atômica e nunca reutilizar o refresh anterior.

### Errors

| HTTP | Code                    | Condition                                      |
| ---- | ----------------------- | ---------------------------------------------- |
| 400  | `VALIDATION_ERROR`      | Body ausente ou token fora do formato JWT      |
| 401  | `AUTH_INVALID_TOKEN`    | Token inválido, expirado ou desconhecido       |
| 401  | `AUTH_SESSION_REVOKED`  | Token já rotacionado/revogado; possível replay |
| 429  | `RATE_LIMIT_EXCEEDED`   | Mais de 20 requisições por minuto              |
| 500  | `INTERNAL_SERVER_ERROR` | Falha interna                                  |

Replay/revogação:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_SESSION_REVOKED",
    "message": "Refresh token has already been used or revoked",
    "details": {}
  }
}
```

## POST `/api/v1/auth/logout`

Revoga a sessão identificada pelo refresh token. Não requer access token.

### Request

```json
{
  "refreshToken": "<current-refresh-jwt>"
}
```

### Response — 200

```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

Repetir logout com o mesmo token criptograficamente válido é idempotente.

### Errors

| HTTP | Code                    | Condition                                |
| ---- | ----------------------- | ---------------------------------------- |
| 400  | `VALIDATION_ERROR`      | Body/token malformado                    |
| 401  | `AUTH_INVALID_TOKEN`    | Token inválido, expirado ou desconhecido |
| 429  | `RATE_LIMIT_EXCEEDED`   | Mais de 20 requisições por minuto        |
| 500  | `INTERNAL_SERVER_ERROR` | Falha interna                            |

## GET `/api/v1/auth/me`

Retorna o usuário da sessão atual. Password hash e token hash nunca são retornados.

### Request

```http
Authorization: Bearer <accessToken>
```

### Response — 200

```json
{
  "success": true,
  "data": {
    "id": "f33e0c47-1cb8-4bc9-b4c7-97356ff8749e",
    "email": "owner@example.com",
    "username": "ninja",
    "name": "Darlan Simplicio",
    "role": "OWNER",
    "isActive": true
  }
}
```

`role` é um de `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`.

### Errors

| HTTP | Code                   | Condition                              |
| ---- | ---------------------- | -------------------------------------- |
| 401  | `UNAUTHORIZED`         | Bearer token ausente/malformado        |
| 401  | `AUTH_INVALID_TOKEN`   | Access token inválido ou expirado      |
| 401  | `AUTH_SESSION_REVOKED` | Sessão rotacionada, revogada ou expira |
| 401  | `AUTH_USER_INACTIVE`   | Usuário desativado                     |
| 403  | `FORBIDDEN`            | Papel não autorizado pela rota         |
| 429  | `RATE_LIMIT_EXCEEDED`  | Limite global excedido                 |

Sem bearer:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Bearer access token is required",
    "details": {}
  }
}
```

## GET `/api/v1/health`

Contrato da Sprint 0 preservado.

### Response — 200

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 124.199,
    "timestamp": "2026-06-19T12:16:22.810Z",
    "database_connection": "connected"
  }
}
```

### Response — 503

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "uptime": 130.412,
    "timestamp": "2026-06-19T12:16:29.023Z",
    "database_connection": "disconnected"
  }
}
```

## Validation errors

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "violations": ["email must be an email"]
    }
  }
}
```

## Compatibility policy

- Contratos da Sprint 0 foram preservados.
- Campos opcionais podem ser adicionados de forma compatível.
- Remoções, renomes ou mudanças semânticas exigem nova versão.
- Clientes devem ignorar campos desconhecidos.
