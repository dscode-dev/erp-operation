# Frontend Integration

## Base URL

Em desenvolvimento com o Docker Compose padrão:

```text
http://localhost:3000/api/v1
```

Em ambientes publicados, a origem é definida pelo deploy, mas o path versionado permanece
`/api/v1`.

Exemplo:

```ts
const API_BASE_URL = `${window.location.protocol}//api.example.com/api/v1`;
```

Prefira receber a origem por variável de ambiente do frontend. Não fixe URLs de cliente no código,
pois cada instalação white label é isolada.

## Current endpoint

```http
GET /api/v1/health
```

Não há autenticação na Sprint 0.

## Standard success response

Todas as respostas bem-sucedidas são envelopadas:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

O payload específico sempre está em `data`.

Tipos sugeridos:

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type Health = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  database_connection: 'connected' | 'disconnected';
};
```

## Standard error response

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

Tipos sugeridos:

```ts
export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};
```

Integração recomendada:

1. Verificar primeiro o status HTTP.
2. Fazer parse do JSON.
3. Em sucesso, retornar `body.data`.
4. Em erro, mapear comportamento por `body.error.code`.
5. Usar `body.error.message` apenas para apresentação quando apropriado.
6. Registrar o header `X-Request-Id` em telemetria e suporte.

Exemplo sem dependência de framework:

```ts
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const body = (await response.json()) as ApiSuccess<T> | ApiError;

  if (!response.ok || !body.success) {
    const requestId = response.headers.get('x-request-id');
    const error = !body.success ? body.error : undefined;
    throw new Error(
      `${error?.code ?? `HTTP_${response.status}`}: ${
        error?.message ?? 'Request failed'
      }${requestId ? ` [requestId=${requestId}]` : ''}`,
    );
  }

  return body.data;
}
```

## Health behavior

- HTTP `200`: API e banco disponíveis.
- HTTP `503`: API respondeu, mas o banco está indisponível.
- Falha de rede/timeout: processo, proxy ou rede indisponível.

O payload HTTP 503 ainda usa o envelope de sucesso e informa `status: "degraded"`. Para readiness,
sempre considere `response.ok`.

## CORS

O backend aceita somente origens exatas declaradas em `CORS_ORIGINS`. Para adicionar uma origem de
frontend/PWA, altere o ambiente da instalação e reinicie a API. Wildcards não são aceitos.

Headers permitidos:

- `Authorization`
- `Content-Type`
- `X-Request-Id`

O header `X-Request-Id` é exposto ao JavaScript do navegador.

## Request IDs

O frontend pode gerar um identificador de correlação e enviá-lo:

```ts
headers.set('X-Request-Id', crypto.randomUUID());
```

O backend sempre devolve o ID efetivamente utilizado no mesmo header. IDs inválidos são
substituídos.

## Rate limiting

O limite padrão é 100 requisições por 60 segundos por origem identificada pelo backend. Leia:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

Em HTTP 429, aplique backoff e evite retry imediato em loop.

## Authentication status

JWT, refresh token e RBAC ainda não existem. Não implemente fluxo de login no frontend com base
nesta sprint. Os contratos serão adicionados em sprint própria.
