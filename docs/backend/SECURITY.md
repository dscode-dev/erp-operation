# Security

## DC-03.1 — integridade dos dados técnicos

- Responsável/CREA e detalhes de inspeção possuem limites explícitos e sanitização pelos DTOs.
- Equipamentos continuam validados como ativos, únicos e pertencentes ao cliente da Operation.
- Tipo de sistema e situação são snapshots para a emissão; o Renderer não consulta cadastros e
  não aceita HTML.
- Dados do solicitante vêm exclusivamente do Customer autorizado no DocumentContext; nenhuma chave
  de storage ou dado binário foi adicionado aos contratos públicos.

## DC-03 — segurança documental do Laudo Técnico

- Campos passam pela whitelist global, trim, validação de tipo e limites de 20/30 mil caracteres;
  equipamentos continuam validados contra o cliente da Operation.
- `DocumentContext` é a única camada que resolve logo e assinaturas; Builder não consulta Prisma
  ou Storage, e Renderer não interpreta política de assinatura.
- Fotos e QR não são resolvidos para `TECHNICAL_OPINION`, reduzindo exposição e I/O; respostas não
  publicam paths ou `storageKey`, e auditoria não recebe Base64.
- Responsável Técnico e CREA usam snapshots explícitos da Operation, com fallback para assinatura
  institucional ativa configurada. FIXED/HYBRID falham de forma segura quando assinatura ou imagem
  obrigatória não existe.
- JWT, RBAC, rate limit, auditoria, stale detection e download exclusivo pelo backend permanecem.

## Work Order criada pela Central de Relatórios

- A criação independente passa por `POST /operations`, preservando JWT, RBAC, validação de cliente,
  endereço, operador e vínculo dos equipamentos ao mesmo cliente.
- Fotos mantêm os limites, MIME/magic bytes, UUID de Storage e resolução exclusiva pelo
  `DocumentAssetResolver` já existentes.
- A galeria é construída somente com assets autorizados no `DocumentContext`; Builder e Renderer
  não acessam Prisma ou Storage.
- Reutilizar uma Operation não copia fotos, assinaturas ou dados e evita divergência histórica.
- Documentos relacionados não são expostos no Blueprint da OS; downloads continuam autenticados.

## QR textual na Ordem de Serviço

- A OS publica apenas o identificador não secreto `Equipment.qrCode` no metadata.
- Nenhum PNG/Base64 é resolvido ou incorporado ao Blueprint/PDF de `WORK_ORDER`.
- O identificador não concede acesso; lookup continua autenticado e sujeito a RBAC.

## Minimização de assets no TECHNICAL_REPORT

- O Context não resolve foto operacional nem QR do equipamento para o relatório de visita, pois
  esses componentes não pertencem mais ao modelo certificado.
- A tabela usa somente snapshots e dados relacionais já autorizados da Operation; nenhum
  `storageKey`, Base64, caminho ou binário é introduzido na seção.
- Assinaturas permanecem resolvidas exclusivamente pela política do template e pelo
  `DocumentAssetResolver`; RBAC, isolamento, auditoria e download autenticado não mudaram.

## Metadados técnicos no documento

- A versão do Blueprint continua disponível para compatibilidade e stale detection, mas não é
  incorporada ao conteúdo visual do relatório ou PDF.
- O ajuste não altera respostas protegidas, Storage, RBAC, auditoria ou resolução de assets.

## Limites JSON para evidências operacionais

- O limite amplo não é global: somente `/api/v1/operations` aceita até 120 MiB para suportar o
  contrato legado de evidências Base64 (16 × 5 MiB + assinatura).
- Todas as demais rotas JSON permanecem em 1 MiB.
- Ambos os valores são validados por ENV e possuem hard caps de 128 MiB e 10 MiB,
  respectivamente.
- Fotos continuam sujeitas à quantidade, MIME, tamanho binário e StorageProvider; ampliar o parser
  não ignora validações de domínio, JWT, RBAC ou rate limit.
- Excesso retorna resposta sanitizada `413 UPLOAD_FILE_TOO_LARGE`; a mensagem interna do parser não
  é exposta ao cliente.
- Request ID é atribuído antes dos parsers e preservado pelo middleware Nest, garantindo header e
  correlação de log também para payloads rejeitados antes dos guards/controllers.

## DC-02 — controles do Relatório de Visita Técnica

- novos campos textuais são opcionais, passam por DTO whitelist/sanitização e possuem limites de
  20.000 caracteres;
- UUID, RBAC, isolamento da instalação e validação de relacionamentos permanecem nos serviços de
  Operation/Document Engine;
- fotos e assinaturas continuam validadas por MIME, magic bytes e tamanho antes do Storage;
- DocumentContext é a única camada que resolve logo, QR, fotos e assinaturas;
- Builder, Renderer e frontend não consultam Prisma ou Storage e não escolhem assinatura;
- respostas de catálogo não expõem `storageKey`, path, tokens ou binários;
- download exige endpoint autenticado e stale detection; render mantém fingerprint e auditoria;
- runtime é local-only, requer opt-in e grava evidências apenas em `/private/tmp`.

