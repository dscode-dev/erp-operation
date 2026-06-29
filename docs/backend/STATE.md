# Backend State

## Current milestone

**Sprint 7 — Document Configuration & Signature Domain (Produção)**
Status: concluída em 29 de junho de 2026.

As Sprints 0, 1, 2, 3, 3.5, 4, 5 e 6 foram preservadas. Nenhum módulo operacional novo foi
adicionado nesta sprint.

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
├── config/
├── customers/
├── document-engine/
├── database/
├── equipments/
├── health/
├── internal-demo/
├── organization/
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

- `builder/DocumentBuilderService`: recebe uma Operation e monta um `DocumentBlueprint`;
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
| POST   | `/api/v1/documents/operations/:operationId/:type/render`  | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/documents/:documentId/preview`                   | OWNER, MANAGER, OPERATOR, VIEWER |
| POST   | `/api/v1/documents/:documentId/render`                    | OWNER, MANAGER, OPERATOR         |
| GET    | `/api/v1/documents/:documentId/download`                  | OWNER, MANAGER, OPERATOR, VIEWER |

Documentos financeiros (`QUOTE`, `RECEIPT`) são bloqueados para não-OWNER por segurança.

Audit events:

- `DOCUMENT_PREVIEWED`;
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

| Method | Path                                               | Access                 |
| ------ | -------------------------------------------------- | ---------------------- |
| GET    | `/api/v1/documents/configuration`                  | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/documents/configuration/types/:type`      | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/documents/configuration/templates/:id`    | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/signatures`                               | OWNER, MANAGER, VIEWER |
| GET    | `/api/v1/signatures/:id`                           | OWNER, MANAGER, VIEWER |
| POST   | `/api/v1/signatures`                               | OWNER                  |
| PATCH  | `/api/v1/signatures/:id`                           | OWNER                  |
| DELETE | `/api/v1/signatures/:id`                           | OWNER                  |
| POST   | `/api/v1/signatures/:id/upload`                    | OWNER                  |
| GET    | `/api/v1/signatures/:id/download`                  | OWNER, MANAGER, VIEWER |

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
- Módulo `operations` (controller/service/dto): `GET /operations` (filtros), `/stats`, `/:id`, `/photos/:id` (base64), `POST /operations` (cria + **OS rascunho** automática `WORK_ORDER/DRAFT`, número `OS-000001` derivado do sequencial), `PATCH /:id`. Operador = usuário autenticado; fotos via storage provider (data URL, PNG/JPEG, 16 × 5 MiB); assinatura como texto.
- Toda OS nasce de uma Operation; `OperationDocument` reusa `DocumentTemplateType` (fundação única para OS/PMOC/Laudo/Relatório/Visita/Orçamento/Recibo). Histórico de equipamento/cliente derivado de `/operations` (sem duplicação). PDF oficial é gerado pelo Document Engine da Sprint 6.
- Validado com `prisma generate` + `tsc --noEmit` (sem banco neste ambiente; migration roda no deploy).
