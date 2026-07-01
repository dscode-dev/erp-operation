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

## Equipment permissions

| Ação                                     | OWNER | MANAGER | OPERATOR | VIEWER  |
| ---------------------------------------- | ----- | ------- | -------- | ------- |
| Lista, stats, detalhe, anexos e métricas | Sim   | Sim     | Leitura  | Leitura |
| Criar/editar/enable/disable              | Sim   | Sim     | Não      | Não     |
| Criar métrica                            | Sim   | Sim     | Sim      | Não     |
| Excluir métrica/anexo                    | Sim   | Sim     | Não      | Não     |
| Soft delete                              | Sim   | Não     | Não      | Não     |

Integridade: endereço e parent precisam pertencer ao Customer do equipamento; self-parent e ciclo
direto são rejeitados. QR token é UUID aleatório e único; `qrCode` não contém segredo de acesso e
não concede autorização.

Uploads usam `equipments/<id>/attachments/<uuid>`, 5 MiB e validação de assinatura PDF/PNG/JPEG.
AuditLog nunca recebe arquivo/base64 ou valor completo de observações.

Eventos: `EQUIPMENT_CREATED`, `EQUIPMENT_UPDATED`, `EQUIPMENT_DISABLED`, `EQUIPMENT_ENABLED`,
`EQUIPMENT_DELETED`, attachment upload/delete e metric create/delete.

## Document Engine security

Sprint 6 adiciona o motor oficial de documentos de produção. O fluxo normativo é:

```text
Operation → DocumentBuilder → DocumentBlueprint → DocumentRenderer → PDF Engine
```

Separação de responsabilidades:

- `DocumentBuilder` concentra regras de negócio e acesso a banco;
- `DocumentBlueprint` é um modelo serializável e independente de PDF;
- `DocumentRenderer` transforma Blueprint em páginas e não acessa banco;
- `PdfEngine` gera PDF diretamente e não conhece Prisma/storage;
- a camada de assinaturas fica apenas preparada por interfaces e placeholders.

RBAC:

| Ação/documento                        | OWNER | MANAGER | OPERATOR | VIEWER |
| ------------------------------------- | ----- | ------- | -------- | ------ |
| Preview tipos não financeiros         | Sim   | Sim     | Sim      | Sim    |
| Render tipos não financeiros          | Sim   | Sim     | Sim      | Não    |
| Download tipos não financeiros        | Sim   | Sim     | Sim      | Sim    |
| Preview/render/download QUOTE/RECEIPT | Sim   | Não     | Não      | Não    |

`QUOTE` e `RECEIPT` são tratados como documentos financeiros e bloqueados por
`DOCUMENT_FORBIDDEN_TYPE` para não-OWNER.

Proteções de AppSec:

- textos são sanitizados antes do Blueprint e antes da escrita no PDF;
- o PDF é gerado diretamente, sem HTML, browser headless ou impressão;
- storage key é sempre gerada pelo backend com UUID em
  `documents/operations/<operationId>/`, sem nomes fornecidos pelo usuário;
- limites de documento: 80 seções, 600 componentes, 400 linhas, 80 páginas e 10 MiB por PDF;
- renderer impede quebra de tabela por linha individual: tabelas são divididas em blocos com
  cabeçalho repetido;
- componentes críticos podem ser mantidos juntos por `keepTogether`;
- imagens de operação são representadas no Blueprint/PDF por metadados seguros; o binário continua
  protegido no storage até a sprint específica de renderização inline de imagens;
- QR Code é componente lógico no Blueprint; não concede autenticação;
- conteúdo base64 do PDF só é retornado no endpoint de download e não entra no AuditLog;
- eventos auditados: `DOCUMENT_PREVIEWED`, `DOCUMENT_RENDERED`, `DOCUMENT_DOWNLOADED`.

### Template preview security

Backlog Document Template Preview adiciona `GET /documents/templates/:templateId/preview`.

Proteções:

- usa `TemplatePreviewContext`, sem `Operation`, sem `Customer`, sem `Equipment` e sem Demo Dataset;
- `templateId` é validado como UUID v4 por DTO;
- templates inexistentes retornam `TEMPLATE_NOT_FOUND`;
- templates inativos retornam `TEMPLATE_INACTIVE`;
- `QUOTE` e `RECEIPT` continuam restritos a `OWNER`;
- assinaturas `FIXED`/`HYBRID` continuam exigindo assinatura ativa e imagem no storage;
- assets de branding/assinatura são resolvidos exclusivamente pelo `DocumentAssetResolver`;
- assets ausentes retornam erro controlado (`STORAGE_FILE_NOT_FOUND`);
- Renderer e PDF Engine permanecem sem acesso a banco/storage;
- AuditLog registra `TEMPLATE_PREVIEWED` sem armazenar conteúdo base64 sensível além do Blueprint retornado ao usuário autorizado.

## Document Configuration & Signature security

Sprint 7 adiciona configuração documental persistida e domínio de assinaturas. A regra principal é:
nenhuma camada de documento deve acessar storage diretamente. Assets documentais passam por
`DocumentAssetResolver`, que centraliza gravação, leitura, exclusão e existência de PDFs,
assinaturas e futuros assets de documento.

RBAC:

| Recurso                                | OWNER | MANAGER | OPERATOR | VIEWER  |
| -------------------------------------- | ----- | ------- | -------- | ------- |
| Configuração de documentos             | Sim   | Leitura | Não      | Leitura |
| CRUD de assinaturas                    | Sim   | Não     | Não      | Não     |
| Listar/detalhar/download de assinatura | Sim   | Sim     | Não      | Sim     |
| Configurar assinatura em template      | Sim   | Não     | Não      | Não     |

Proteções aplicadas:

- upload de assinatura aceita apenas PNG/JPG/JPEG;
- limite de 2 MiB por imagem;
- validação de MIME, extensão e assinatura binária;
- nome original é sanitizado e nunca usado como storage key;
- storage key de upload é gerada com UUID pelo backend;
- proteção contra path traversal pela abstração de storage e ausência de paths vindos do cliente;
- soft delete em `Signature` (`active=false`);
- templates `FIXED` e `HYBRID` só aceitam assinatura ativa;
- `NONE` rejeita `signatureId`;
- `COLLECTED` não usa assinatura fixa;
- AuditLog registra criação, atualização, soft delete, upload e download sem armazenar base64.

Eventos auditados:

- `SIGNATURE_CREATED`;
- `SIGNATURE_UPDATED`;
- `SIGNATURE_DELETED`;
- `SIGNATURE_IMAGE_UPLOADED`;
- `SIGNATURE_IMAGE_DOWNLOADED`;
- `TEMPLATE_CREATED`;
- `TEMPLATE_UPDATED`;
- `TEMPLATE_DELETED`.

Fora do escopo de segurança desta sprint: assinatura digital ICP, certificados, DocuSign, workflow,
aprovação, envio por e-mail/WhatsApp e validação jurídica de assinatura eletrônica.

## Document Signature Rendering security

Sprint 8 integra assinatura ao render oficial sem alterar endpoints.

Garantias:

- `DocumentContextService` é responsável por buscar Operation/configuração/assets; o Builder não
  consulta banco;
- `DocumentAssetResolver` é a única origem de assets documentais;
- templates `FIXED` e `HYBRID` exigem assinatura ativa e imagem existente;
- `COLLECTED` nunca injeta assinatura fixa;
- `NONE` não cria seção de assinatura;
- imagens de assinatura são carregadas do storage e não são registradas em AuditLog;
- PDF engine valida formato de imagem antes de embutir:
  - JPEG com dimensões válidas;
  - PNG 8-bit gray/RGB/alpha com filtros suportados;
- assinatura usa `keepTogether`, evitando quebra entre páginas;
- limite de PDF de 10 MiB continua aplicado;
- falhas de asset ou imagem inválida retornam erro controlado.