## Product Backlog Closure 07 — segurança dos workflows

- navegação aplica `canReports`; backend mantém JWT, RoleGuard e restrição OWNER para RECEIPT;
- relacionamentos são validados pelos serviços oficiais;
- fotos e assinatura coletada usam validadores binários e limites existentes;
- templates/assinaturas inválidos falham de forma controlada;
- nenhum `storageKey`, path, token ou URL pública é exposto;
- stale detection permanece obrigatória;
- a fixture AppSec de Assignment passou a criar sua própria Organization, removendo dependência de ordem entre suítes.

## DC-01.2 — QR e assinatura técnica

- `FIXED` tem precedência sobre flags legadas de execução, evitando exposição acidental de artefato
  coletado ou de campo de assinatura não solicitado;
- o QR é gerado somente de payload persistido em `Equipment.qrCode`, limitado a 500 caracteres;
- geração usa PNG, margem segura e correção de erro; nenhum path ou storage key é exposto;
- o QR não concede autorização: o lookup e o equipamento continuam protegidos por JWT/RBAC;
- assinatura institucional é resolvida pela relação exata do template e deve estar ativa e possuir
  imagem válida; ausência gera erro controlado;
- assinatura coletada mantém validação MIME/magic bytes/limite já existente;
- Builder recebe assets prontos pelo Context e não realiza consultas adicionais;
- o teste runtime é bloqueado em produção e aceita apenas banco local explicitamente habilitado.

## DC-01 — Work Order

- novos textos possuem limites de DTO e passam pela sanitização do Builder;
- logo/fotos continuam resolvidos exclusivamente pelo DocumentAssetResolver;
- nenhum storageKey ou path é introduzido no contrato público;
- assinatura de execução e institucional continuam sob a política do template;
- render/download e stale detection permanecem no backend;
- nenhuma consulta Prisma foi adicionada ao Builder ou Renderer.

## Document Engine D1

- catálogo aplica RBAC e oculta tipos financeiros para roles não autorizadas;
- UUIDs, datas, enums e paginação são validados por DTO;
- catálogo/templates não expõem `storageKey`, base64, paths, binários ou tokens;
- assinaturas institucionais vinculadas devem existir, estar ativas e possuir imagem;
- relação múltipla é atualizada transacionalmente e rejeita duplicatas;
- download permanece no backend com stale detection;
- DocumentContext centraliza assets; Builder e domínios não acessam Storage.

## Product Backlog Closure 06.1 — font and runtime verification security

- Noto Sans é empacotada como dependência interna OFL; nenhum endpoint expõe o arquivo de fonte.
- A fixture runtime exige opt-in, `NODE_ENV != production` e host DB local/container local.
- Senha é aleatória e gravada apenas em `/private/tmp` para a sessão de navegador.
- Evidências versionáveis contêm somente IDs abreviados, booleans, timestamps e hashes.
- Base64 de assinatura/PDF não entra em audit, lifecycle, render metadata ou documentação.
- Stale detection foi validada antes do acesso ao binário antigo.

## Product Backlog Closure 06 — stale PDF and signature integrity

- PDFs persistidos possuem SHA-256 da semântica do blueprint em `renderMetadata`.
- O download autorizado reconstrói a fonte e recusa binário obsoleto com `DOCUMENT_STALE`.
- Fingerprint não substitui autorização, não contém base64 e não expõe storage key.
- Assinaturas continuam validadas por data URL, MIME, magic bytes e limite de tamanho.
- Mutation de evidências aguarda persistência e retorna estado autoritativo antes de preview/render.
- A chave antiga do PDF só é removida após persistência concorrente bem-sucedida do novo render.

## Product Backlog Closure 05 — execution signature AppSec

Assinatura executada em campo é classificada como artifact da `Operation`, não como assinatura fixa
reutilizável do domínio `Signature`.

Controles aplicados:

- `Operation.signatureData` aceita apenas data URL PNG/JPEG.
- O backend valida assinatura por MIME declarado e magic bytes binários.
- Limite máximo: 2 MiB.
- A assinatura coletada não é gravada em AuditLog, metadata de lifecycle ou renderMetadata.
- `DocumentContextService` só injeta assinatura de execução em tipos documentais compatíveis:
  `WORK_ORDER`, `TECHNICAL_REPORT`, `REPORT` e `RECEIPT`.
- `DocumentViewer` e PDF consomem a assinatura exclusivamente via blueprint oficial.
- A assinatura fixa cadastrada continua protegida pelo domínio Signature e StorageProvider.

Essa separação evita confundir uma assinatura de execução pontual com uma credencial visual
reutilizável da empresa.

## Product Backlog Closure 05.1 — Operation evidence security

`/reports/visita` deixou de persistir estado local e passou a usar `PATCH /operations/:id`.

Controles:

- fotos aceitam apenas PNG/JPEG data URL e são salvas em storage privado;
- assinatura usa validação PNG/JPEG, magic bytes e limite de 2 MiB;
- respostas públicas de fotos não retornam `storageKey`;
- DocumentContext resolve imagens server-side por `DocumentAssetResolver`;
- audit/lifecycle/renderMetadata não recebem base64;
- frontend não usa object URL como fonte persistente de documento;
- RBAC do controller de Operations continua sendo a autoridade.

## Sprint 21 — Performance and observability AppSec review

Sprint 21 adicionou observabilidade sem expor dados sensíveis.

Endpoints:

- `GET /health/live`: público, sem DB/storage, não retorna informações de negócio.
- `GET /health/ready`: público, retorna apenas status agregado de DB/storage.
- `GET /metrics`: público para rede interna/orquestrador, formato Prometheus, sem envelope JSON.

Dados proibidos em métricas:

- tokens;
- e-mails;
- nomes de clientes;
- nomes de usuários;
- payloads;
- query strings completas;
- metadata operacional.

Labels permitidos:

- método HTTP;
- rota normalizada;
- status HTTP;
- contadores agregados de operações técnicas.

Revisão de concorrência aplicada por medição:

- `InventoryService` e `ProcurementService` passaram a tratar conflitos serializáveis PostgreSQL
  (`P2034`) com retry limitado em transações críticas.
- A regra de integridade continua no banco/transação; retry não relaxa validação de estoque negativo,
  recebimento duplicado ou estados finais.
- Teste de carga local da Sprint 21 finalizou com 0% de erro nos cenários felizes e 0 deadlocks no
  PostgreSQL.

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

Product↔Supplier:

- `primarySupplierId` em criação/edição de produto é opcional e validado por UUID;
- o backend valida existência e `isActive=true` do fornecedor antes de criar a relação;
- fornecedor inativo ou inexistente não é aceito como fornecedor principal;
- o vínculo é persistido em `ProductSupplier`, mantendo histórico de auditoria em
  `PRODUCT_CREATED`/`PRODUCT_UPDATED`;
- `Product` continua sem preço, custo ou saldo físico;
- como a instalação é single-company, a proteção contra atribuição cruzada é feita pelo isolamento do
  banco/storage da instalação, sem introduzir multi-tenant compartilhado.

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

## Assignment security

Assignment é uma camada operacional sensível porque controla execução de campo.

RBAC:

- `OWNER` e `MANAGER`: listam, criam e reatribuem Assignments;
- `OPERATOR`: lista apenas as próprias Assignments e só executa transições das próprias ordens;
- `VIEWER`: somente leitura, sem transições.

Transições protegidas:

- aceitar/recusar/iniciar/concluir exige `actor.id === assignedTo`;
- iniciar exige `ASSIGNED → ACCEPTED → STARTED`;
- concluir exige `STARTED → COMPLETED`;
- reatribuição não é permitida para Assignments finais (`COMPLETED`, `CANCELED`).

Auditoria e histórico:

- `AssignmentHistory` é imutável;
- eventos: `ASSIGNED`, `REASSIGNED`, `ACCEPTED`, `STARTED`, `PAUSED`, `RESUMED`, `REJECTED`,
  `COMPLETED`, `CANCELED`;
- auditoria: `ASSIGNMENT_CREATED`, `ASSIGNMENT_REASSIGNED`, `ASSIGNMENT_ACCEPTED`,
  `ASSIGNMENT_STARTED`, `ASSIGNMENT_REJECTED`, `ASSIGNMENT_COMPLETED`.

Asset Lifecycle:

- eventos operacionais de assignment são publicados exclusivamente via `LifecyclePublisher`;
- nenhuma camada cria `AssetLifecycleEvent` diretamente;
- eventos são publicados apenas quando a Operation possui equipamento.

AppSec:

- DTOs validam UUID, paginação, status e strings;
- transições inválidas retornam `ASSIGNMENT_INVALID_TRANSITION`;
- tentativa de agir em Assignment de outro operador retorna `ASSIGNMENT_OPERATOR_FORBIDDEN`;
- criação/reatribuição valida usuário ativo, não desativado e com perfil operacional;
- endpoints seguem JWT, `RoleGuard`, rate limit global e envelope global de erro.

## Budget security

Budget contém dados comerciais sensíveis: custos, preços, margens, descontos e potencial de
faturamento.

RBAC:

- `OWNER` e `MANAGER`: acesso aos endpoints de Budget;
- `OPERATOR`: sem acesso, pois não deve visualizar dados comerciais/financeiros;
- `VIEWER`: sem acesso nesta V1 para evitar exposição de preços, custos e margem.

Proteções comerciais:

- `Product` continua sem preço;
- `Inventory` continua sem custo/preço comercial;
- `BudgetItem` armazena snapshots de custo, preço de venda e margem;
- snapshots são criados via `PricingService`;
- renderização futura de documento deve usar snapshots, nunca consultar `ProductPricing`.

Integridade:

- orçamento aprovado é imutável;
- orçamentos finais (`REJECTED`, `EXPIRED`, `CANCELED`) não podem ser editados;
- orçamento vencido não pode ser aprovado;
- uma Operation não pode ter mais de um Budget aprovado;
- relacionamentos são validados: customer, address, equipment e operation precisam ser coerentes;
- exclusão é cancelamento lógico, não remoção física.

Auditoria:

- `BUDGET_CREATED`;
- `BUDGET_UPDATED`;
- `BUDGET_APPROVED`;
- `BUDGET_REJECTED`;
- `BUDGET_CANCELED`.

Histórico:

- `BudgetHistory` é imutável;
- toda alteração relevante registra estado anterior, novo estado, ator, timestamp e metadata;
- `BudgetApproval` registra decisões comerciais com ator, status, observação e timestamp.

Asset Lifecycle:

- aprovação publica `BUDGET_APPROVED` via `LifecyclePublisher`;
- rejeição publica `BUDGET_REJECTED` via `LifecyclePublisher`;
- eventos só são publicados quando há equipamento resolvido pelo Budget ou Operation.

AppSec:

- DTOs validam UUID, paginação, datas, valores monetários e itens;
- rate limit global permanece aplicado;
- erros usam envelope global;
- dados sensíveis não são expostos a OPERATOR/VIEWER;
- transações protegem criação/atualização, histórico, aprovação/rejeição, auditoria e lifecycle.

## Budget document emission security

O documento oficial de Budget contém dados comerciais sensíveis. A emissão segue as mesmas
restrições do domínio Budget.

RBAC:

- `OWNER` e `MANAGER`: podem emitir e baixar documento de Budget;
- `OPERATOR` e `VIEWER`: sem acesso.

Proteções:

- Budget não acessa storage diretamente;
- Budget não chama `DocumentBuilder` diretamente;
- emissão passa pelo Document Engine;
- PDF é gerado apenas pelo PDF Engine;
- download usa `DocumentAssetResolver`, nunca caminho de arquivo informado pelo cliente;
- `OperationDocument.storageKey` não é retornado no detalhe de Budget;
- `CANCELED` e `REJECTED` não podem emitir/baixar;
- `BudgetItem` snapshots são a única fonte de preço/custo/margem no documento;
- `ProductPricing` não é consultado durante renderização;
- renderização substitui PDF anterior removendo storage antigo com tratamento seguro;
- `BudgetHistory.DOCUMENT_RENDERED`, auditoria e Asset Lifecycle registram rastreabilidade.

Concorrência:

- `OperationDocument.budgetId` é único;
- emissão usa `upsert` por `budgetId`, evitando múltiplos documentos oficiais para o mesmo Budget;
- reemissões atualizam o mesmo documento lógico e substituem o arquivo renderizado.

## Sprint 14.5 AppSec consolidation

A Sprint 14.5 não criou funcionalidades de negócio. A revisão confirmou e documentou os seguintes
pontos de segurança:

- RBAC permanece aplicado nos controllers existentes;
- validação global com whitelist/forbidNonWhitelisted segue ativa;
- DTOs de UUID continuam usando validação UUID v4 nos parâmetros críticos;
- Asset Lifecycle continua centralizado no `LifecyclePublisher`;
- Timeline para frontend continua centralizada no `TimelineAssembler`;
- Document Builder/Renderer/PDF Engine seguem sem acesso direto a storage;
- renderização documental continua passando pelo `DocumentAssetResolver`;
- paginação passou a usar helper compartilhado com `totalPages` mínimo `1`, evitando divergência de
  contratos entre módulos;
- nenhum storage key sensível foi adicionado a respostas públicas durante a consolidação;
- nenhuma migration ou alteração de autorização foi introduzida nesta sprint.

Teste de regressão adicionado:

- `pagination.types.spec.ts` valida o formato comum de paginação.

## Financial Core security

Financial é o único domínio autorizado a representar dinheiro operacional no Orbit V1.

RBAC:

| Recurso                 | OWNER | MANAGER | OPERATOR | VIEWER |
| ----------------------- | ----- | ------- | -------- | ------ |
| Contas financeiras      | Total | Total   | Não      | Não    |
| Categorias financeiras  | Total | Total   | Não      | Não    |
| Lançamentos financeiros | Total | Total   | Não      | Não    |
| Dashboard financeiro    | Sim   | Sim     | Não      | Não    |

Proteções:

- Product, Inventory, Budget e Operations não armazenam saldo financeiro;
- saldo atual fica somente em `FinancialAccount.currentBalance`;
- lançamento pago atualiza saldo em transação;
- pagamento duplicado é bloqueado;
- lançamento cancelado não pode ser pago;
- lançamento pago não pode ser cancelado na V1;
- histórico financeiro é imutável;
- contas/categorias usam soft delete;
- DTOs validam UUID, datas, enums e valores monetários;
- `originId` é opcional e não concede acesso por si só;
- Asset Lifecycle financeiro só é publicado quando o `LifecyclePublisher` resolve equipamento por origem conhecida.

Fora do escopo de segurança V1:

- PIX;
- boleto;
- cartão;
- integração bancária;
- conciliação;
- SPED/fiscal/NF-e;
- contabilidade formal.

Eventos auditados:

- `FINANCIAL_ACCOUNT_CREATED`;
- `FINANCIAL_ACCOUNT_UPDATED`;
- `FINANCIAL_ACCOUNT_DELETED`;
- `FINANCIAL_CATEGORY_CREATED`;
- `FINANCIAL_CATEGORY_UPDATED`;
- `FINANCIAL_CATEGORY_DELETED`;
- `FINANCIAL_ENTRY_CREATED`;
- `FINANCIAL_ENTRY_UPDATED`;
- `FINANCIAL_ENTRY_PAID`;
- `FINANCIAL_ENTRY_CANCELED`.

## Procurement security

RBAC:

| Recurso           | OWNER | MANAGER | OPERATOR | VIEWER |
| ----------------- | ----- | ------- | -------- | ------ |
| Pedidos de compra | Total | Total   | Não      | Não    |
| Itens de compra   | Total | Total   | Não      | Não    |
| Recebimentos      | Total | Total   | Não      | Não    |

Proteções:

- DTOs validam UUID, datas, enums, valores monetários e quantidades;
- pedido recebido/cancelado não pode ser editado;
- item recebido não pode ser alterado ou removido;
- recebimento acima da quantidade comprada retorna `PURCHASE_INVALID_RECEIPT`;
- recebimento é transacional;
- entrada de estoque usa `InventoryService.createMovementInTransaction`;
- Procurement não recalcula saldo físico;
- Inventory permanece a única fonte de saldo físico;
- Financial automático não é executado na V1;
- histórico de compras é imutável;
- eventos de auditoria registram pedido, item, recebimento e ator.

Fora do escopo V1:

- aprovação de compras;
- cotações;
- múltiplos aprovadores;
- impostos;
- XML/NF-e;
- pagamentos automáticos;
- integrações fiscais.

## Sprint 19 — Integrity and concurrency hardening

Esta sprint não altera RBAC nem cria módulos. Ela reforça integridade contra abuso por duplo clique,
retry de rede, requisições concorrentes e stale writes.

Estratégias aplicadas:

- transações `Serializable` em workflows financeiros, recebimento de compras, pricing, budgets e
  assignments;
- compare-and-set com `updateMany` condicionado por status/assignee/snapshot;
- updates condicionais de saldo físico antes de criar `StockMovement`;
- constraint parcial para impedir múltiplos Budgets aprovados por Operation;
- exclusion constraint PostgreSQL para impedir overlap de vigência de preços ativos;
- índice único lógico para impedir múltiplos `InventoryItem` ativos para o mesmo
  organização/produto/local;
- stale-write guard no Document Engine usando `updatedAt` antes de persistir metadados renderizados.

Invariantes protegidos:

- Financial: pagamento não pode aplicar saldo duas vezes.
- Inventory: estoque disponível/current não pode ficar negativo por consumo concorrente.
- Procurement: recebimento não pode exceder quantidade comprada.
- Assignment: operador antigo não pode executar atividade após reatribuição.
- Budget: somente um orçamento aprovado por Operation.
- Pricing: preço ativo do mesmo produto/organização não pode ter vigência sobreposta.
- Document Engine: render concorrente não sobrescreve metadata de documento já alterado.

Comportamento de falha:

- conflitos de estado retornam `409` com códigos de domínio estáveis;
- conflitos devem ser tratados pelo cliente com refresh do recurso;
- não há locks em memória/processo;
- não há dependência de instância única do backend.

Risco residual documentado:

- banco e storage não formam uma transação distribuída. O Document Engine grava o binário antes de
  confirmar metadata; se metadata perder corrida, o binário recém-criado é removido como
  compensação best-effort. Auditoria e testes de falhas profundas de storage ficam para Sprint 20/22.

Pendências planejadas:

- Sprint 20: AppSec & Security Verification profunda, incluindo IDOR, abuso de estados e erros
  persistentes.
- Sprint 21: Performance, Load & Observability, incluindo concorrência em carga e N+1.
- Sprint 22: Production Readiness & Release Candidate, incluindo execução completa de migrations
  e testes contra ambiente limpo controlado.

## Sprint 19.5 — PostgreSQL proof and retry policy

Infraestrutura de teste real:

- `TEST_DATABASE_URL` obrigatório;
- banco precisa terminar com `_test`;
- migrations reais aplicadas antes da suíte;
- cleanup por truncate transacional controlado;
- unit tests ignoram `test/integration` e `test/concurrency`.

Retry policy:

- `FinancialService` possui retry bounded para `PrismaClientKnownRequestError P2034`.
- Motivo: pagamentos independentes concorrentes na mesma conta podem sofrer conflito serializável
  mesmo sendo semanticamente seguros para replay.
- Máximo atual: 3 tentativas.
- Não há retry para erros de domínio, validação, RBAC, storage ou comandos com side effects externos.

Provas realizadas:

