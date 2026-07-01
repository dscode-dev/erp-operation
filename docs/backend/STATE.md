# Backend State

## Current milestone

**Sprint — Assignment Domain + Operator Workflow**
Status: concluída em 1 de julho de 2026.

As Sprints 0, 1, 2, 3, 3.5, 4, 5, 6, 7, 8, 9, 9.5, 10, 11, 12 e 13 foram
preservadas. Esta sprint adiciona o domínio Assignment e integra o fluxo Operator sem criar agenda,
serviço ou OS paralelos.

Sprint 4 introduz o primeiro domínio operacional de produção: Customer. Organization continua
representando a empresa dona da instalação; Customer representa o cliente atendido por ela.

Sprint 5 introduziu Equipment como domínio real ligado obrigatoriamente a Customer e opcionalmente a
CustomerAddress e equipamento pai.

Sprint 6 introduziu o motor oficial de documentos de produção, exclusivamente backend:

```text
Operation
↓
DocumentBuilder
↓
DocumentBlueprint
↓
DocumentRenderer
↓
PDF Engine
```

O Builder concentra regras de negócio e resolve operação, cliente, equipamento, operador,
observações, fotos, checklist, documentos relacionados e assinatura preparada. O Blueprint é
independente de PDF. O Renderer transforma o Blueprint em páginas com cabeçalho/rodapé repetidos,
numeração, paginação e proteção contra quebras incorretas. O PDF Engine gera PDF diretamente, sem
HTML/print.

Sprint 7 adiciona a configuração documental persistida e o domínio Signature. Templates agora
suportam `requiresSignature`, `signatureMode` (`NONE`, `FIXED`, `COLLECTED`, `HYBRID`) e
`signatureId`. O Builder passa a receber organização/settings via `DocumentConfigurationService`;
ele ainda não aplica assinatura fixa/coletada no PDF, conforme fora de escopo da sprint.

Sprint 8 integra definitivamente assinaturas ao fluxo oficial:

```text
Operation
↓
DocumentContext
↓
DocumentConfigurationService
↓
DocumentBuilder
↓
DocumentBlueprint
↓
LayoutEngine
↓
DocumentRenderer
↓
PDF Engine
```

`DocumentContextService` passa a ser o ponto responsável por buscar Operation, organização,
template, configuração de assinatura e assets. O Builder não realiza consultas adicionais e apenas
transforma o contexto em Blueprint.

Sprint 9 cria o domínio oficial `AssetLifecycle`. A timeline do equipamento agora nasce de eventos
imutáveis, e não de múltiplas consultas espalhadas. Operations concluídas e documentos renderizados
registram eventos automaticamente no ciclo de vida do ativo.

Sprint 9.5 consolida a arquitetura do Asset Lifecycle antes de Maintenance Planning e PMOC:
`LifecyclePublisher` passa a ser o único ponto de publicação de eventos e `TimelineAssembler` passa
a entregar payloads prontos para renderização, com ícone, cor, título, subtítulo, categoria,
referências e anexos seguros.

Sprint 10 cria o domínio oficial **Maintenance Planning**, separando planejamento de execução. O
planejamento calcula recorrências e agenda futuras execuções; a execução operacional continua sendo
representada por `Operation`. Quando uma execução de manutenção é concluída, o histórico oficial do
ativo recebe evento `MAINTENANCE` publicado exclusivamente pelo `LifecyclePublisher`.

Sprint 11 cria o domínio oficial **PMOC Compliance** como especialização de Maintenance Planning.
PMOC não possui agenda, calendário, execução, timeline ou documento paralelos: usa
`MaintenancePlan`, `MaintenanceExecution`, `Operation`, `AssetLifecycle` e `Document Engine`.

Sprint 12 cria **Inventory & Materials**, separando Product Catalog, Inventory Item e Stock
Movement. Product continua técnico; Inventory controla apenas estoque físico; consumo em Operation
publica `PART_REPLACEMENT` via `LifecyclePublisher`.

Sprint 13 cria **Pricing** como a única fonte de informações comerciais de produtos. Product não
armazena preço e Inventory não armazena custo. Alterações comerciais criam nova vigência em
`ProductPricing`, preservando histórico.

## Architecture

- NestJS 11, TypeScript estrito, PostgreSQL e Prisma.
- API versionada em `/api/v1`.
- JWT com refresh rotation, Argon2id, guards globais e RBAC.
- Novo `UsersModule` para equipe, perfil, preferências, permissões e avatar.
- Storage local reutilizado por abstração para avatares.
- Senha temporária com troca obrigatória aplicada por guard global.
- Respostas preservam os envelopes globais de sucesso e erro.
- Demo dataset opcional em `src/seeds/demo`.
- Módulo interno local-only para leitura/reset do dataset de integração.

Módulos:

```text
src/modules/
├── auth/
├── assignments/
├── asset-lifecycle/
├── config/
├── customers/
├── document-engine/
├── database/
├── equipments/
├── health/
├── internal-demo/
├── maintenance-planning/
├── organization/
├── pmoc-compliance/
├── pricing/
├── signatures/
└── users/
```

## Persistence

Migrations:

1. `20260619090000_foundation`
2. `20260619130000_auth_rbac`
3. `20260623140000_organization_foundation`
4. `20260624110000_user_team_foundation`
5. `20260624160000_customer_domain_foundation`
6. `20260624190000_equipment_domain_foundation`
7. `20260627120000_template_is_active`
8. `20260627150000_operation_domain_foundation`
9. `20260629110000_document_engine_foundation`
10. `20260629150000_document_configuration_signature_domain`
11. `20260630110000_asset_lifecycle_foundation`
12. `20260630130000_asset_lifecycle_refinement`
13. `20260630150000_maintenance_planning_domain`
14. `20260630170000_pmoc_compliance_domain`
15. `20260701120000_inventory_materials_domain`
16. `20260701150000_pricing_domain`
17. `20260701170000_assignment_domain`

Sprint 3.5 não criou migrations e não alterou `schema.prisma`.

### Customer Domain

Entidades:

- `Customer`, com enum `PERSON`/`COMPANY`, CPF/CNPJ opcionais e soft delete;
- `CustomerAddress`;
- `CustomerContact`;
- `CustomerAttachment`, com binário no StorageProvider.

Busca parcial cobre nome, nome fantasia, telefone, e-mail, CPF e CNPJ. Listagem usa `page`, `limit`
e `search`. Endereço e contato principal são únicos por cliente por regra transacional.

RBAC:

- OWNER: acesso total;
- MANAGER: criar, editar, visualizar e gerenciar sub-recursos;
- OPERATOR/VIEWER: leitura;
- exclusão lógica do Customer e exclusão de anexos: somente OWNER.