Erros relevantes:

- `SIGNATURE_NOT_FOUND`;
- `SIGNATURE_INACTIVE`;
- `SIGNATURE_IMAGE_REQUIRED`;
- `DOCUMENT_RENDER_FAILED`;
- `DOCUMENT_SIZE_LIMIT_EXCEEDED`.

Fora do escopo: ICP Brasil, certificados digitais, carimbo de tempo, DocuSign/Adobe Sign,
aprovação, workflow e múltiplos aprovadores.

Assinaturas:

- nenhum CRUD, tabela ou regra funcional de assinatura foi criado;
- foram criados contratos para `none`, `fixed`, `collected` e `hybrid`;
- decisões futuras de assinatura deverão passar pelo `DocumentBuilder`, nunca pelo Renderer/PDF.

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
- serviços/produtos;
- orçamentos;
- ordens de serviço;
- financeiro;
- QR Code;
- geração de PDFs;
- storage S3/remoto;
- cookies HttpOnly/BFF;
- limpeza agendada de sessões expiradas.

## Asset Lifecycle security (Sprint 9)

Eventos de ciclo de vida de equipamento são registros históricos imutáveis.

Controles aplicados:

- publicação de eventos centralizada no `LifecyclePublisher`;
- outros módulos não criam `AssetLifecycleEvent` diretamente;
- não existe endpoint de edição de evento;
- não existe endpoint de remoção de evento;
- correções históricas devem criar novo evento;
- anexos usam soft delete (`deletedAt`) e podem ter arquivo físico removido best-effort;
- integrações automáticas com Operations e Document Engine são idempotentes.

RBAC:

- `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER`: leitura;
- `OWNER`, `MANAGER`, `OPERATOR`: criação de eventos e upload de anexos;
- `OWNER`, `MANAGER`: remoção de anexos;
- eventos financeiros continuam protegidos indiretamente pela regra do Document Engine para
  documentos `QUOTE`/`RECEIPT`.

Upload de anexos:

- provider: `StorageProvider`;
- storage key gerada por UUID e nunca pelo nome original;
- path controlado em `asset-lifecycle/<eventId>/attachments/<uuid>.<ext>`;
- nome original salvo apenas como metadado sanitizado;
- extensões permitidas: `pdf`, `png`, `jpg`, `jpeg`;
- MIME permitido: `application/pdf`, `image/png`, `image/jpeg`;
- validação binária:
  - PDF inicia com `%PDF-`;
  - PNG valida assinatura de 8 bytes;
  - JPEG valida marcador inicial `FF D8 FF`;
- limite: 5 MiB;
- proteção contra path traversal por não aceitar path externo do usuário.

Auditoria:

- `ASSET_LIFECYCLE_EVENT_CREATED`;
- `ASSET_LIFECYCLE_EVENT_AUTO_CREATED`;
- `ASSET_LIFECYCLE_ATTACHMENT_UPLOADED`;
- `ASSET_LIFECYCLE_ATTACHMENT_DELETED`.

Audit metadata registra request ID, IP, user agent, ator, IDs do evento/equipamento/operação/documento
e dados técnicos mínimos. Conteúdo binário/base64 do anexo nunca é gravado em audit log.

Privacidade e exposição:

- `TimelineAssembler` remove dependência de interpretação visual no cliente e retorna apenas
  referências seguras;
- o payload `timeline.user` não expõe e-mail;
- timeline retorna apenas referências e metadados necessários;
- PDFs gerados continuam sendo baixados pelo Document Engine, não pelo lifecycle;
- eventos `DOCUMENT` guardam `documentId`, não duplicam arquivo nem conteúdo do PDF;
- `metadata` é JSON auxiliar e deve ser tratada como não confiável para renderização HTML.

Paginação e filtros:

- `limit` máximo permanece 100;
- filtros usam DTO validado (`UUID`, enum e datas ISO);
- ordenação estável por `occurredAt` e `id`;
- índices adicionais da Sprint 9.5 reduzem varredura para filtros por equipamento, tipo, operador,
  documento e período.