- double payment financeiro;
- payment/cancel race;
- pagamentos independentes na mesma conta;
- overspend de estoque;
- duplicate return;
- over-receipt de compras;
- stale Assignment operator;
- duplicate Budget approval;
- partial unique Budget por Operation;
- exclusion constraint de Pricing;
- rollback PostgreSQL básico.

Bloqueio remanescente identificado na Sprint 19.5:

- O veredito `ORBIT_BACKEND_INTEGRITY_READY` requer também provas de Document Engine com falha de
  storage/banco e rollback específico de todos os fluxos cross-domain críticos.

## Sprint 19.6 — Integrity certification closure

O bloqueio remanescente de integridade foi fechado.

Document Engine:

- PostgreSQL continua sendo autoridade da metadata;
- storage continua sendo fronteira externa não transacional;
- falha de storage write não persiste renderização falsa;
- falha de metadata após storage write aciona cleanup best-effort;
- se cleanup falhar no futuro, o risco residual é órfão de storage, não metadata falsa;
- download com binário ausente retorna erro controlado.

Pricing:

- vigência oficial é half-open `[validFrom, validUntil)`;
- a constraint PostgreSQL `product_pricings_no_active_overlap` foi recriada com `[)`;
- revision flow fecha o preço anterior no instante de início do novo preço.

Retry:

- Financial mantém retry bounded somente para `P2034`;
- Procurement, Budget e Pricing não fazem retry cego;
- Pricing mapeia conflitos de serialização/constraint para `PRICING_OVERLAP`;
- Document Engine não reexecuta storage side effects automaticamente.

Verificação real:

- integration suite: 2 suites / 7 tests;
- concurrency suite: 2 suites / 24 tests;
- concurrency suite executada 5 vezes consecutivas sem flake.

Veredito: `ORBIT_BACKEND_INTEGRITY_READY`.

## Sprint 20 — AppSec & Security Verification

Modelo de fronteira verificado:

`Actor → JwtAuthGuard → RoleGuard → Controller → DTO Validation → Service authorization /
relationship checks → Transaction boundary → Prisma/PostgreSQL → Audit/History/Lifecycle`.

Autenticação:

- access tokens usam HS256, issuer e audience configurados;
- cada request protegido revalida a sessão em `RefreshToken`;
- usuário inativo/desativado perde acesso mesmo com access token já emitido;
- role claim do JWT não é autoridade: o guard retorna o usuário real carregado pela sessão.

RBAC verificado por teste HTTP:

| Domínio                    | OWNER | MANAGER     | OPERATOR | VIEWER |
| -------------------------- | ----- | ----------- | -------- | ------ |
| Financial                  | Sim   | Sim         | Não      | Não    |
| Pricing                    | Sim   | Sim leitura | Não      | Não    |
| Budgets                    | Sim   | Sim         | Não      | Não    |
| Procurement                | Sim   | Sim         | Não      | Não    |
| Organization assets upload | Sim   | Não         | Não      | Não    |

Confidencialidade comercial:

- OPERATOR/VIEWER não acessam endpoints diretos/nested de Pricing;
- Product responses não incluem `costPrice`, `replacementCost`, `averageCost`,
  `minimumSalePrice` ou `marginPercentage`;
- Budget continua restrito a OWNER/MANAGER.

Mass assignment:

- `POST /financial/entries` não aceita mais `status` nem `paidAt`;
- novos lançamentos nascem sempre `PENDING`;
- pagamento só ocorre pelo endpoint oficial de pagamento, com histórico/auditoria/transação.

Upload security:

- Organization BrandAsset agora valida MIME, extensão e assinatura binária;
- PDF exige `%PDF-`;
- PNG exige magic bytes PNG;
- JPEG exige magic bytes JPEG;
- SVG precisa ser SVG real e bloqueia `<script`, inline event handlers, `javascript:` e
  `foreignObject`;
- storage keys continuam server-generated com UUID;
- nomes originais são sanitizados e não controlam path.

Storage model:

- nenhum endpoint aceita storage key bruta do usuário para download;
- downloads passam pelo contexto de domínio autorizado;
- `LocalStorageProvider` normaliza paths e bloqueia traversal fora do root.

Error policy:

- exception filter mantém resposta pública padronizada;
- testes verificam que validação e auth failures não expõem SQL, Prisma internals,
  `DATABASE_URL` ou paths absolutos no payload público.

Rate limit:

- rate limit global permanece ativo via `ThrottlerGuard`;
- suíte de segurança força limite alto para não mascarar testes de autorização;
- validação operacional de limites por proxy/IP real permanece item de produção/observabilidade.

Security tests:

```bash
TEST_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_security_test?schema=public' npm run test:security
```

O banco precisa terminar com `_test`; migrations são aplicadas antes da execução.

Findings corrigidos:

- `S1-FIN-001`: FinancialEntry create aceitava estado terminal/pago.
- `S1-UPL-001`: BrandAsset aceitava conteúdo spoofado por MIME/extensão.

Riscos residuais documentados:

- SVG é validado por denylist conservadora, não por sanitizer/normalizador XML completo;
- proteção contra image decompression bomb não é garantida pela camada atual;
- teste automatizado de rate limit em topologia real de proxy fica para Production Readiness;
- frontend armazena tokens em `localStorage` com namespace por app; recomendação pós-V1 é avaliar
  cookies `HttpOnly`/BFF;
- inspeção frontend não encontrou `dangerouslySetInnerHTML`; object URLs são revogados nos fluxos
  principais.

## Sprint 20.5 — AppSec Verification Closure

Sprint de fechamento, sem novos domínios de negócio. A campanha reutiliza a infraestrutura da
Sprint 20 (`backend/test/jest-security.json`, bootstrap HTTP real, guards reais, Prisma e
PostgreSQL real) e amplia a cobertura para as superfícies que ainda não possuíam evidência
automatizada suficiente.

Suites adicionadas:

- `document-engine-closure.security.spec.ts`;
- `signatures-closure.security.spec.ts`;
- `maintenance-pmoc-closure.security.spec.ts`;
- `inventory-procurement-closure.security.spec.ts`;
- `asset-lifecycle-closure.security.spec.ts`;
- `audit-rate-closure.security.spec.ts`.

Cobertura AppSec fechada:

- Document Engine: RBAC por tipo, render/preview/download, template preview sem Operation,
  orçamento render/download, documentos inexistentes e ausência de auditoria falsa quando download
  falha por binário ausente.
- Signature Domain: RBAC, upload spoofado, path safety, storage UUID, auditoria sem binário e
  invariantes de template (`NONE`, `FIXED`, `HYBRID`, assinatura inativa).
- Maintenance Planning / PMOC: validação de recorrência, mutações inválidas, relação
  equipment/customer, ambiente PMOC fora de escopo e ausência de efeitos colaterais em falhas.
- Asset Lifecycle: filtros, anexos, autorização parent-child, upload spoofado e confidencialidade do
  payload público.
- Inventory / Procurement: mass assignment, quantidades abusivas, estoque negativo, consumo com
  produto/estoque incompatível, delete com parent errado, recebimento duplicado e over receipt.
- Audit metadata: credenciais, binários, base64, storage keys e payload bruto de upload inválido não
  entram em auditoria de sucesso.
- Rate limit/proxy trust: teste HTTP confirma que spoof de `X-Forwarded-For` não contorna o
  throttle da rota de login no app direto.
- Frontend: `frontend/app/(platform)/reports/visita/page.tsx` agora revoga object URLs ao remover
  foto e no unmount.

Finding descoberto e corrigido:

- `S1-LIFE-001`: endpoints públicos de Asset Lifecycle retornavam `metadata` bruto,
  `performer.email` e `storageKey`/campos internos de anexos por spread do evento Prisma. Correção:
  `AssetLifecycleService.withTimeline` e endpoints de anexos agora usam payload público sanitizado.
  Regressão: `asset-lifecycle-closure.security.spec.ts`.

Política pública do Asset Lifecycle após Sprint 20.5:

- não retornar `metadata` bruto;
- não retornar `storageKey`;
- não retornar `eventId`/`deletedAt` em anexos;
- não retornar e-mail do performer;
- frontend deve usar `timeline`, `timeline.references` e endpoints autorizados para downloads.

Verificação:

- `npm run test:security -- --silent`: 12 suites / 38 testes;
- cinco execuções consecutivas passaram contra PostgreSQL real (`orbit_closure_test`).

Risco residual movido para Production Readiness:

- em produção, o app Nest não deve ficar exposto diretamente à internet; deve operar atrás de proxy
  controlado e com acesso direto à porta da aplicação bloqueado por rede/firewall.

## Sprint 22 — production readiness security notes

Hardening applied:

- `NODE_ENV` is mandatory.
- In `NODE_ENV=production`, demo data and demo endpoints remain forbidden.
- In `NODE_ENV=production`, placeholder/example JWT secrets are rejected.
- In `NODE_ENV=production`, placeholder/example/local database URLs are rejected.
- Wildcard CORS remains rejected.
- Frontend demo bridge is opt-in (`NEXT_PUBLIC_ENABLE_DEMO=false` by default).
- A representative reverse proxy topology was added in `docker-compose.rc.yml` and
  `deploy/nginx/orbit.conf`.

Operational security evidence:

- AppSec suite passed: 12 suites / 38 tests.
- Rate limiting is covered by the security suite, including login throttling and forwarded-for spoof
  resistance in direct app mode.
- Critical workflow runner verified RBAC-sensitive flows through the real API.
- Secrets audit confirmed local `.env` files are ignored by Git; values must still be injected by
  the production runtime and never committed.

Residual security risks before production promotion:

- TLS/HSTS/certificate chain were not verified because no real public staging/production endpoint
  was provided.
- CI workflow was added but not executed by GitHub Actions in this workspace.
- Local storage was verified with persistent local/Docker volume semantics only; managed object
  storage/IAM evidence remains external.

## Sprint 22.5 — external closure security notes