Upload de anexos: PDF/PNG/JPG/JPEG, 5 MiB, validação de extensão, MIME e assinatura binária.

Demo:

- Hospital Santa Clara;
- Condomínio Atlântico Sul;
- Shopping Recife;
- Colégio Boa Viagem.

Os clientes demo agora usam exclusivamente as entidades reais, com endereço, contato e anexo.
`demo.customers.v1` foi removido.

Endpoints: CRUD/status/stats de customers; CRUD de addresses/contacts; upload/read/delete de
attachments.

Validação em PostgreSQL 17 confirmou migration, CRUD, busca, paginação, stats, soft delete, RBAC,
anexos, idempotência do seed e os 13 eventos de auditoria.

### Equipment Domain

Entidades:

- `Equipment`;
- `EquipmentAttachment`;
- `EquipmentMetric`;
- enums `EquipmentType`, `EquipmentStatus`, `EquipmentAttachmentCategory`.

Equipment pertence a Customer, pode apontar para CustomerAddress do mesmo cliente e pode possuir um
parent simples do mesmo cliente. Relações cruzadas e ciclo direto são rejeitados.

`qrToken` é UUID único e `qrCode` usa `equipment:<qrToken>`. Não há geração de imagem.

Busca: name, tag, serialNumber, model e manufacturer. Filtros: customerId, addressId, status e type.
Stats retornam totais por status e por tipo.

RBAC:

- OWNER total;
- MANAGER CRUD/status, anexos e métricas;
- OPERATOR leitura e criação de métricas;
- VIEWER leitura.

Demo real:

- Split Samsung 24.000 BTU;
- Condensadora LG VRF;
- Chiller Trane 120 TR;
- Inversor Fronius 8kW;
- Evaporadora LG VRF filha da condensadora.

Cada equipamento demo possui endereço real, métrica e manual PDF. `demo.equipment.v1` foi removido.

Validação: 6 migrations do zero, 5 equipamentos demo, hierarquia, filtros combinados, QR,
integridade customer/address/parent, métricas, anexos, soft delete, RBAC e nove eventos auditados.

### Document Engine

Módulo: `src/modules/document-engine`.

Camadas:

- `builder/DocumentBuilderService`: recebe `OperationDocumentContext` ou `TemplatePreviewContext` e monta um `DocumentBlueprint`;
- `blueprint/document-blueprint.types`: modelo oficial independente de PDF com Header, Footer,
  Section, Paragraph, Table, List, Image, QR Code, Checklist, SignaturePlaceholder, Observation e
  Metadata;
- `renderer/DocumentRendererService`: paginação lógica, cabeçalho/rodapé repetidos, numeração e
  quebra de tabela por blocos;
- `pdf/PdfEngineService`: geração direta de PDF 1.7 usando primitives de PDF, fontes Helvetica,
  múltiplas páginas, linhas, caixas, textos, tabelas e metadados;
- `signatures/*`: contratos e resolver padrão para futura assinatura fixa/coletada/híbrida/sem
  assinatura. Não há CRUD, tabela ou domínio funcional de assinatura nesta sprint.

`OperationDocument` recebeu:

- `storageKey`;
- `mimeType`;
- `fileSize`;
- `renderedAt`;
- `renderMetadata`.

Storage:

- PDFs são gravados em `documents/operations/<operationId>/<type>-<uuid>.pdf`;
- nomes externos nunca são usados no path;
- download retorna base64 via contrato JSON atual.

Endpoints criados:

| Method | Path                                                      | Access                           |
| ------ | --------------------------------------------------------- | -------------------------------- |
| GET    | `/api/v1/documents/operations/:operationId/:type/preview` | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/documents/templates/:templateId/preview`          | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/documents/operations/:operationId/:type/render`  | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/documents/:documentId/preview`                   | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/documents/:documentId/render`                    | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/documents/:documentId/download`                  | OWNER, MANAGER, OPERATOR, VIEWER |

Documentos financeiros (`QUOTE`, `RECEIPT`) são bloqueados para não-OWNER por segurança.

Audit events:

- `DOCUMENT_PREVIEWED`;
- `TEMPLATE_PREVIEWED`;
- `DOCUMENT_RENDERED`;
- `DOCUMENT_DOWNLOADED`.

Limites de AppSec:

- 80 seções;
- 600 componentes;
- 400 linhas de tabela/checklist;
- 80 páginas renderizadas;
- PDF máximo de 10 MiB;
- sanitização de texto antes do Blueprint e do PDF;
- storage key gerada por UUID para evitar path traversal;
- renderer/PDF engine não acessam banco de dados.

Backlog Document Template Preview:

- `TemplatePreviewContext` criado para renderizar modelos sem `Operation`, `Customer` ou `Equipment`;
- `DocumentContextService.buildTemplatePreviewContext(templateId)` monta organização, settings, brand assets, template, assinatura e placeholders oficiais;
- `DocumentBuilderService` aceita contexto operacional ou contexto de preview de modelo e reutiliza o mesmo Blueprint/Renderer;
- endpoint `GET /api/v1/documents/templates/:templateId/preview` retorna o mesmo `DocumentBlueprint` usado pelos previews de documentos emitidos;
- não há renderização PDF definitiva nem criação de `OperationDocument` para preview de template.

### Document Configuration & Signature Domain

Sprint 7 criou a fundação de configuração documental e assinatura.

Entidades/alterações:

- `Signature`:
  - `id`;
  - `name`;
  - `title`;
  - `imageStorageKey`;
  - `mimeType`;
  - `originalFileName`;
  - `fileSize`;
  - `active`;
  - `createdAt`;
  - `updatedAt`.
- `DocumentTemplate`:
  - `requiresSignature Boolean @default(false)`;
  - `signatureMode SignatureMode @default(NONE)`;
  - `signatureId String?`.
- enum `SignatureMode`: `NONE`, `FIXED`, `COLLECTED`, `HYBRID`.

Arquitetura criada:

- `DocumentAssetResolver`: única porta para assets de documentos no StorageProvider. Centraliza PDF,
  assinaturas e futuros logos/marca d'água/fotos/QR codes;
- `DocumentConfigurationService`: fornece organização, settings, templates ativos, default template
  e assinatura para o Builder sem expor consultas diretas a tabelas;
- `LayoutEngine`: prepara cálculo de área imprimível, largura útil, altura útil e quebra lógica de
  página;
- `DocumentMeasureService`: mede texto, tabela, imagem, lista e checklist para uso do LayoutEngine;
- `SignaturesModule`: CRUD, upload/download e auditoria de assinaturas.

Endpoints criados:

| Method | Path                                            | Access                 |
| ------ | ----------------------------------------------- | ---------------------- |
| GET    | `/api/v1/documents/configuration`               | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/documents/configuration/types/:type`   | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/documents/configuration/templates/:id` | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/signatures`                            | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/signatures/:id`                        | OWNER, MANAGER, VIEWER |
| POST   | `/api/v1/signatures`                            | OWNER                  |
| PATCH  | `/api/v1/signatures/:id`                        | OWNER                  |
| DELETE | `/api/v1/signatures/:id`                        | OWNER                  |
| POST   | `/api/v1/signatures/:id/upload`                 | OWNER                  |
| GET    | `/api/v1/signatures/:id/download`               | OWNER, MANAGER, VIEWER |

AppSec:

- OPERATOR sem acesso ao domínio de configuração/assinatura;
- OWNER é o único papel com escrita;
- upload de assinatura limitado a 2 MiB;
- PNG/JPG/JPEG com validação de extensão, MIME e assinatura binária;
- nome original sanitizado e nunca usado para storage key;
- storage key gerada com UUID;
- soft delete de assinatura (`active=false`);
- templates `FIXED`/`HYBRID` exigem assinatura ativa;
- AuditLog registra criação/edição/soft delete/upload/download de assinatura.

Audit events:

- `SIGNATURE_CREATED`;
- `SIGNATURE_UPDATED`;
- `SIGNATURE_DELETED`;
- `SIGNATURE_IMAGE_UPLOADED`;
- `SIGNATURE_IMAGE_DOWNLOADED`.

Seeds:

- Demo seed cria assinaturas de exemplo somente quando `ENABLE_DEMO_DATA=true`;
- reset demo remove assinaturas e imagens demo pelo manifesto;
- nenhuma nova migration ou dependência foi criada para demo dataset.

Validação executada:

- `npm run lint`;
- `npm test`;
- `npm run build`;
- `DATABASE_URL=... npx prisma validate`;
- todas as migrations foram aplicadas em PostgreSQL 17 limpo, incluindo
  `20260629150000_document_configuration_signature_domain`.

### Document Signature Integration

Sprint 8 não criou migrations nem alterou endpoints. A integração é arquitetural e funcional dentro
do Document Engine.

Novos/alterados:

- `DocumentContextService`: entrega ao Builder um único objeto contendo Operation, cliente,
  equipamento, operador, organização, settings, template, configuração de assinatura e assets
  resolvidos;
- `DocumentBlueprint` recebeu componente `signature`;
- `DocumentRendererService` renderiza assinatura fixa, linha manual, nome, cargo, data e legenda;
- `PdfEngineService` recebeu suporte a imagem de assinatura:
  - JPEG via `/DCTDecode`;
  - PNG 8-bit gray/RGB/gray+alpha/RGBA com filtros PNG básicos e `/FlateDecode`;
- `DocumentAssetResolver` resolve assinatura, logo, marca d'água, QR Code e imagens documentais;
- seed demo de assinatura passou a usar PNG válido para renderização direta no PDF.

Modos:

- `NONE`: não adiciona seção de assinatura;
- `FIXED`: carrega assinatura ativa configurada no template, resolve imagem via
  `DocumentAssetResolver` e insere no Blueprint/PDF;
- `COLLECTED`: reserva área manual, sem inserir assinatura fixa;
- `HYBRID`: insere assinatura fixa e reserva também área manual.

Paginação:

- componente `signature` sempre usa `keepTogether=true`;
- Renderer move o bloco inteiro para a próxima página se não houver espaço;
- tabelas continuam quebradas por blocos com cabeçalho repetido;
- checklists continuam renderizados como blocos não quebrados por item.

AppSec:

- assinatura inexistente/inativa/imagem ausente interrompe render com erro controlado;
- nenhuma camada acessa storage diretamente fora do `DocumentAssetResolver`;
- imagem de assinatura não entra no AuditLog;
- PDF mantém limite de 10 MiB;
- textos são sanitizados antes do Blueprint/PDF;
- PNG/JPEG inválido é rejeitado pelo PDF engine.

Validação executada:

- `npm run lint`;
- `npm test`;
- `npm run build`;
- `DATABASE_URL=... npx prisma validate`.

### Stage 0

`Organization` recebeu:

- `segment String?`

`DocumentTemplate` recebeu:

- `isSystem Boolean @default(false)`

Templates default existentes são migrados para `isSystem=true`. Templates de sistema podem ser
editados, mas não excluídos.

### User expandido

Campos adicionados:

- `avatarAssetId`
- `phone`
- `jobTitle`
- `notes`
- `mustChangePassword`
- `disabledAt`

### Novas entidades

`UserPreferences`:

- `id`
- `userId` único
- `theme`: `SYSTEM`, `LIGHT` ou `DARK`
- `notificationsEnabled`
- timestamps

`UserPermission`:

- `id`
- `userId` único
- `canFinancial`
- `canUsers`
- `canReports`
- `canSchedules`
- `canTemplates`
- timestamps

`UserAvatarAsset`:

- metadados do arquivo de avatar;
- relação opcional um-para-um com `User`;
- storage key independente dos assets organizacionais.

Não foi criado campo de idioma, locale ou infraestrutura i18n para usuários.

## Access model

- `OWNER`: lista, consulta, cria, edita, desativa, ativa, remove por soft delete e redefine senha.
- `MANAGER`: lista e consulta equipe.
- `VIEWER`: lista e consulta equipe em modo leitura.
- `OPERATOR`: somente perfil, preferências, senha e avatar próprios.
- Todos os papéis podem gerenciar suas próprias preferências, senha e avatar.

Permissões granulares complementam o papel:

- OWNER recebe todas efetivamente como `true`;
- MANAGER possui valores configuráveis pelo OWNER;
- OPERATOR e VIEWER permanecem com os cinco flags administrativos em `false`.

## Password lifecycle

- Criação e reset geram senha aleatória de 32 caracteres base64url.
- A senha temporária é retornada uma única vez na resposta.
- `mustChangePassword=true` é obrigatório em criação/reset.
- Guard global bloqueia rotas normais com `PASSWORD_CHANGE_REQUIRED`.
- Permanecem acessíveis durante bootstrap: login, `/auth/me`, `/users/me` e troca de senha.
- Troca e reset revogam todas as sessões ativas.
- Troca rejeita senha atual inválida e reutilização da senha corrente.

## Soft delete and owner safety

- `DELETE /users/:id` não remove registro.
- Soft delete define `isActive=false` e `disabledAt`.
- Disable/delete revogam sessões imediatamente.
- OWNER não pode desativar ou excluir a própria conta.
- O último OWNER ativo não pode ser desativado, removido ou rebaixado.

## Avatar security

- Extensões: `png`, `jpg`, `jpeg`.
- MIME: `image/png`, `image/jpeg`.
- Limite: 2 MiB.
- Assinatura binária PNG/JPEG é validada.
- Nome de storage usa UUID em `users/avatar/`.
- Nome original é apenas metadado sanitizado.
- Substituição remove o asset anterior.

## Endpoints added

| Method | Path                               | Access                      |
| ------ | ---------------------------------- | --------------------------- |
| GET    | `/api/v1/users`                    | OWNER, MANAGER, VIEWER      |
| GET    | `/api/v1/users/:id`                | OWNER, MANAGER, VIEWER      |
| POST   | `/api/v1/users`                    | OWNER                       |
| PATCH  | `/api/v1/users/:id`                | OWNER                       |
| DELETE | `/api/v1/users/:id`                | OWNER                       |
| PATCH  | `/api/v1/users/:id/disable`        | OWNER                       |
| PATCH  | `/api/v1/users/:id/enable`         | OWNER                       |
| PATCH  | `/api/v1/users/:id/reset-password` | OWNER                       |
| PATCH  | `/api/v1/users/change-password`    | Todos, para a própria conta |
| GET    | `/api/v1/users/me/preferences`     | Todos, para a própria conta |
| PATCH  | `/api/v1/users/me/preferences`     | Todos, para a própria conta |
| GET    | `/api/v1/users/me`                 | Todos, para a própria conta |
| POST   | `/api/v1/users/avatar`             | Todos, para a própria conta |
| GET    | `/api/v1/users/avatar/:id`         | Todos os autenticados       |
| DELETE | `/api/v1/users/avatar`             | Todos, para a própria conta |

`GET /users` aceita `page`, `limit` e `search`.

## Audit events

- `USER_CREATED`
- `USER_UPDATED`
- `USER_DISABLED`
- `USER_ENABLED`
- `USER_DELETED`
- `PASSWORD_RESET`
- `PASSWORD_CHANGED`
- `AVATAR_UPDATED`
- `PREFERENCES_UPDATED`

Senhas, hashes, tokens e conteúdo base64 não são registrados.

## Seed

O seed continua idempotente e agora:

- cria preferências e permissões completas para o OWNER;
- corrige esses registros quando o OWNER já existe;
- marca os seis templates padrão como `isSystem=true`.

## Verification performed

- Prisma schema válido e client gerado.
- Quatro migrations executadas do zero em PostgreSQL 17.
- Build Docker aprovado.
- Health check com banco conectado.
- Build TypeScript aprovado.
- ESLint aprovado.
- 2 suítes e 6 testes aprovados.
- Fluxos reais validados em container:
  - login OWNER;
  - profile agregado;
  - segment organizacional;
  - proteção de template de sistema;
  - criação de MANAGER;
  - bloqueio por troca obrigatória;
  - troca de senha e revogação da sessão anterior;
  - paginação/busca;
  - leitura MANAGER e escrita negada;
  - preferências;
  - upload/leitura/exclusão de avatar;
  - disable/enable;
  - reset de senha;
  - soft delete;
  - proteção contra auto-desativação.

## Explicitly not implemented

- convites ou recuperação por e-mail;
- MFA, SSO ou notificações reais;
- idioma/locale/i18n de usuário;
- clientes, equipamentos, produtos, serviços, agenda, orçamentos, OS, relatórios operacionais ou
  financeiro.

## Future work

- Sprint 4 pode iniciar o primeiro módulo operacional.
- Aplicar os flags granulares em módulos futuros por decorators/guards específicos do recurso.
- Considerar streaming/binário de avatar quando cache HTTP for necessário.
- Adicionar política automática para limpeza de sessões expiradas e arquivos órfãos.

## Sprint 3.5 demo environment

Variáveis:

- `ENABLE_DEMO_DATA=false` por padrão;
- `ENABLE_DEMO_ENDPOINTS=false` por padrão.

Produção rejeita startup se qualquer flag estiver habilitada.

Seed:

- `src/seeds/demo/demo.seed.ts`;
- executável por `npm run prisma:seed:demo`;
- também invocado pelo seed principal quando habilitado;
- idempotente;
- gera senhas aleatórias somente para usuários efetivamente criados;
- não sobrescreve usuários ou organizações personalizadas.

Dados reais nas entidades existentes:

- organização Climatize Refrigeração em instalação vazia/bootstrap;
- usuários `ninja`, `ricardo`, `joao`, `maria`, `financeiro`;
- preferências e permissões para contas criadas.

Snapshots temporários em `SystemSetting`:

- dashboard;
- agenda;
- financeiro;
- manifesto interno.

Esses snapshots não representam modelagem final dos módulos.

Endpoints internos:

| Method | Path                            | Access |
| ------ | ------------------------------- | ------ |
| GET    | `/api/v1/internal/demo/dataset` | OWNER  |
| POST   | `/api/v1/internal/demo/reset`   | OWNER  |

Ambos exigem ambiente development e os dois flags demo. Quando desabilitados respondem 404.

Documentação adicionada:

- `docs/backend/DEMO_DATA.md`;
- `docs/backend/OPUS_INTEGRATION.md`.

Verificações específicas:

- ambiente sem demo mantém flags false;
- execução sem demo criou zero chaves `demo.*`;
- desenvolvimento aceita demo;
- produção rejeita demo;
- snapshots são determinísticos para uma data fixa;
- nomes realistas e equipamentos esperados validados em testes.
- seed executado duas vezes sem duplicar usuários ou reemitir senhas;
- reset interno recriou apenas registros demo;
- resultado validado: 5 usuários, 5 preferências e 6 settings reservados;
- dataset interno retornou 4 clientes e 4 equipamentos;
- endpoint interno retornou 404 quando flags estavam desligadas.

## Backlog #001 — Agenda (produção)

- `demo.schedule.v1` enriquecido (equipment, serviceType, endsAt, notes, estado `DONE`) e distribuído por meses adjacentes para a navegação do calendário; sem novos snapshots.
- Contrato futuro `GET /schedule?from=&to=&month=&year=` documentado (API_CONTRACTS) — o frontend já consulta por intervalo a cada navegação.

## Backlog #002 — QR Code operacional

- Novo endpoint `GET /equipments/lookup/:qrCode` (service `lookupByQrCode`) — aceita `qrCode`/`qrToken`, retorna o equipamento completo, 404 quando inexistente, 400 para QR vazio. Formato do QR inalterado.
- Documentado em API_CONTRACTS / FRONTEND_INTEGRATION / OPUS_INTEGRATION.

## Backlog #003 — Relatórios, Documentos e Templates

- `DocumentTemplate.isActive` (migration `20260627120000_template_is_active`) — ativar/desativar modelos; DTO/serviço/contratos atualizados. Sem novos Demo Datasets (usa `demo.documents.v1`).

## Backlog #004 — Operações (OS + Formulários Base)

- Novo domínio **Operation** (real, Prisma): `Operation`, `OperationPhoto`, `OperationDocument` + enums `OperationType`/`OperationStatus`/`OperationDocumentStatus`. Migration `20260627150000_operation_domain_foundation`.
- Módulo `operations` (controller/service/dto): `GET /operations` (filtros), `/stats`, `/:id`, `/photos/:id` (base64), `POST /operations` (cria + **OS rascunho** automática `WORK_ORDER/DRAFT`, número `OS-000001` derivado do sequencial), `PATCH /:id`. Operador = usuário autenticado por padrão; `OWNER`/`MANAGER` podem delegar via `operatorId`; fotos via storage provider (data URL, PNG/JPEG, 16 × 5 MiB); assinatura como texto.
- Toda OS nasce de uma Operation; `OperationDocument` reusa `DocumentTemplateType` (fundação única para OS/PMOC/Laudo/Relatório/Visita/Orçamento/Recibo). Histórico de equipamento/cliente derivado de `/operations` (sem duplicação). PDF oficial é gerado pelo Document Engine da Sprint 6.
- Validado com `prisma generate` + `tsc --noEmit` (sem banco neste ambiente; migration roda no deploy).

## Sprint 9 — Asset Lifecycle Foundation

Domínio criado:

- `src/modules/asset-lifecycle`;
- `AssetLifecycleService` como único ponto de criação e leitura de eventos históricos;
- `AssetLifecycleController` expondo timeline, eventos, anexos e estatísticas;
- `AssetLifecycleModule` exportado para integrações internas.

Entidades:

- `AssetLifecycleEvent`;
- `AssetLifecycleAttachment`.

Enum oficial:

- `INSTALLATION`;
- `INSPECTION`;
- `PREVENTIVE`;
- `CORRECTIVE`;
- `MAINTENANCE`;
- `PART_REPLACEMENT`;
- `WARRANTY`;
- `DOCUMENT`;
- `NOTE`;
- `CUSTOM`.

Decisões arquiteturais:

- eventos históricos são imutáveis: não há endpoint de edição ou exclusão de evento;
- correções devem ser representadas por novo evento;
- anexos possuem soft delete em `deletedAt`;
- PDFs e imagens não são duplicados no evento: documentos gerados são referenciados por `documentId`;
- Operations concluídas geram evento automaticamente via `recordOperationCompletedTx`;
- Document Engine registra evento `DOCUMENT` automaticamente após renderização via `recordDocumentRenderedTx`;
- integrações automáticas são idempotentes por `operationId`/`documentId`.

Timeline:

- construída exclusivamente a partir de `AssetLifecycleEvent`;
- suporta paginação;
- suporta filtros por equipamento, operação, tipo, operador e período;
- ordenação padrão por `occurredAt desc`.

Endpoints adicionados:

| Method | Path                                                    | Access                           |
| ------ | ------------------------------------------------------- | -------------------------------- |
| GET    | `/api/v1/asset-lifecycle`                               | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/asset-lifecycle/:id`                           | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/asset-lifecycle`                               | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/equipments/:id/lifecycle`                      | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/equipments/:id/lifecycle/stats`                | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/asset-lifecycle/:id/attachments`               | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/asset-lifecycle/:id/attachments`               | OWNER, MANAGER, OPERATOR         |
| DELETE | `/api/v1/asset-lifecycle/:id/attachments/:attachmentId` | OWNER, MANAGER                   |

Auditoria:

- `ASSET_LIFECYCLE_EVENT_CREATED`;
- `ASSET_LIFECYCLE_EVENT_AUTO_CREATED`;
- `ASSET_LIFECYCLE_ATTACHMENT_UPLOADED`;
- `ASSET_LIFECYCLE_ATTACHMENT_DELETED`.

Seed demo:

- `src/seeds/demo/demo.seed.ts` agora cria histórico coerente para equipamentos demo existentes;
- eventos são idempotentes e marcados com `DEMO_MARKER`;
- nenhum novo Demo Dataset foi criado.

Verificação executada:

- `npx prisma generate`;
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- todas as migrations aplicadas em PostgreSQL Docker limpo, incluindo `20260630110000_asset_lifecycle_foundation`;
- `npm run build`;
- `npm run lint`;
- `npm test` com 7 suítes e 21 testes aprovados.

## Sprint 11 — PMOC Compliance Domain

Domínio criado:

- `src/modules/pmoc-compliance`;
- `PmocComplianceService` como façade de PMOC, ambientes, compliance status, estatísticas e
  preparação documental;
- `ComplianceEvaluator` e tipos base para futura Compliance Engine;
- `PmocComplianceController` expondo API PMOC;
- `PmocComplianceModule` importado no `AppModule`.

Entidades:

- `PmocPlan`;
- `PmocEnvironment`;
- `PmocPlanEquipment`;
- `PmocEnvironmentEquipment`.

Enum oficial:

- `PmocComplianceStatus`: `COMPLIANT`, `WARNING`, `OVERDUE`, `NON_COMPLIANT`, `IN_PROGRESS`.

Asset Lifecycle expandido:

- `PMOC_CREATED`;
- `PMOC_UPDATED`;
- `PMOC_COMPLETED`;
- `PMOC_EXPIRED`.

Decisões arquiteturais:

- cada PMOC possui exatamente um `MaintenancePlan`;
- PMOC não armazena recorrência própria;
- PMOC não cria execução própria;
- ambientes relacionam equipamentos reais, sem duplicar `Equipment`;
- execuções continuam em `MaintenanceExecution`;
- intervenções continuam em `Operation`;
- timeline continua em `AssetLifecycle`;
- documentos PMOC são preparados para `DocumentTemplateType.PMOC` via Document Engine.

Compliance status:

- `NON_COMPLIANT`: PMOC ou MaintenancePlan inativo;
- `OVERDUE`: validade vencida ou execução planejada vencida;
- `IN_PROGRESS`: vigência futura;
- `WARNING`: execução prevista nos próximos sete dias;
- `COMPLIANT`: ativo, vigente e sem pendências próximas/vencidas.

Endpoints adicionados:

| Method | Path                            | Access                           |
| ------ | ------------------------------- | -------------------------------- |
| GET    | `/api/v1/pmoc/stats`            | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/pmoc`                  | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/pmoc/:id`              | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/pmoc`                  | OWNER, MANAGER                   |
| PATCH  | `/api/v1/pmoc/:id`              | OWNER, MANAGER                   |
| DELETE | `/api/v1/pmoc/:id`              | OWNER, MANAGER                   |
| GET    | `/api/v1/pmoc/:id/environments` | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/pmoc/:id/environments` | OWNER, MANAGER                   |
| PATCH  | `/api/v1/pmoc/environments/:id` | OWNER, MANAGER                   |
| DELETE | `/api/v1/pmoc/environments/:id` | OWNER, MANAGER                   |
| GET    | `/api/v1/pmoc/:id/compliance`   | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/equipments/:id/pmoc`   | OWNER, MANAGER, OPERATOR, VIEWER |

