# Security

## Security posture

A instalação é isolada por cliente: aplicação, PostgreSQL, storage e configuração próprios. Não há
banco multi-tenant compartilhado. A Sprint 0 estabelece controles transversais; autenticação e RBAC
serão implementados somente em sprint autorizada.

## Environment validation

A aplicação usa validação fail-fast antes de abrir a porta HTTP.

- Variáveis obrigatórias vazias interrompem o startup.
- `APP_PORT` aceita somente inteiro entre 1 e 65535.
- `CORS_ORIGINS` exige origens HTTP/HTTPS exatas e rejeita `*`.
- Segredos JWT devem ser diferentes e ter no mínimo 32 caracteres.
- `STORAGE_PROVIDER` aceita apenas `local` ou `s3`.
- Rate limit aceita somente inteiros positivos.

Segredos reais ficam no `.env` local ou no mecanismo de secrets do ambiente e nunca devem ser
commitados. O `.env.example` contém apenas placeholders.

## Helmet

Helmet é aplicado globalmente antes das rotas. Ele define headers defensivos, incluindo:

- Content Security Policy;
- HSTS;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- Referrer Policy;
- Cross-Origin policies.

Esses headers protegem a superfície HTTP, mas não substituem TLS. Produção deve publicar a API
somente atrás de HTTPS.

## CORS

CORS é configurado pela variável `CORS_ORIGINS`, uma lista separada por vírgulas.

Exemplo:

```text
CORS_ORIGINS=https://erp.example.com,https://pwa.example.com
```

Decisões:

- wildcard é proibido;
- apenas origem exata é aceita;
- credenciais cross-origin estão desabilitadas nesta sprint;
- métodos permitidos: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`;
- headers aceitos: `Authorization`, `Content-Type`, `X-Request-Id`;
- `X-Request-Id` é exposto ao cliente;
- preflight pode ser cacheado por 600 segundos.

Quando refresh tokens forem implementados, a estratégia de transporte será revisada antes de
habilitar qualquer cookie ou `credentials: true`.

## Rate limiting

`ThrottlerGuard` é global e deny-by-default para todos os endpoints.

Defaults:

- janela: 60.000 ms;
- limite: 100 requisições.

Configuração:

- `RATE_LIMIT_TTL_MS`;
- `RATE_LIMIT_MAX`.

Ao exceder o limite, a API responde HTTP 429 no envelope global com
`code=RATE_LIMIT_EXCEEDED`.

Antes de operar atrás de proxy reverso, a lista de proxies confiáveis deve ser configurada
explicitamente. Não se deve confiar indiscriminadamente em `X-Forwarded-For`, pois isso permitiria
bypass do limite por falsificação de IP.

## Request IDs

O middleware global:

1. lê `X-Request-Id`;
2. aceita somente 1 a 128 caracteres alfanuméricos, ponto, underscore ou hífen;
3. gera UUID criptograficamente seguro quando ausente ou inválido;
4. adiciona o valor à requisição, resposta e logs.

Request IDs servem para correlação e nunca são usados como autenticação, autorização ou chave de
idempotência.

## Structured logging

Logs são JSON de uma linha, direcionados para stdout/stderr e adequados à coleta por container.

Eventos mínimos:

- startup;
- shutdown;
- requisições HTTP;
- exceções.

Logs de request incluem request ID, método, path, status, duração, user agent e IP. Exceções são
registradas com stack no servidor. A resposta HTTP 500 nunca expõe stack ou detalhes internos.

Regras para sprints futuras:

- não registrar senhas, tokens, cookies, authorization headers ou secrets;
- mascarar dados pessoais e financeiros;
- não incluir bodies completos por padrão;
- eventos sensíveis persistentes devem usar `AuditLog`, não apenas log operacional.

## Global error handling

Todas as exceções HTTP são convertidas para um formato único. Erros inesperados retornam mensagem
genérica:

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

Stack traces permanecem somente nos logs estruturados.

## Database and containers

- PostgreSQL não publica porta no host pelo Compose.
- Serviços comunicam-se por rede Docker dedicada.
- API aguarda o healthcheck do PostgreSQL.
- Migrations são aplicadas antes do startup.
- Container da API executa como usuário não-root.
- `dumb-init` trata sinais e permite shutdown gracioso.
- Volume PostgreSQL persiste dados fora do ciclo de vida do container.

Produção deve substituir todas as credenciais de exemplo, restringir acesso ao host e adotar backup
criptografado e testado. Backup/restore operacional está fora do escopo desta sprint.

## Dependency security

- Lockfile versionado para builds reproduzíveis.
- `npm audit --omit=dev` validado com zero vulnerabilidades em 19 de junho de 2026.
- `multer` está fixado em `2.2.0` via `overrides` devido a vulnerabilidades conhecidas na versão
  transitiva anteriormente resolvida pelo adapter Express.
- Atualizações devem passar por build, lint, audit e validação integrada antes de merge.

## Future authentication and authorization strategy

Ainda não implementada. A direção obrigatória para a sprint de autenticação é:

- access token JWT de curta duração;
- refresh token opaco ou JWT com rotação a cada uso;
- armazenar somente hash do refresh token no banco;
- detectar reutilização e revogar a família de tokens;
- segredos separados para access e refresh;
- claims mínimas, com identificador de usuário, papel e identificador único do token;
- validação estrita de algoritmo, issuer, audience, expiração e clock tolerance;
- logout com revogação server-side;
- RBAC deny-by-default aplicado por guards;
- decorators apenas para declarar permissões, sem confiar em papel enviado pelo cliente;
- auditoria de login, falhas, refresh, logout e ações administrativas;
- rate limit mais restritivo em login e refresh.

Separação mínima prevista:

- operadores: sem acesso a dados financeiros e configurações administrativas;
- perfis administrativos/financeiros: acesso apenas conforme permissão explícita;
- nenhuma rota sensível será protegida apenas por ocultação no frontend.

O modelo de usuário, papéis, permissões e tokens só será criado quando entrar formalmente no escopo.
