# Backend State

## Current milestone

**Sprint 1 — Auth, RBAC e Controle de Acesso**
Status: concluída em 19 de junho de 2026.

A foundation da Sprint 0 foi preservada. O backend agora possui identidade, sessões, autorização
por papel e auditoria de autenticação. Nenhum módulo de negócio do ERP foi criado.

## Architecture

- NestJS 11 e TypeScript estrito.
- API versionada em `/api/v1`.
- PostgreSQL e Prisma.
- JWT HS256 com issuer, audience, tipo de token, `jti` e expiração validados.
- Senhas e refresh tokens protegidos com Argon2id.
- `JwtAuthGuard` e `RoleGuard` registrados globalmente.
- Autorização deny-by-default: rotas são protegidas, exceto quando marcadas com `@Public()`.
- Decorators disponíveis:
  - `@Public()`;
  - `@CurrentUser()`;
  - `@Roles(...)`.
- Access tokens são vinculados à sessão persistida pelo claim `sid`.
- Refresh rotation é transacional.
- Reutilização de refresh token revogado invalida todas as sessões ativas do usuário.
- Auditoria persistente em `AuditLog`.

Módulos atuais:

```text
src/modules/
├── auth/
├── config/
├── database/
└── health/
```

Somente `auth` e `health` expõem endpoints.

## Environment

Variáveis JWT obrigatórias:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN_SECONDS` — recomendado e usado no exemplo: `900`
- `JWT_REFRESH_EXPIRES_IN_SECONDS` — recomendado e usado no exemplo: `2592000`
- `JWT_ISSUER`
- `JWT_AUDIENCE`

`OWNER_EMAIL` é exigida apenas na execução do seed inicial.

Os demais contratos de ambiente da Sprint 0 permanecem válidos. Consulte `.env.example`.

## Persistence

Migrations:

1. `20260619090000_foundation`
2. `20260619130000_auth_rbac`

### Enum `Role`

- `OWNER`
- `MANAGER`
- `OPERATOR`
- `VIEWER`

### `users`

- `id` UUID;
- `email` único;
- `username` único;
- `name`;
- `password_hash`;
- `role`;
- `is_active`;
- `last_login_at`;
- `created_at`;
- `updated_at`.

### `refresh_tokens`

- `id` UUID, também usado como `jti`;
- `user_id`, FK para `users` com cascade delete;
- `token_hash`;
- `expires_at`;
- `revoked_at`;
- `created_at`.

Somente o hash Argon2id do refresh token é persistido.

### `audit_logs`

Estrutura da Sprint 0 foi preservada. Eventos implementados:

- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `LOGOUT`
- `TOKEN_REFRESH`

`actor` recebe o UUID do usuário quando conhecido. `metadata` registra request ID, IP, user agent e
contexto mínimo da sessão. Senhas e tokens nunca são auditados.

## Endpoints

| Method | Path                   | Public | Purpose                       |
| ------ | ---------------------- | ------ | ----------------------------- |
| GET    | `/api/v1/health`       | Sim    | Readiness da API e PostgreSQL |
| POST   | `/api/v1/auth/login`   | Sim    | Criar sessão                  |
| POST   | `/api/v1/auth/refresh` | Sim    | Rotacionar sessão             |
| POST   | `/api/v1/auth/logout`  | Sim    | Revogar sessão por refresh    |
| GET    | `/api/v1/auth/me`      | Não    | Identidade autenticada        |

O logout é público no guard de access token porque deve continuar utilizável quando o access token
expirar. Ele exige e valida o refresh token no body.

## Seed OWNER

O seed cria uma única conta inicial:

- username: `ninja`;
- name: `Darlan Simplicio`;
- role: `OWNER`;
- email: valor de `OWNER_EMAIL`.

Execução após build/migrations:

```bash
docker compose exec api npm run prisma:seed
```

Na primeira execução, uma senha aleatória forte é impressa uma única vez. Execuções posteriores são
idempotentes e não alteram nem reexibem credenciais.

## Security decisions

- Access token padrão: 15 minutos, configurável.
- Refresh token padrão: 30 dias, configurável.
- Segredos de access e refresh obrigatoriamente distintos.
- Algoritmo JWT fixado em HS256 na assinatura e verificação.
- Claims de refresh não são aceitos como access tokens, e vice-versa.
- Usuário e sessão são consultados no banco em cada uso de access token.
- Desativação do usuário, logout e rotação têm efeito imediato sobre access tokens.
- Login usa verificação Argon2 dummy para reduzir diferença temporal entre usuário existente e
  inexistente.
- Login: 10 tentativas por minuto.
- Refresh e logout: 20 requisições por minuto.
- DTOs rejeitam propriedades desconhecidas, formatos inválidos e entradas excessivamente longas.
- O RoleGuard nunca confia no papel presente no request do cliente; usa o usuário carregado do
  banco.

Consulte `SECURITY.md` para a matriz oficial de permissões.

## Verification performed

- `npm run build`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 3 testes do RoleGuard aprovados.
- `npm run prisma:validate`: aprovado.
- `npm audit`: zero vulnerabilidades, incluindo dependências de desenvolvimento.
- Build Docker multi-stage: aprovado.
- PostgreSQL e API em containers: saudáveis.
- Migrations executadas do zero: aprovadas.
- Seed OWNER inicial e reexecução idempotente: aprovados.
- Login válido e inválido: aprovados.
- `GET /auth/me` com e sem token: aprovado.
- Rotação de refresh token: aprovada.
- Access e refresh antigos rejeitados após rotação: aprovados.
- Logout e invalidação imediata do access token: aprovados.
- Detecção de replay com revogação das sessões ativas: aprovada.
- Auditoria dos quatro eventos: verificada diretamente no PostgreSQL.
- Hashes Argon2id e ausência de JWT puro no banco: verificados.

## Explicitly not implemented

- CRUD de usuários;
- recuperação ou alteração de senha;
- envio de e-mail;
- MFA;
- clientes;
- equipamentos;
- catálogos;
- orçamentos;
- ordens de serviço;
- documentos, uploads e PDFs;
- dashboards ou relatórios funcionais.

## Future work

- CRUD administrativo de usuários somente em sprint autorizada.
- Recuperação de senha e MFA.
- Política de limpeza de refresh tokens expirados/revogados.
- Permissões granulares além dos papéis oficiais, caso uma sprint futura exija.
- Configuração explícita de trusted proxies antes de deploy atrás de proxy reverso.

Toda sprint futura deve preservar os envelopes HTTP, versionamento, guards globais e documentação
obrigatória.