Auditoria:

- `PMOC_CREATED`;
- `PMOC_UPDATED`;
- `PMOC_DELETED`;
- `PMOC_ENVIRONMENT_CREATED`;
- `PMOC_ENVIRONMENT_UPDATED`;
- `PMOC_ENVIRONMENT_DELETED`.

Integrações:

- PMOC cria `MaintenancePlan` preventivo e primeira `MaintenanceExecution`;
- conclusão de execução PMOC publica `MAINTENANCE` e `PMOC_COMPLETED` via `LifecyclePublisher`;
- criação/atualização/vencimento publica eventos PMOC via `LifecyclePublisher`;
- compliance retorna configuração documental `PMOC` via `DocumentConfigurationService`.

Seed demo:

- `src/seeds/demo/demo.seed.ts` cria PMOCs coerentes para Chiller Hospital Santa Clara e VRF
  Shopping Recife;
- dados são idempotentes, opcionais e removíveis pelo manifesto demo;
- nenhum novo Demo Dataset foi criado.

Verificação executada até este registro:

- `npx prisma generate`;
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- todas as migrations aplicadas em PostgreSQL Docker limpo, incluindo
  `20260630170000_pmoc_compliance_domain`;
- `npm run build`;
- `npm run lint`;
- `npm test` com 7 suítes e 21 testes aprovados.

