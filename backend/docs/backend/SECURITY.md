# Security

## Security posture

Cada cliente opera instalação, banco, storage e configuração isolados. Não existe multi-tenancy
compartilhada. A autenticação e autorização seguem deny-by-default.

## Official roles V1

Somente estes papéis existem:

- `OWNER`
- `MANAGER`
- `OPERATOR`
- `VIEWER`

## Official permission matrix V1

| Módulo       | OWNER | MANAGER | OPERATOR | VIEWER  |
| ------------ | ----- | ------- | -------- | ------- |
| Financeiro   | Sim   | Não     | Não      | Não     |
| Usuários     | Sim   | Não     | Não      | Não     |
| Clientes     | Sim   | Sim     | Leitura  | Leitura |
| Equipamentos | Sim   | Sim     | Sim      | Leitura |
| OS           | Sim   | Sim     | Sim      | Leitura |
| Relatórios   | Sim   | Sim     | Leitura  | Leitura |

Essa matriz é normativa para módulos futuros. Nesta sprint, esses módulos não foram implementados.
Operadores não podem acessar financeiro nem configurações administrativas.

## Password hashing

Senhas usam Argon2id:

- memória: 19.456 KiB;
- iterações: 3;
- paralelismo: 1;
- hash: 32 bytes.

Os parâmetros são centralizados e usados também para hashes de refresh token e seed. Não existe
bcrypt no projeto.

Login com email inexistente executa verificação contra um hash dummy gerado no startup, reduzindo
diferença temporal que poderia facilitar enumeração.

## JWT

Dois segredos independentes:

- `JWT_SECRET`;
- `JWT_REFRESH_SECRET`.

Ambos exigem ao menos 32 caracteres e não podem ser iguais.

Validades configuráveis:

- access: `JWT_ACCESS_EXPIRES_IN_SECONDS`, padrão operacional 900 segundos;
- refresh: `JWT_REFRESH_EXPIRES_IN_SECONDS`, padrão operacional 2.592.000 segundos.

Verificações obrigatórias:

- algoritmo HS256;
- issuer;
- audience;
- expiração;
- tipo `access` ou `refresh`;
- subject;
- JWT ID.

Access token inclui `sid`, que referencia a sessão persistida. O papel no JWT não concede acesso por
si só: guards carregam novamente usuário e papel do PostgreSQL.

## Sessions and refresh rotation

Refresh tokens são JWTs entregues ao cliente, porém somente hashes Argon2id são persistidos.

Fluxo de rotação:

1. Verificar assinatura e claims.
2. Localizar `jti` no banco.
3. Verificar expiração, revogação, usuário ativo e hash Argon2id.
4. Revogar o token atual e criar o sucessor na mesma transação.
5. Emitir novo access token ligado ao novo `sid`.
6. Auditar `TOKEN_REFRESH`.

O token anterior deixa de funcionar imediatamente. Access tokens vinculados à sessão anterior
também são recusados.

Se um refresh já revogado for reutilizado, o sistema assume possível comprometimento e revoga todas
as sessões ativas daquele usuário.

Logout valida o refresh token e preenche `revokedAt`. É idempotente para o mesmo token válido.

## Global guards

Ordem global:

1. `ThrottlerGuard`;
2. `JwtAuthGuard`;
3. `RoleGuard`.

`JwtAuthGuard` protege todas as rotas, salvo `@Public()`. Rotas públicas atuais:

- health;
- login;
- refresh;
- logout.

`RoleGuard` lê `@Roles(...)` e compara com o papel atualizado vindo do banco. Ausência de permissão
retorna HTTP 403.

`GET /auth/me` declara os quatro papéis oficiais, exercitando a cadeia completa de guards.

## Input validation

O `ValidationPipe` global:

- remove implicitamente a possibilidade de campos extras ao rejeitá-los;
- transforma valores declarados;
- valida email;
- limita comprimento de email, senha e token;
- rejeita refresh fora do formato JWT.

Emails de login recebem trim e lowercase. Senhas nunca são transformadas ou logadas.

## Rate limiting

- global: 100 requisições por 60 segundos;
- login: 10 por 60 segundos;
- refresh: 20 por 60 segundos;
- logout: 20 por 60 segundos.

Trusted proxy deve ser configurado explicitamente antes de produção atrás de proxy reverso.

## Audit

Eventos persistidos:

- `LOGIN_SUCCESS`;
- `LOGIN_FAILURE`;
- `LOGOUT`;
- `TOKEN_REFRESH`.

Cada evento contém:

- `actor`: UUID quando o usuário é conhecido;
- `action`;
- `resource=AUTH_SESSION`;
- timestamp;
- metadata com request ID, IP, user agent e identificadores de sessão quando aplicável.

Falha de login registra email normalizado e motivo interno controlado. Nenhum audit log contém
senha, access token, refresh token ou hash.

## Initial OWNER seed

Configurar:

```text
OWNER_EMAIL=owner@example.com
```

Após subir a stack:

```bash
docker compose exec api npm run prisma:seed
```

Primeira execução:

- cria `ninja`;
- nome `Darlan Simplicio`;
- papel `OWNER`;
- gera senha com 24 bytes aleatórios (`base64url`);
- imprime a senha somente nessa execução;
- persiste apenas Argon2id.

Armazene imediatamente a senha em gerenciador de segredos e remova-a do histórico/terminal
compartilhado. Reexecutar o seed não redefine senha e não a reexibe. Não existe recuperação de senha
nesta sprint.

## Existing platform controls

Permanecem ativos:

- Helmet;
- CORS por allowlist exata;
- request IDs validados;
- filtro global sem exposição de stack;
- logs JSON sem body/header de autorização;
- PostgreSQL não exposto pelo Compose;
- container API não-root;
- migrations antes do startup;
- shutdown gracioso.

## Dependency security

Em 19 de junho de 2026:

- `npm audit`: zero vulnerabilidades;
- `multer` fixado em `2.2.0`;
- `js-yaml` fixado em `4.2.0`.

Overrides tratam dependências transitivas dos adapters e ferramentas de teste.

## Frontend security requirements

- Nunca usar papel da UI como controle de segurança.
- Nunca registrar tokens.
- Implementar refresh single-flight.
- Limpar tokens em `AUTH_SESSION_REVOKED`, `AUTH_USER_INACTIVE` ou falha de refresh.
- Evitar armazenamento persistente inseguro; em PWA nativa, usar storage seguro.
- Não enviar tokens em query string.

## Out of scope

- CRUD de usuários;
- reset de senha;
- e-mail;
- MFA;
- SSO;
- módulos de negócio;
- cookies HttpOnly/BFF;
- limpeza agendada de sessões expiradas.