## Maintenance Planning security (Sprint 10)

Maintenance Planning separa planejamento de execução. O backend não cria Operations
automaticamente nesta sprint e não executa rotinas por cron.

RBAC:

- `OWNER` e `MANAGER`: leitura, criação, edição e desativação de planos;
- `OWNER`, `MANAGER` e `OPERATOR`: criação/atualização de execuções planejadas;
- `OWNER`, `MANAGER`, `OPERATOR` e `VIEWER`: leitura de planos, execuções e estatísticas.

Controles de domínio:

- `MaintenancePlan` é desativado por `active=false`; não há remoção física via API;
- `MaintenanceExecution` pode ser vinculada a `Operation`, mas a Operation deve pertencer ao mesmo
  equipamento do plano;
- conclusão de execução atualiza `lastExecution`/`nextExecution` de forma transacional;
- evento `MAINTENANCE` no Asset Lifecycle é emitido exclusivamente via `LifecyclePublisher`;
- nenhum módulo cria `AssetLifecycleEvent` diretamente para manutenção.

Validação:

- DTOs validam UUIDs, enums, datas ISO, strings e paginação;
- `limit` máximo é 100;
- `recurrenceRule.frequency` aceita somente valores oficiais;
- `recurrenceRule.interval` aceita inteiro de 1 a 3650;
- parâmetros inválidos retornam erro padronizado.

Recorrência:

- `RecurringEngine` é isolado e determinístico;
- não conhece PMOC, garantia, SLA ou regras específicas;
- não usa cron;
- recebe regra e data base, retorna próximas datas calculadas.

Auditoria:

- `MAINTENANCE_PLAN_CREATED`;
- `MAINTENANCE_PLAN_UPDATED`;
- `MAINTENANCE_PLAN_DELETED`;
- `MAINTENANCE_EXECUTION_CREATED`;
- `MAINTENANCE_EXECUTION_UPDATED`;
- `MAINTENANCE_EXECUTION_COMPLETED`;
- ao concluir execução, o Asset Lifecycle também registra auditoria automática do evento publicado.

Privacidade:

- payloads retornam usuário criador apenas com `id`, `name` e `username`;
- notas são sanitizadas por trim/normalização de espaços;
- nenhuma informação financeira é exposta pelo domínio;
- metadata do evento de lifecycle armazena apenas referências necessárias (`maintenancePlanId`,
  `maintenanceExecutionId`, `operationId`, nome do plano e notas).

Performance e abuso:

- índices cobrem `equipmentId/active`, `active/nextExecution`, `type/active`,
  `priority/nextExecution`, `maintenancePlanId/scheduledAt`, `status/scheduledAt` e `executedAt`;
- endpoints continuam protegidos pelo rate limit global;
- listagens são paginadas e validadas.

## PMOC Compliance security (Sprint 11)

PMOC é uma especialização de Maintenance Planning. Não existe agenda, execução, timeline ou motor de
documentos paralelo.

RBAC:

- `OWNER` e `MANAGER`: criação, edição e desativação de PMOC e ambientes;
- `OWNER`, `MANAGER`, `OPERATOR` e `VIEWER`: leitura, compliance e estatísticas.

Controles de relacionamento:

- PMOC exige `Organization`, `Customer`, `Equipment` e exatamente um `MaintenancePlan`;
- equipamento principal deve pertencer ao cliente informado;
- equipamentos monitorados também devem pertencer ao mesmo cliente;
- ambiente só pode referenciar equipamento já controlado pelo PMOC;
- desativação de PMOC também desativa o `MaintenancePlan`;
- não há duplicação de registros de `Equipment`.

Compliance:

- status é calculado pelo backend;
- parâmetros considerados: PMOC ativo, MaintenancePlan ativo, vigência, execuções pendentes,
  execuções vencidas e próximas execuções;
- `ComplianceEvaluator` foi criado apenas como ponto de extensão; motor genérico de compliance
  permanece fora de escopo.