## Sprint 9.5 — Asset Lifecycle Refinement & Consolidation

Arquitetura consolidada:

- `LifecyclePublisher`: serviço oficial para publicação de eventos do ciclo de vida;
- `TimelineAssembler`: serviço oficial para montar timeline pronta para consumo;
- `AssetLifecycleService`: permanece como façade de API, listagem, anexos, estatísticas e
  enriquecimento de payload;
- Operations e Document Engine não dependem mais do `AssetLifecycleService` para emitir eventos.

Garantia arquitetural:

- criação direta de `AssetLifecycleEvent` no backend ficou concentrada em
  `LifecyclePublisher`;
- integrações atuais migradas:
  - `OperationsService` usa `publishOperationCompletedTx`;
  - `DocumentEngineService` usa `publishDocumentRenderedTx`;
  - seed demo usa `publishManual` para enriquecer dados existentes.

Timeline enriquecida:

- cada evento retorna também `timeline`;
- listagens retornam `timelineGroups`;
- `timeline` inclui:
  - `icon`;
  - `color`;
  - `title`;
  - `subtitle`;
  - `category`;
  - `description`;
  - `date`;
  - `groupKey`;
  - `sortKey`;
  - `user`;
  - `type`;
  - `operationId`;
  - `documentId`;
  - `equipmentId`;
  - `references`;
  - `attachments`;
  - `badges`.