Supply-chain:

- Frontend `postcss` advisory `GHSA-qx2v-qp2m-jg93` was remediated with a targeted
  `postcss@8.5.16` override.
- `npm audit --json` now reports 0 vulnerabilities for the frontend lockfile.

Deployment/storage:

- V1 supports isolated single-company deployments only.
- Persistent local/block storage is the official V1 strategy.
- `STORAGE_PATH` must be absolute in production and must not point to `/tmp` or `/var/tmp`.
- Object storage/IAM is not certified for V1.

Open RC blockers:

- TLS/proxy behavior, external CI, external rollback, external DB+storage restore and external
  bootstrap flow still require real environment evidence before RC promotion.

## Product Backlog Closure 02 — Document AppSec review

Garantias preservadas:

- RBAC dos endpoints de documentos não foi alterado.
- Tipos financeiros (`QUOTE`, `RECEIPT`) continuam restritos conforme política existente do Document Engine.
- Download continua passando pelo backend e `DocumentAssetResolver`; nenhum `storageKey` é exposto.
- `contentBase64` só é retornado no endpoint autorizado de download.
- AuditLog não recebe binário nem base64.
- Render falho não cria evento de sucesso, pois persistência/auditoria/lifecycle continuam após geração e storage bem-sucedidos.
- Preview e PDF usam o mesmo `DocumentBuilderService` e o mesmo `DocumentBlueprint`.

Cuidados frontend:

- não gerar PDF local;
- não construir URL de storage;
- revogar object URLs temporários ao baixar binários;
- tratar erros de documento não renderizado como estado controlado.

## Document Semantics Closure — preview mode security

Model Preview:

- usa apenas `DocumentTemplate` e placeholders estruturais;
- não consulta Operation/Budget;
- não cria `OperationDocument`;
- não executa render;
- não publica lifecycle/history de emissão.

Real Data Preview:

- exige fonte real autorizada;
- usa Document Context oficial;
- render/download continuam protegidos por RBAC;
- `TECHNICAL_REPORT` e `TECHNICAL_OPINION` seguem a mesma política de documentos operacionais;
- tipos financeiros continuam protegidos.

Compatibilidade:

- `REPORT` legado permanece acessível pelas regras existentes para não quebrar histórico.

## Product Backlog Closure 03 — Export and Signature AppSec

List PDF exports:

- são gerados no backend a partir de dados autorizados;
- retornam PDF raw, sem envelope e sem `storageKey`;
- não criam `OperationDocument`;
- não acessam storage;
- limite V1: 500 registros para evitar leitura/memória sem limite;
- filtros são validados por DTO;
- RBAC segue leitura dos domínios Operations, Documents e Equipments.

Signatures:

- soft delete usa `deletedAt` e `active=false`;
- listagem normal usa `deletedAt=null`;
- assinaturas inativas aparecem na gestão, mas não podem ser atribuídas a templates;
- assinaturas deletadas não podem ser atribuídas a templates;
- contrato público usa `hasImage` e não expõe `imageStorageKey`;
- upload e desenho convergem no mesmo endpoint, preservando validação MIME/binária, limite 2 MiB,
  storage UUID e auditoria sem base64/storage key.

## Product Backlog Closure 04 — Avatar e Notifications AppSec

Avatar:

- crop é apenas UX; backend continua autoridade de validação;
- storage key não é exposta publicamente;
- upload/delete operam apenas no usuário autenticado;
- MIME spoofing, extensão inválida e arquivo oversized continuam bloqueados.

Notifications:

- notificações são privadas por `recipientUserId`;
- list/count/read/read-all usam usuário autenticado;
- cross-user read retorna `NOTIFICATION_NOT_FOUND`;
- `eventKey` único previne duplicidade em retries;
- `actionUrl` é gerada pelo servidor e restrita a rotas internas;
- não há endpoint público para criação de notificações.

## DC02B — integridade documental

- competência é validada por DTO, serviço e constraints PostgreSQL;
- tipo de manutenção é enum e checklists possuem limites de coleção/texto;
- equipamentos inspecionados exigem UUID único, estado ativo e vínculo com o cliente da Operation;
- snapshots são resolvidos no backend, impedindo mass assignment de marca/modelo/capacidade;
- substituição de checklist/equipamentos ocorre transacionalmente;
- Corporate Header usa Organization validada e assets do `DocumentAssetResolver`; Builder/Renderer
  não acessam Storage ou Prisma;
- RBAC e limites de Blueprint, tabela, páginas, PDF e memória foram preservados.

AppSec dedicado: 12 suites / 38 testes aprovados, além dos gates PostgreSQL de integração e
concorrência.

# Maintenance checklist catalog security

The catalog is scoped to the installation Organization in every query. Reads require OWNER, MANAGER, or VIEWER; mutations require OWNER or MANAGER. UUID parsing, DTO allow-list validation, input length limits, control-character removal, global throttling, conflict handling, and audit events are applied. Deactivation is soft, preventing catalog cleanup from changing historical Operation and document snapshots.