Asset Lifecycle:

- eventos PMOC são publicados via `LifecyclePublisher`;
- eventos adicionados: `PMOC_CREATED`, `PMOC_UPDATED`, `PMOC_COMPLETED`, `PMOC_EXPIRED`;
- nenhum serviço PMOC cria `AssetLifecycleEvent` diretamente;
- conclusão de `MaintenanceExecution` vinculada ao PMOC publica `PMOC_COMPLETED`.

Document Engine:

- PMOC usa `DocumentTemplateType.PMOC`;
- `/pmoc/:id/compliance` expõe preparação documental via `DocumentConfigurationService`;
- não há renderer/PDF próprio no domínio PMOC.

Validação:

- DTOs validam UUIDs, datas ISO, arrays únicos, limites de array, strings, enums e paginação;
- `recurrenceRule` é validada pelo `RecurringEngine`;
- `limit` máximo é 100;
- datas inválidas ou intervalo `endDate < startDate` são rejeitados.

Auditoria:

- `PMOC_CREATED`;
- `PMOC_UPDATED`;
- `PMOC_DELETED`;
- `PMOC_ENVIRONMENT_CREATED`;
- `PMOC_ENVIRONMENT_UPDATED`;
- `PMOC_ENVIRONMENT_DELETED`.

Performance:

- índices em `customerId/active`, `equipmentId/active`, `organizationId/active`, `active/endDate`,
  ambientes por PMOC e vínculos de equipamentos;
- listagens paginadas;
- stats calculados sem expor dados financeiros.

## Inventory & Materials security (Sprint 12)

O domínio de inventário separa catálogo, estoque físico e movimentações. O objetivo de segurança é
impedir alteração manual de saldo, manter trilha auditável e evitar consumo inconsistente.

RBAC:

- `OWNER` e `MANAGER`: criam/alteram/desativam produtos, fornecedores, parâmetros de estoque e
  removem materiais de Operations;
- `OPERATOR`: consulta produtos/estoque e registra movimentações operacionais ou consumo de
  materiais;
- `VIEWER`: somente leitura em produtos, estoque e materiais;
- fornecedores são visíveis apenas para `OWNER` e `MANAGER`.

Movimentações imutáveis:

- `StockMovement` não possui endpoint de edição ou exclusão;
- toda alteração de saldo cria nova movimentação;
- remoção de material de Operation cria `RETURN`, preservando o movimento original;
- `OperationPart` usa soft delete para preservar rastreabilidade.

Proteção de estoque:

- saldo é recalculado pelo backend após cada movimento;
- `availableQuantity = currentQuantity - reservedQuantity`;
- movimentações que deixariam `currentQuantity` ou `availableQuantity` negativos são rejeitadas com
  `INVENTORY_NEGATIVE_STOCK`;
- `OperationPart` valida que o `InventoryItem` pertence ao `Product` informado.

Validação e sanitização:

- DTOs validam UUIDs, enums, paginação, números positivos e strings;
- `limit` máximo segue o padrão global de paginação;
- filtros de data aceitam ISO date;
- campos livres são normalizados por DTO/pipe global e não renderizam HTML.

Auditoria:

- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`;
- `SUPPLIER_CREATED`, `SUPPLIER_UPDATED`, `SUPPLIER_DELETED`;
- `INVENTORY_ITEM_CREATED`, `INVENTORY_ITEM_UPDATED`;
- `STOCK_MOVEMENT_CREATED`;
- `MATERIAL_CONSUMED`, `MATERIAL_RETURNED`;
- consumo relevante em Operation também publica `PART_REPLACEMENT` via `LifecyclePublisher`.

Integração transacional:

- consumo em Operation cria material, movimento, recálculo de estoque e evento de lifecycle na mesma
  transação;
- conflitos de SKU, código interno e documento de fornecedor retornam erro controlado;
- endpoints continuam protegidos por JWT, RBAC e rate limit global.

Dados sensíveis:

- o domínio não expõe dados financeiros;
- movimentos retornam referências mínimas de usuário, produto, estoque e Operation;
- Asset Lifecycle recebe apenas referências necessárias, sem duplicar documentos ou informações
  financeiras.

## Pricing security (Sprint 13)

Pricing contém dados comerciais e deve ser tratado como informação sensível. Product permanece
técnico e Inventory permanece físico.

RBAC:

- `OWNER`: cria e revisa preços;
- `MANAGER`: lê preços, custos, margens, histórico e estatísticas;
- `OPERATOR`: sem acesso;
- `VIEWER`: sem acesso.

Isolamento de responsabilidade:

- `Product` não recebe campos de preço;
- `InventoryItem` não recebe campos de custo;
- futuros domínios devem consumir `PricingService`, não consultar `ProductPricing` diretamente.

Histórico e vigência:

- mudança de preço cria novo `ProductPricing`;
- valores comerciais antigos não são sobrescritos;
- o registro anterior pode ser encerrado/desativado para evitar sobreposição;
- vigências ativas sobrepostas são rejeitadas com `PRICING_OVERLAP`;
- preço vigente é resolvido por `active`, `validFrom` e `validUntil`.

Validação monetária:

- DTOs aceitam apenas números não negativos com até duas casas decimais;
- `validUntil <= validFrom` é rejeitado;
- `salePrice < minimumSalePrice` é rejeitado;
- `suggestedSalePrice < minimumSalePrice` é rejeitado;
- margem negativa inconsistente é rejeitada com `PRICING_INVALID_MARGIN`.

Auditoria:

- `PRICING_CREATED`;
- `PRICING_UPDATED`;
- `PRICING_DEACTIVATED`;
- `PRICING_RESOLVED` reservado para trilhas futuras de consumo interno.

Performance e abuso:

- listagens são paginadas;
- índices cobrem organização/ativo, produto/ativo/vigência e preços vencidos;
- endpoints continuam protegidos por JWT, RBAC e rate limit global.

Exposição:

- operadores não recebem custo, preço ou margem;
- payloads comerciais devem ser usados somente em telas administrativas/comerciais;
- nenhum dado financeiro de clientes é introduzido nesta sprint.

## Operation delegation security backlog

Delegação de Operations é autorizada exclusivamente no backend.

RBAC:

- `OWNER`: pode informar `operatorId` ao criar Operation;
- `MANAGER`: pode informar `operatorId` ao criar Operation;
- `OPERATOR`: nunca delega; caso envie `operatorId`, o backend atribui ao próprio operador
  autenticado e registra o valor ignorado na auditoria de criação;
- `VIEWER`: permanece sem permissão para criar Operation.

Validação do operador delegado:

- `operatorId` é validado como UUID pelo DTO;
- o usuário delegado deve existir;
- o usuário delegado deve estar ativo;
- o usuário delegado não pode possuir `disabledAt`;
- o usuário delegado deve possuir perfil operacional permitido (`OWNER`, `MANAGER` ou `OPERATOR`);
- `VIEWER` não pode ser operador responsável de uma Operation criada por delegação.

Isolamento organizacional:

- Orbit é single-company por instalação;
- usuários e operações residem no banco isolado da empresa;
- não existe `tenant_id` compartilhado nem atribuição cross-tenant possível nesta arquitetura;
- a regra de “mesma organização” é garantida pelo isolamento físico do banco da instalação.

Auditoria:

- `OPERATION_CREATED` registra criador, operador responsável, flag `delegated` e eventual
  `ignoredOperatorId`;
- `OPERATION_DELEGATED` é criado somente quando `actor.id !== operatorId`;
- o evento inclui `operationId`, número da Operation, cliente, criador e usuário delegado.

AppSec:

- delegação inválida retorna `OPERATION_OPERATOR_INVALID`;
- não há alteração no Asset Lifecycle para delegação;
- endpoints continuam sob JWT, `RoleGuard`, validação global e rate limit global.