Contratos preservados:

- os campos originais de `AssetLifecycleEvent` continuam no payload;
- os novos campos são aditivos;
- nenhum endpoint novo foi criado.

Melhorias de API:

- `GET /asset-lifecycle` passa a aceitar filtro `customerId`;
- ordenação passou a usar `occurredAt desc` e `id desc` para consistência;
- eventos `DOCUMENT` incluem metadata com `documentId`, `documentType`, `documentNumber`,
  `renderStatus` e `renderedAt`;
- eventos de Operation incluem metadata com `operationId`, `operationNumber`, `operationType` e
  `operationStatus`.

Performance:

- migration `20260630130000_asset_lifecycle_refinement` adiciona índices:
  - `asset_lifecycle_eq_type_at_idx`;
  - `asset_lifecycle_eq_performer_at_idx`;
  - `asset_lifecycle_at_id_idx`;
  - `asset_lifecycle_doc_type_idx`;
- migration foundation usa índice curto explícito `asset_lifecycle_eq_at_idx`;
- esses índices cobrem timeline por equipamento, filtros por tipo, operador, período e documentos.

Verificação executada:

- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- todas as migrations aplicadas em PostgreSQL Docker limpo;
- `npm run build`;
- `npm run lint`;
- `npm test` com 7 suítes e 21 testes aprovados.

## Sprint 10 — Maintenance Planning Domain

Domínio criado:

- `src/modules/maintenance-planning`;
- `MaintenancePlanningService` como façade transacional de planos, execuções, estatísticas e
  sincronização com Operations;
- `RecurringEngine` independente para cálculo de próximas ocorrências;
- `MaintenancePlanningController` expondo a API de planejamento e consultas por equipamento;
- `MaintenancePlanningModule` importado no `AppModule` e no `OperationsModule`.

Entidades:

- `MaintenancePlan`;
- `MaintenanceExecution`.

Enums:

- `MaintenancePlanType`: `PREVENTIVE`, `INSPECTION`, `WARRANTY`, `CUSTOM`;
- `MaintenancePriority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`;
- `MaintenanceExecutionStatus`: `PLANNED`, `LINKED`, `COMPLETED`, `CANCELED`.

Recorrência:

- `DAILY`;
- `WEEKLY`;
- `MONTHLY`;
- `YEARLY`;
- `INTERVAL_DAYS`;
- `INTERVAL_MONTHS`.

Decisões arquiteturais:

- planejamento e execução permanecem separados;
- `MaintenancePlan` calcula agenda futura e guarda `firstExecution`, `nextExecution` e
  `lastExecution`;
- `MaintenanceExecution` representa a ocorrência planejada e pode ser vinculada a uma `Operation`;
- o `RecurringEngine` recebe apenas regras de recorrência e datas, sem conhecer PMOC, garantia, SLA
  ou qualquer domínio específico;
- não há cron nem geração automática de Operations nesta sprint;
- conclusão de execução publica evento `MAINTENANCE` via `LifecyclePublisher`;
- nenhum módulo cria evento histórico diretamente;
- vincular uma Operation concluída a uma execução atualiza `status`, `executedAt`, `lastExecution` e
  `nextExecution`;
- `OperationsService` sincroniza execuções vinculadas quando uma Operation é concluída.

Endpoints adicionados:

| Method | Path                                          | Access                           |
| ------ | --------------------------------------------- | -------------------------------- |
| GET    | `/api/v1/maintenance-plans/stats`             | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/maintenance-plans`                   | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/maintenance-plans/:id`               | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/maintenance-plans`                   | OWNER, MANAGER                   |
| PATCH  | `/api/v1/maintenance-plans/:id`               | OWNER, MANAGER                   |
| DELETE | `/api/v1/maintenance-plans/:id`               | OWNER, MANAGER                   |
| GET    | `/api/v1/maintenance-plans/:id/executions`    | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/maintenance-plans/:id/executions`    | OWNER, MANAGER, OPERATOR         |
| PATCH  | `/api/v1/maintenance-executions/:id`          | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/equipments/:id/maintenance`          | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/equipments/:id/maintenance/upcoming` | OWNER, MANAGER, OPERATOR, VIEWER |

