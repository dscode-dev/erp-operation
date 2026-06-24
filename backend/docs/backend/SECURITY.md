# Security

## Security posture

Cada cliente opera instalação, banco, storage e configuração isolados. Não existe multi-tenancy
compartilhada. A autenticação e autorização seguem deny-by-default.

Sprint 2 adiciona a fundação organizacional single-company. A organização representa a empresa dona
da instalação, não um tenant compartilhado.

Sprint 3 adiciona gestão de equipe, permissões granulares, senha temporária obrigatória e avatares.

Sprint 3.5 adiciona somente infraestrutura opcional de desenvolvimento e demonstração, sem novas
entidades ou regras operacionais.

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

Essa matriz é normativa para módulos futuros. Operadores não podem acessar financeiro nem
configurações administrativas.

## Organization permissions

Fundação organizacional da Sprint 2:

| Recurso                       | OWNER | MANAGER | OPERATOR | VIEWER |
| ----------------------------- | ----- | ------- | -------- | ------ |
| Organização                   | Total | Leitura | Não      | Não    |
| Configurações organizacionais | Total | Leitura | Não      | Não    |
| Templates de documento        | Total | Leitura | Não      | Não    |
| Assets de branding            | Total | Leitura | Não      | Não    |

Implementação:

- `GET` permitido para `OWNER` e `MANAGER`;
- `PATCH`, `POST` e `DELETE` permitidos somente para `OWNER`;
- `OPERATOR` e `VIEWER` recebem HTTP 403 em todos os endpoints de organização.

## Team permissions

| Recurso/ação                       | OWNER | MANAGER | OPERATOR | VIEWER  |
| ---------------------------------- | ----- | ------- | -------- | ------- |
| Listar/consultar equipe            | Sim   | Leitura | Não      | Leitura |
| Criar/editar/desativar/remover     | Sim   | Não     | Não      | Não     |
| Resetar senha de terceiros         | Sim   | Não     | Não      | Não     |
| Perfil/preferências/senha próprios | Sim   | Sim     | Sim      | Sim     |
| Avatar próprio                     | Sim   | Sim     | Sim      | Sim     |

Somente OWNER pode criar, remover por soft delete ou redefinir senha de terceiros.

## Customer permissions

| Ação                                    | OWNER | MANAGER | OPERATOR | VIEWER  |
| --------------------------------------- | ----- | ------- | -------- | ------- |
| Listar, stats, detalhes e baixar anexos | Sim   | Sim     | Leitura  | Leitura |
| Criar/editar/enable/disable             | Sim   | Sim     | Não      | Não     |
| Gerenciar endereços/contatos            | Sim   | Sim     | Não      | Não     |
| Soft delete de customer                 | Sim   | Não     | Não      | Não     |
| Excluir anexo                           | Sim   | Não     | Não      | Não     |

CPF/CNPJ são únicos quando informados. Soft delete não remove dados relacionados.

Anexos usam UUID no storage, path `customers/<customerId>/attachments/`, limite 5 MiB e validação de
extensão, MIME e assinatura PDF/PNG/JPEG. Conteúdo de arquivo/base64 nunca entra no AuditLog.

Eventos auditados: `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DISABLED`,
`CUSTOMER_ENABLED`, `CUSTOMER_DELETED`, os eventos CREATE/UPDATE/DELETE de address/contact e
UPLOAD/DELETE de attachment.

Proteções administrativas:

- OWNER não pode desativar ou excluir a própria conta;
- último OWNER ativo não pode ser desativado, removido ou rebaixado;
- disable/delete revogam sessões ativas;
- soft delete preserva rastreabilidade com `isActive=false` e `disabledAt`.

## Granular permissions

`UserPermission` complementa RBAC:

- `canFinancial`;
- `canUsers`;
- `canReports`;
- `canSchedules`;
- `canTemplates`.

OWNER sempre recebe permissões efetivas completas. MANAGER pode ser configurado por OWNER.
OPERATOR e VIEWER não recebem flags administrativas. Os módulos operacionais futuros devem aplicar
decorators/guards próprios aos flags relevantes; o papel continua sendo a primeira barreira.

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

## Temporary passwords and mandatory change

Criação e reset:

- geram senha aleatória com 24 bytes criptograficamente seguros, codificada em base64url;
- retornam a senha somente na resposta da operação;
- nunca persistem ou auditam texto puro;
- definem `mustChangePassword=true`;
- reset revoga todas as sessões do usuário.

`PasswordChangeRequiredGuard` é global. Quando o flag está ativo:

- login é permitido;
- `/auth/me`, `/users/me` e `/users/change-password` são permitidos;
- recursos normais retornam HTTP 403 `PASSWORD_CHANGE_REQUIRED`.

Troca de senha:

- exige senha atual;
- exige nova senha entre 12 e 128 caracteres;
- rejeita reutilização da senha corrente;
- usa Argon2id;
- limpa `mustChangePassword`;
- revoga todas as sessões, inclusive a atual;
- obriga nova autenticação.

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

O token anterior deixa de funcionar imediatamente. Access tokens vinculados à sessão anterior também
são recusados.

Se um refresh já revogado for reutilizado, o sistema assume possível comprometimento e revoga todas
as sessões ativas daquele usuário.

## Global guards

Ordem global:

1. `ThrottlerGuard`;
2. `JwtAuthGuard`;
3. `RoleGuard`.
4. `PasswordChangeRequiredGuard`.

`JwtAuthGuard` protege todas as rotas, salvo `@Public()`. Rotas públicas atuais:

- health;
- login;
- refresh;
- logout.

`RoleGuard` lê `@Roles(...)` e compara com o papel atualizado vindo do banco. Ausência de permissão
retorna HTTP 403.

## Input validation

O `ValidationPipe` global:

- rejeita propriedades desconhecidas;
- transforma valores declarados;
- valida email, enum, UUID, cores hexadecimais e tamanhos máximos;
- rejeita refresh fora do formato JWT.

Validações adicionadas:

- `state`: 2 caracteres;
- `currency`: 3 caracteres;
- `documentPrefix`: letras/números/`_`/`-`;
- `:id` de templates/assets: UUID v4;
- `DocumentTemplateType` e `BrandAssetType`: enums oficiais.
- email e username únicos;
- username normalizado e restrito a letras minúsculas, números, `.`, `_` e `-`;
- telefone aceita formato internacional básico, com 8 a 30 caracteres válidos;
- senha nova: 12 a 128 caracteres;
- paginação: page >= 1 e limit entre 1 e 100;
- tema: `SYSTEM`, `LIGHT` ou `DARK`;
- idioma/locale/i18n de usuário não existe na V1.

## Upload security

Uploads de branding exigem autenticação e papel `OWNER`.

Controles:

- `multipart/form-data` com campo `file`;
- limite de tamanho: 5 MiB;
- extensões permitidas: `png`, `jpg`, `jpeg`, `svg`, `pdf`;
- MIME types permitidos:
  - `image/png`;
  - `image/jpeg`;
  - `image/svg+xml`;
  - `application/pdf`;
- nomes originais nunca são usados como path de storage;
- storage key usa UUID;
- nome original é sanitizado apenas para metadado;
- path final segue `organization/<tipo>/<uuid>.<ext>`;
- provider local impede path traversal ao resolver `storageKey`;
- escrita usa flag sem sobrescrita acidental.

O backend não executa conversão ou renderização de arquivos. O frontend deve tratar SVG/PDF com
cuidado e nunca injetar conteúdo arbitrário como HTML confiável.

### Avatar upload

Avatares exigem autenticação e pertencem ao próprio usuário.

Controles:

- limite hard de 2 MiB no multipart;
- somente `png`, `jpg` e `jpeg`;
- somente `image/png` e `image/jpeg`;
- assinatura binária PNG/JPEG validada contra o MIME declarado;
- storage key em `users/avatar/<uuid>.<ext>`;
- nomes originais nunca formam paths;
- nome original sanitizado somente para metadado;
- substituição remove registro e arquivo anteriores;
- leitura exige autenticação.

## Storage

Driver real nesta sprint: `local`.

Variáveis:

- `STORAGE_PROVIDER=local` preservada por compatibilidade;
- `STORAGE_DRIVER=local`;
- `STORAGE_PATH=./storage` fora do Docker;
- `STORAGE_PATH=/app/storage` no container via Compose.

`docker-compose.yml` usa volume nomeado `api_storage`. Cada instalação white label deve ter storage
próprio.

## Rate limiting

- global: 100 requisições por 60 segundos;
- login: 10 por 60 segundos;
- refresh: 20 por 60 segundos;
- logout: 20 por 60 segundos.

Trusted proxy deve ser configurado explicitamente antes de produção atrás de proxy reverso.

## Audit

Eventos persistidos da Sprint 1:

- `LOGIN_SUCCESS`;
- `LOGIN_FAILURE`;
- `LOGOUT`;
- `TOKEN_REFRESH`.

Eventos persistidos da Sprint 2:

- `ORGANIZATION_UPDATED`;
- `SETTINGS_UPDATED`;
- `TEMPLATE_CREATED`;
- `TEMPLATE_UPDATED`;
- `TEMPLATE_DELETED`;
- `ASSET_UPLOADED`;
- `ASSET_DELETED`.

Eventos persistidos da Sprint 3:

- `USER_CREATED`;
- `USER_UPDATED`;
- `USER_DISABLED`;
- `USER_ENABLED`;
- `USER_DELETED`;
- `PASSWORD_RESET`;
- `PASSWORD_CHANGED`;
- `AVATAR_UPDATED`;
- `PREFERENCES_UPDATED`.

Cada evento contém:

- `actor`: UUID do usuário autenticado;
- `action`;
- `resource`;
- timestamp;
- metadata com request ID, IP, user agent e IDs relevantes.

Nenhum audit log contém senha, access token, refresh token, hash ou conteúdo binário/base64 de
asset.

Eventos de usuários registram ator, usuário alvo, request ID, IP, user agent, campos alterados e
operação pertinente. Senhas temporárias e nomes de senha nunca são incluídos.

## Initial seed

Configurar:

```text
OWNER_EMAIL=owner@example.com
```

Após subir a stack:

```bash
docker compose exec api npm run prisma:seed
```

O seed:

- cria o OWNER `ninja` quando ausente;
- imprime a senha aleatória somente na primeira criação do OWNER;
- cria uma organização padrão quando ausente;
- cria settings padrão;
- garante templates vazios padrão para todos os tipos oficiais.
- garante preferências e permissões completas para o OWNER;
- marca templates padrão como `isSystem=true`.

Reexecutar o seed não redefine senha e não reexibe credenciais.

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

## Demo environment isolation

Flags:

- `ENABLE_DEMO_DATA`;
- `ENABLE_DEMO_ENDPOINTS`.

Ambas assumem `false` quando ausentes. Em `NODE_ENV=production`, qualquer uma com valor `true`
interrompe o startup por configuração insegura.

O seed demo:

- não roda quando `ENABLE_DEMO_DATA=false`;
- falha explicitamente quando executado com demo habilitado em produção;
- cria somente usuários ausentes;
- nunca troca senha, papel ou perfil de usuário real existente;
- usa marker e manifesto para reconhecer registros que ele próprio criou;
- usa somente chaves reservadas `demo.*` em `SystemSetting`;
- não altera chaves reais;
- só converte a organização quando ela corresponde exatamente ao placeholder bootstrap conhecido;
- preserva qualquer organização personalizada.

Endpoints internos:

- exigem ambiente `development`;
- exigem os dois flags habilitados;
- exigem JWT válido e papel `OWNER`;
- retornam 404 quando desabilitados;
- não expõem o manifesto interno;
- reset remove somente usuários registrados no manifesto e ainda marcados como demo.

Senhas demo são geradas com `randomBytes(24)`, armazenadas somente como Argon2id e exibidas apenas no
log da execução que cria a conta. O endpoint HTTP de reset nunca retorna senhas.

## Dependency security

Em 23 de junho de 2026:

- `npm audit`: zero vulnerabilidades;
- `multer` continua fixado por override em `2.2.0`;
- `js-yaml` continua fixado por override em `4.2.0`;
- `@types/multer` adicionado apenas como dependência de desenvolvimento para tipagem do upload.

Em 24 de junho de 2026, a Sprint 3.5 não adicionou dependências.

## Frontend security requirements

- Nunca usar papel da UI como controle de segurança.
- Nunca registrar tokens.
- Implementar refresh single-flight.
- Limpar tokens em `AUTH_SESSION_REVOKED`, `AUTH_USER_INACTIVE` ou falha de refresh.
- Não enviar tokens em query string.
- Validar tamanho/formato no cliente antes do upload para UX, mas confiar na validação do backend.
- Não renderizar SVG recebido como HTML confiável.
- Não persistir senha temporária no frontend nem enviá-la a analytics.
- Redirecionar imediatamente para troca obrigatória em `PASSWORD_CHANGE_REQUIRED`.
- Limpar tokens após troca/reset/disable ou `AUTH_SESSION_REVOKED`.
- Validar avatar no cliente para UX, mantendo o backend como autoridade.

## Out of scope

- e-mail;
- MFA;
- SSO;
- equipamentos;
- serviços/produtos;
- orçamentos;
- ordens de serviço;
- financeiro;
- QR Code;
- geração de PDFs;
- storage S3/remoto;
- cookies HttpOnly/BFF;
- limpeza agendada de sessões expiradas.
