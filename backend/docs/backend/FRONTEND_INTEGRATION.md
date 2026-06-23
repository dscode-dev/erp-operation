# Frontend Integration

## Base URL

Desenvolvimento padrão:

```text
http://localhost:3000/api/v1
```

Cada instalação white label fornece sua própria origem. O path permanece `/api/v1`.

## Types

```ts
export type Role = 'OWNER' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

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

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
};
```

## Login flow

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "owner@example.com",
  "password": "user-password"
}
```

Resposta:

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

Após login:

1. Armazenar access token e refresh token.
2. Calcular a expiração do access token usando `expiresIn`.
3. Consultar `GET /auth/me`.
4. Montar navegação por `role`, sem tratar ocultação de UI como autorização real.

O backend sempre aplica a autorização.

## Token storage

- Access token: prefira memória da aplicação.
- PWA mobile: use storage seguro/criptografado da plataforma para refresh token.
- Web: evite `localStorage` quando houver alternativa arquitetural; o contrato atual retorna token
  no body e não usa cookies.
- Nunca registre tokens em logs, analytics, crash reports ou URLs.

## Authenticated requests

```ts
const response = await fetch(`${API_BASE_URL}/auth/me`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'X-Request-Id': crypto.randomUUID(),
  },
});
```

## Refresh flow

```http
POST /auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "<current-refresh-token>"
}
```

Cada refresh retorna um novo access e um novo refresh token. A atualização local deve ser atômica.

Regras obrigatórias no cliente:

1. Permitir somente uma operação de refresh em andamento (`single-flight`).
2. Enfileirar requests que receberam 401 enquanto o refresh ocorre.
3. Substituir ambos os tokens antes de repetir requests.
4. Nunca repetir refresh com o token anterior.
5. Se refresh retornar 401, limpar sessão e encaminhar ao login.

Reusar token antigo dispara proteção contra replay e revoga todas as sessões ativas do usuário.

Exemplo conceitual:

```ts
let refreshPromise: Promise<TokenPair> | null = null;

function refreshOnce(currentRefreshToken: string): Promise<TokenPair> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh(currentRefreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
```

## Handling 401

| Error code                 | Frontend behavior                                     |
| -------------------------- | ----------------------------------------------------- |
| `UNAUTHORIZED`             | Não há bearer válido; tentar refresh se houver sessão |
| `AUTH_INVALID_TOKEN`       | Tentar refresh uma vez; se falhar, limpar sessão      |
| `AUTH_SESSION_REVOKED`     | Limpar tokens imediatamente e abrir login             |
| `AUTH_USER_INACTIVE`       | Limpar sessão e informar que a conta está desativada  |
| `AUTH_INVALID_CREDENTIALS` | Manter tela de login e mostrar erro genérico          |

Não faça loop de refresh. Marque a repetição do request e limite a uma tentativa.

## Logout flow

```http
POST /auth/logout
Content-Type: application/json
```

```json
{
  "refreshToken": "<current-refresh-token>"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

Depois da resposta, apague access e refresh tokens. Em falha de rede, apague os tokens locais de
qualquer forma; a sessão remota expira no máximo conforme a validade configurada.

Logout não precisa de access token, portanto continua disponível quando ele expira.

## Session bootstrap

Ao abrir/recarregar a aplicação:

1. Se não houver refresh token, mostrar login.
2. Se houver access token ainda válido, chamar `/auth/me`.
3. Se não houver access válido, executar um único refresh.
4. Salvar o novo par e chamar `/auth/me`.
5. Em qualquer 401 do refresh, limpar tudo e mostrar login.

## RBAC in the UI

Papéis oficiais:

- `OWNER`
- `MANAGER`
- `OPERATOR`
- `VIEWER`

O frontend pode ocultar ações para experiência do usuário, mas deve aceitar HTTP 403 como resposta
autoritativa. Operadores nunca devem receber UI financeira ou administrativa. Consulte a matriz
completa em `SECURITY.md`.

## Request IDs and errors

Capture `X-Request-Id` em falhas para suporte. Decisões programáticas usam `error.code`, não
`error.message`.

Em HTTP 429, respeite backoff. Login possui limite de 10/minuto; refresh e logout, 20/minuto.

## Health

`GET /health` continua público:

- HTTP 200: aplicação e banco disponíveis;
- HTTP 503: processo disponível, banco indisponível.