Auditoria:

- `MAINTENANCE_PLAN_CREATED`;
- `MAINTENANCE_PLAN_UPDATED`;
- `MAINTENANCE_PLAN_DELETED`;
- `MAINTENANCE_EXECUTION_CREATED`;
- `MAINTENANCE_EXECUTION_UPDATED`;
- `MAINTENANCE_EXECUTION_COMPLETED`.

Integração com Asset Lifecycle:

- execuções concluídas geram evento `MAINTENANCE`;
- o evento referencia `maintenancePlanId`, `maintenanceExecutionId`, `operationId` quando houver,
  nome do plano e notas;
- publicação passa por `LifecyclePublisher.publishMaintenanceCompletedTx`.

Seed demo:

- `src/seeds/demo/demo.seed.ts` foi enriquecido com planos coerentes para equipamentos existentes;
- os planos são opcionais, idempotentes e marcados com `DEMO_MARKER`;
- nenhum novo Demo Dataset foi criado;
- o sistema continua funcionando sem `ENABLE_DEMO_DATA`.

Verificação executada até este registro:

- `npx prisma generate`;
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- todas as migrations aplicadas em PostgreSQL Docker limpo, incluindo
  `20260630150000_maintenance_planning_domain`;
- `npm run build`.
- `npm run lint`;
- `npm test` com 7 suítes e 21 testes aprovados.

## Sprint 12 — Inventory & Materials Domain

Domínio criado:

- `src/modules/inventory`;
- `InventoryModule` importado no `AppModule`;
- `InventoryService` como façade transacional para catálogo de produtos, estoque físico,
  movimentações, fornecedores e materiais consumidos em Operations;
- controllers separados para Product Catalog, Inventory, Suppliers e Operation Materials;
- constantes de auditoria em `src/shared/constants/inventory.constants.ts`.

Entidades:

- `Product`: catálogo do produto. Não armazena saldo nem movimentações;
- `Supplier`: cadastro de fornecedores para compras futuras;
- `InventoryItem`: estoque físico associado a um `Product`, preparado para múltiplos almoxarifados;
- `StockMovement`: evento imutável de estoque;
- `OperationPart`: material/produto consumido por uma `Operation`.

Enum:

- `StockMovementType`: `IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`, `CONSUMPTION`, `RETURN`.

Migration criada:

- `20260701120000_inventory_materials_domain`.

Decisões arquiteturais:

- Product Catalog e Inventory Item foram separados: produto descreve catálogo; item de inventário
  representa saldo físico;
- toda alteração de estoque cria `StockMovement`; não existe endpoint para editar movimentações;
- `currentQuantity` e `availableQuantity` são recalculados no backend a partir das movimentações;
- `availableQuantity = currentQuantity - reservedQuantity`;
- saldo negativo é rejeitado transacionalmente;
- consumo de materiais em Operation cria `OperationPart`, `StockMovement(CONSUMPTION)`, atualiza
  estoque e publica `PART_REPLACEMENT` via `LifecyclePublisher`;
- remoção de material de Operation é soft delete no `OperationPart` e gera `StockMovement(RETURN)`;
- histórico de estoque e histórico do ativo permanecem separados, ligados por referências.

Endpoints adicionados:

| Method | Path                                      | Access                           |
| ------ | ----------------------------------------- | -------------------------------- |
| GET    | `/api/v1/products`                        | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/products/:id`                    | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/products`                        | OWNER, MANAGER                   |
| PATCH  | `/api/v1/products/:id`                    | OWNER, MANAGER                   |
| DELETE | `/api/v1/products/:id`                    | OWNER, MANAGER                   |
| GET    | `/api/v1/inventory`                       | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/inventory/:id`                   | OWNER, MANAGER, OPERATOR, VIEWER |
| PATCH  | `/api/v1/inventory/:id`                   | OWNER, MANAGER                   |
| GET    | `/api/v1/inventory/stats`                 | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/inventory/movements`             | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/inventory/movements`             | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/suppliers`                       | OWNER, MANAGER                   |
| POST   | `/api/v1/suppliers`                       | OWNER, MANAGER                   |
| PATCH  | `/api/v1/suppliers/:id`                   | OWNER, MANAGER                   |
| DELETE | `/api/v1/suppliers/:id`                   | OWNER, MANAGER                   |
| GET    | `/api/v1/operations/:id/materials`         | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/operations/:id/materials`         | OWNER, MANAGER, OPERATOR         |
| DELETE | `/api/v1/operations/:id/materials/:id`     | OWNER, MANAGER                   |

Auditoria:

- `PRODUCT_CREATED`;
- `PRODUCT_UPDATED`;
- `PRODUCT_DELETED`;
- `SUPPLIER_CREATED`;
- `SUPPLIER_UPDATED`;
- `SUPPLIER_DELETED`;
- `INVENTORY_ITEM_CREATED`;
- `INVENTORY_ITEM_UPDATED`;
- `STOCK_MOVEMENT_CREATED`;
- `MATERIAL_CONSUMED`;
- `MATERIAL_RETURNED`.

Integração com Asset Lifecycle:

- `LifecyclePublisher.publishPartReplacementTx` publica `PART_REPLACEMENT`;
- o evento referencia `operationId`, `operationPartId`, `productId`, `inventoryItemId`, quantidade
  e nome do produto;
- nenhum serviço de inventário cria `AssetLifecycleEvent` diretamente fora do publisher.

Seed:

- seed idempotente adiciona fornecedor, produtos HVAC, itens de estoque, entrada inicial e consumo
  coerente quando existem Operations;
- não cria novo Demo Dataset;
- o sistema funciona sem dados de demonstração.

Verificação executada:

- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma generate`;
- `npm run build`;
- `npm run lint`.
- `npm test`.
- `npm test`.
- `npm test`.

## Sprint 13 — Pricing Domain

Domínio criado:

- `src/modules/pricing`;
- `PricingModule` importado no `AppModule`;
- `PricingService` como serviço central para resolver preço vigente, custo vigente, margem,
  vigência e histórico;
- `PricingController` expondo a API oficial;
- contratos internos em `pricing.types.ts` para futuros consumidores (`BUDGET`, `FINANCIAL`,
  `INVENTORY`, `OPERATION`);
- constantes de auditoria em `src/shared/constants/pricing.constants.ts`.

Entidade:

- `ProductPricing`.

Campos comerciais:

- `costPrice`;
- `replacementCost`;
- `averageCost`;
- `salePrice`;
- `minimumSalePrice`;
- `suggestedSalePrice`;
- `marginPercentage`;
- `validFrom`;
- `validUntil`;
- `active`.

