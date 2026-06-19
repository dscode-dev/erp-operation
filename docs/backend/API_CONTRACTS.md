# API Contracts

## Conventions

- Base path: `/api/v1`
- Media type: `application/json`
- Datas: ISO 8601 em UTC.
- Campos JSON: `camelCase`, exceto campos explicitamente definidos no contrato.
- Toda resposta inclui `X-Request-Id`.
- O cliente pode enviar `X-Request-Id` com 1 a 128 caracteres em
  `[A-Za-z0-9._-]`. Valores ausentes ou inválidos são substituídos por UUID.
- Rate-limit padrão: 100 requisições por janela de 60 segundos, configurável por ambiente.

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

O frontend deve tomar decisões programáticas por `error.code`, nunca por `error.message`.

## GET `/api/v1/health`

Verifica o processo da API e executa uma consulta real `SELECT 1` no PostgreSQL.

### Authentication

Não requer autenticação.

### Request

Sem query parameters e sem body.

Headers opcionais:

```http
X-Request-Id: frontend-check-01
```

### Response — 200 OK

Retornado quando a conexão com PostgreSQL está operacional.

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

| Field                      | Type    | Contract                                  |
| -------------------------- | ------- | ----------------------------------------- |
| `success`                  | boolean | Sempre `true` para a resposta do endpoint |
| `data.status`              | string  | `ok` ou `degraded`                        |
| `data.uptime`              | number  | Segundos desde o startup do processo      |
| `data.timestamp`           | string  | Data/hora UTC ISO 8601                    |
| `data.database_connection` | string  | `connected` ou `disconnected`             |

### Response — 503 Service Unavailable

Retornado quando o processo responde, mas a consulta ao PostgreSQL falha. O payload de health é
preservado para observabilidade:

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

O HTTP 503, e não o valor de `success`, determina que a instância não está pronta para receber
tráfego.

### Response headers

Exemplo:

```http
X-Request-Id: frontend-check-01
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 60
Content-Type: application/json; charset=utf-8
```

## Global errors

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/v1/unknown",
    "details": {}
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "ThrottlerException: Too Many Requests",
    "details": {}
  }
}
```

### 500 Internal Server Error

Detalhes internos e stack trace nunca são enviados ao cliente.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "details": {}
  }
}
```

## Compatibility policy

- Mudanças compatíveis podem adicionar campos opcionais.
- Remoção, renomeação, mudança de tipo ou semântica exige nova versão da API.
- O frontend deve ignorar campos desconhecidos.
- Todos os endpoints futuros devem permanecer sob `/api/v1` até uma mudança incompatível
  deliberada.