Migration criada:

- `20260701150000_pricing_domain`.

Decisões arquiteturais:

- Product permanece catálogo técnico, sem preço;
- Inventory permanece estoque físico, sem custo;
- Pricing é a única fonte comercial;
- alterações de preço criam nova vigência em `ProductPricing`;
- `PATCH /pricing/:id` cria uma revisão com nova vigência e desativa o registro anterior;
- `PricingService.resolveForConsumer` prepara consumo interno futuro por Budget, Financial,
  Inventory e Operations;
- vigências ativas sobrepostas são rejeitadas.

Endpoints adicionados:

| Method | Path                                  | Access         |
| ------ | ------------------------------------- | -------------- |
| GET    | `/api/v1/pricing/stats`               | OWNER, MANAGER |
| GET    | `/api/v1/pricing`                     | OWNER, MANAGER |
| GET    | `/api/v1/pricing/:id`                 | OWNER, MANAGER |
| GET    | `/api/v1/products/:id/pricing`        | OWNER, MANAGER |
| POST   | `/api/v1/products/:id/pricing`        | OWNER          |
| PATCH  | `/api/v1/pricing/:id`                 | OWNER          |
| GET    | `/api/v1/pricing/history/:productId`  | OWNER, MANAGER |

Auditoria:

- `PRICING_CREATED`;
- `PRICING_UPDATED`;
- `PRICING_DEACTIVATED`;
- `PRICING_RESOLVED` reservado para uso futuro controlado.

Seed:

- seed idempotente cria preços coerentes para produtos existentes;
- não cria novo Demo Dataset;
- dados comerciais são inseridos apenas em `ProductPricing`.

Verificação executada:

- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma generate`;
- `npm run build`;
- `npm run lint`.

## Backlog — Delegação de Operações (OWNER / MANAGER)

Escopo concluído:

- `CreateOperationDto` passou a aceitar `operatorId?: uuid`;
- `OperationsService.create` agora resolve o operador responsável antes de criar a Operation;
- `OWNER` e `MANAGER` podem delegar a Operation para outro usuário operacional;
- se `operatorId` não for informado, o operador permanece sendo o usuário autenticado;
- `OPERATOR` continua criando apenas em nome próprio; se enviar `operatorId`, o backend ignora a
  delegação e mantém `actor.id`;
- `VIEWER` permanece sem permissão de criação pelo `RoleGuard`.

Validações aplicadas:

- `operatorId` validado como UUID pelo DTO;
- usuário delegado precisa existir;
- usuário delegado precisa estar ativo;
- usuário delegado não pode estar desativado (`disabledAt`);
- usuário delegado precisa possuir perfil operacional (`OWNER`, `MANAGER` ou `OPERATOR`);
- por arquitetura single-company, usuários pertencem ao banco isolado da instalação; não existe
  atribuição cross-tenant em banco compartilhado.

Auditoria:

- `OPERATION_CREATED` registra `createdBy`, `operatorId`, `delegated` e `ignoredOperatorId`;
- `OPERATION_DELEGATED` é registrado somente quando `actor.id !== operatorId`.

Migrations:

- nenhuma migration criada; alteração apenas contratual/serviço.

Documentação atualizada:

- `API_CONTRACTS.md`;
- `FRONTEND_INTEGRATION.md`;
- `OPUS_INTEGRATION.md`;
- `SECURITY.md`;
- `STATE.md`.

Verificação executada:

- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- `npm run build`;
- `npm run lint`;
- `npm test`;
- `git diff --check`.

## Sprint — Assignment Domain + Operator Workflow

Domínio criado:

- `src/modules/assignments`;
- `AssignmentsModule` importado no `AppModule`;
- `AssignmentsService` como único ponto de escrita de Assignment;
- `AssignmentsController` expondo a API oficial;
- constantes de auditoria em `src/shared/constants/assignments.constants.ts`.

Entidades:

- `Assignment`;
- `AssignmentHistory`.

Enums:

- `AssignmentStatus`: `ASSIGNED`, `ACCEPTED`, `STARTED`, `PAUSED`, `COMPLETED`, `CANCELED`,
  `REJECTED`;
- `AssignmentEventType`: `ASSIGNED`, `REASSIGNED`, `ACCEPTED`, `STARTED`, `PAUSED`, `RESUMED`,
  `REJECTED`, `COMPLETED`, `CANCELED`;
- `AssetLifecycleEventType` expandido com `ASSIGNMENT_CREATED`, `ASSIGNMENT_REASSIGNED`,
  `ASSIGNMENT_ACCEPTED`, `ASSIGNMENT_STARTED`, `ASSIGNMENT_COMPLETED`.

Migration criada:

- `20260701170000_assignment_domain`.

Integração com Operations:

- `OperationsService.create` cria Assignment automaticamente dentro da mesma transação;
- `operatorId` da Operation continua sendo a referência operacional principal;
- reatribuição atualiza `Operation.operatorId`;
- conclusão de Assignment atualiza a Operation para `COMPLETED` e sincroniza Asset Lifecycle e
  Maintenance Planning existentes.

Histórico:

- toda mudança cria `AssignmentHistory`;
- histórico nunca é sobrescrito;
- controller não altera Assignment diretamente.

Endpoints adicionados:

| Method | Path                                      | Access |
| ------ | ----------------------------------------- | ------ |
| GET    | `/api/v1/assignments`                     | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/assignments/my`                  | OWNER, MANAGER, OPERATOR |
| GET    | `/api/v1/assignments/:id`                 | OWNER, MANAGER, OPERATOR, VIEWER |
| GET    | `/api/v1/assignments/history/:operationId`| OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/assignments`                     | OWNER, MANAGER |
| PATCH  | `/api/v1/assignments/:id/reassign`        | OWNER, MANAGER |
| PATCH  | `/api/v1/assignments/:id/accept`          | OWNER, MANAGER, OPERATOR |
| PATCH  | `/api/v1/assignments/:id/reject`          | OWNER, MANAGER, OPERATOR |
| PATCH  | `/api/v1/assignments/:id/start`           | OWNER, MANAGER, OPERATOR |
| PATCH  | `/api/v1/assignments/:id/complete`        | OWNER, MANAGER, OPERATOR |

AppSec:

- UUID validation;
- RBAC;
- proteção contra aceitar/iniciar/concluir Assignment de outro operador;
- proteção contra iniciar sem aceitar;
- proteção contra concluir sem iniciar;
- transações para estado, histórico, auditoria e lifecycle;
- usuário delegado precisa estar ativo e possuir perfil operacional.

Verificação executada:

- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma validate`;
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma generate`;
- `npm run build`;
- `npm run lint`.
- `npm test`.
