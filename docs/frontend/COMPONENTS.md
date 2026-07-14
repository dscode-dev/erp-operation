# COMPONENTS — Frontend

## DC-03

- `ReportWorkflowDrawer`: orquestra os campos dedicados do Laudo e usa o primeiro equipamento
  selecionado somente como relação principal da Operation.
- `InspectedEquipmentSelector`: reutilizado no Laudo para seleção múltipla pesquisável e edição do
  setor/local de cada ativo.
- `DocumentViewer`: permanece genérico; tabelas usam `table-layout: fixed` e `break-words` para
  refletir com segurança o mesmo Blueprint renderizado no PDF.

## Work Order — QR textual

`DocumentViewer` não exige alteração especializada: a OS apresenta o identificador por
`MetadataComponent`. `QrCodeComponent` permanece disponível somente para Blueprints históricos ou
outros tipos documentais.

## Refinamento TECHNICAL_REPORT

| Componente       | Alteração                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| `DocumentViewer` | cabeçalho em duas linhas, com colunas independentes e dados sem colisão   |
| `ContentStep`    | seleção múltipla apresentada como `Equipamentos`, sem alterar o contrato  |

## Refinamento documental

| Componente       | Alteração                                                                |
| ---------------- | ------------------------------------------------------------------------ |
| `DocumentViewer` | logo alinhada verticalmente ao texto; rodapé limitado a `footer.content` |

## DC-02

| Componente                             | Alteração                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ReportWorkflowDrawer` / `ContentStep` | captura objetivo, diagnóstico, atividades, recomendações e observações do relatório técnico      |
| `DocumentViewer`                       | pagina o Blueprint por capacidade, peso de componente e `pageBreakAfter`; permanece viewer único |

O frontend apenas persiste dados da Operation e representa componentes recebidos. Checklist,
foto, QR e assinatura nunca são montados fora do Blueprint.

## Product Backlog Closure 07

| Componente             | Responsabilidade                                         |
| ---------------------- | -------------------------------------------------------- |
| `ReportCenterPage`     | dashboard, filtros, histórico e workflows                |
| `ReportWorkflowDrawer` | criação/edição: Origem → Conteúdo → Evidências → Preview |
| `OriginStep`           | Operation, cliente, equipamento, responsável e PMOC      |
| `ContentStep`          | campos semânticos por tipo                               |
| `EvidenceStep`         | checklist, fotos e `SignaturePad`                        |
| `DocumentViewer`       | único preview/render/download                            |

## DC-01.2

- `DocumentViewer` continua sendo o único consumidor frontend; a quebra preferencial é entregue pelo
  Blueprint e aplicada pelo Renderer PDF oficial.
- `DocumentViewer`: passou a consumir `blueprint.visualStyle`, renderizar `QrCodeComponent.image`,
  respeitar larguras de tabela e representar checklist/assinaturas com semântica equivalente ao PDF.
- Nenhum componente específico de Work Order ou renderer alternativo foi adicionado.

## DC-01

- `OperationCreationDrawer`: campos semânticos de defeito, serviços e observações.
- `DocumentViewer`: header com logo e contato institucional, sem composição específica de OS.
- `AtendimentoWizard`: notas da execução alimentam `serviceDescription`.

## Document Engine D1

- `DocumentViewer`: visualizador único preservado para preview, render e download.
- `TemplateFormDrawer`: edita coleção de assinaturas institucionais e políticas de execução.
- `DocumentosPage`: catálogo paginado e drawer documental oficial.
- `BudgetDetailDrawer`: reutilizado sem fluxo documental paralelo.

## Product Backlog Closure 05 — Reports and DocumentViewer

| Item                         | Local                                       | Uso                                                                           |
| ---------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `TemplateModelCard` refinado | `app/(platform)/reports/page.tsx`           | Card compacto para biblioteca de modelos, com badges suaves e ações discretas |
| `TemplatePreviewDrawer`      | `app/(platform)/reports/page.tsx`           | Explica preview estrutural vs preview com Operation real                      |
| `DocumentViewer`             | `packages/ui/documents/document-viewer.tsx` | Continua sendo o único viewer para modelo, dados reais, render e download     |

Regra: assinatura coletada deve ser renderizada apenas quando vier no `SignatureComponent` do
blueprint oficial. Não interpretar `Operation.signatureData` diretamente no frontend.

## Product Backlog Closure 05.1 — Visit Report workflow

| Item                             | Local                                       | Uso                                                                                            |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Visit evidence workflow          | `app/(platform)/reports/visita/page.tsx`    | Seleciona Operation real, salva checklist/observações/fotos/assinatura e abre DocumentViewer   |
| `DocumentViewer` image component | `packages/ui/documents/document-viewer.tsx` | Renderiza evidência fotográfica quando `component.kind === "image"` e `component.image` existe |

Regra: fotos selecionadas viram data URL apenas para envio imediato ao backend. O documento nunca
usa object URL ou blob local como fonte persistente.

## Sprint 23 — Product workflow closure

| Item                                    | Local                                         | Uso                                                                                                        |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Operator Assignment Detail enriquecido  | `app/operator/(shell)/services/[id]/page.tsx` | Detalhe de campo com contexto, checklist, materiais oficiais, documentos oficiais e timeline da Assignment |
| `OperatorMaterialPanel`                 | `app/operator/(shell)/services/[id]/page.tsx` | Registro de material no Operator usando `POST /operations/:id/materials`                                   |
| `DocumentViewer` no Operator detail     | `app/operator/(shell)/services/[id]/page.tsx` | Visualização/render/download por Document Engine oficial                                                   |
| Versão do Blueprint no `DocumentViewer` | `packages/ui/documents/document-viewer.tsx`   | Remove label placeholder e exibe a versão real do Blueprint                                                |

Regra Sprint 23: nenhum card de workflow do Operator deve prometer uma ação crítica sem levar a uma
ação real ou a um estado claramente documentado. Materiais e documentos já usam backend oficial;
fotos/assinatura avançada ficam para Sprint 24/V1.1 conforme escopo.

## Sprint 21 — Performance and observability

Nenhum componente novo foi criado.

Componentes cujo uso continua obrigatório para manter a performance V1:

| Item               | Local                                       | Regra                                                                   |
| ------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
| `Pagination`       | `apps/platform/components/pagination.tsx`   | Todas as listagens devem preservar `page`, `limit`, filtros e ordenação |
| `DocumentViewer`   | `packages/ui/documents/document-viewer.tsx` | Preview/render/download sempre via backend; sem preview local           |
| `AssetTimeline`    | `packages/ui/assets/asset-timeline.tsx`     | Timeline sempre via Asset Lifecycle; sem montagem local                 |
| Drawers de detalhe | `apps/platform/components/*drawer*.tsx`     | Devem cancelar/refazer requests obsoletas ao trocar entidade/filtro     |

Build Sprint 21 identificou `/equipamentos`, `/budgets` e `/produtos` como rotas candidatas a
lazy-load interno de drawers/grids pesados em Sprint 22/Post-V1 Optimization.

## Frontend Sprint 9 — Navigation UX & Creation Flows

| Item                      | Local                                                    | Uso                                                            |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `CustomerSelect`          | `apps/platform/components/entity-select.tsx`             | Seleção reutilizável de cliente                                |
| `CustomerAddressSelect`   | `apps/platform/components/entity-select.tsx`             | Endereço do cliente selecionado                                |
| `EquipmentSelect`         | `apps/platform/components/entity-select.tsx`             | Equipamentos filtrados por cliente                             |
| `UserSelect`              | `apps/platform/components/entity-select.tsx`             | Seleção visual de responsável                                  |
| `DateTimePicker`          | `apps/platform/components/entity-select.tsx`             | Data/hora para agendamento                                     |
| `ServiceTypeSelect`       | `apps/platform/components/entity-select.tsx`             | Tipo oficial da Operation                                      |
| `OperationCreationDrawer` | `apps/platform/components/operation-creation-drawer.tsx` | Drawer/wizard reutilizado por Agenda, Operações, Serviços e OS |

Decisão: esses componentes ficam em `apps/platform/components` porque são fluxos específicos da
Platform. Se o Operator ou outro app precisar deles no futuro, podem ser promovidos para
`packages/ui`.

## Frontend Sprint 8 — Inventory, Materials & Pricing

| Item                        | Local                                                  | Uso                                                                         |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `inventoryApi`              | `packages/api/inventory.ts`                            | Products, Inventory Items, Stock Movements, Suppliers e Operation Materials |
| `pricingApi`                | `packages/api/pricing.ts`                              | Pricing, preço vigente, stats e histórico                                   |
| Tipos Inventory/Pricing     | `packages/types/index.ts`                              | Contratos reais das Sprints 12/13 do backend                                |
| Central real de produtos    | `app/(platform)/produtos/page.tsx`                     | Abas Catálogo, Estoque, Fornecedores, Preços e Movimentos                   |
| `ProductFormDrawer` real    | `apps/platform/components/product-form-drawer.tsx`     | Criação/edição de produto via `/products`                                   |
| Materiais na Operation      | `apps/platform/components/operation-detail-drawer.tsx` | Seção **Materiais utilizados** via `/operations/:id/materials`              |
| Dashboard Inventory/Pricing | `app/(platform)/page.tsx`                              | Widgets reais de estoque, pricing e movimentações                           |

Regras:

- saldo não é editado diretamente no frontend; movimentações usam `POST /inventory/movements`;
- consumo de material em Operation usa `POST /operations/:id/materials`;
- Pricing não é exibido para OPERATOR/VIEWER;
- criação/revisão de Pricing fica restrita a OWNER;
- nenhum mock ou novo Demo Dataset foi adicionado.

## Backlog — Document Template Preview

| Item                                   | Local                                       | Uso                                                           |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `documentsApi.previewTemplateDocument` | `packages/api/documents.ts`                 | Consome `GET /documents/templates/:templateId/preview`        |
| `DocumentViewer` com `templateId`      | `packages/ui/documents/document-viewer.tsx` | Preview oficial de modelo sem Operation                       |
| `/reports` integrado                   | `app/(platform)/reports/page.tsx`           | Drawer de modelo usa `DocumentViewer source={{ templateId }}` |

Regra: previews de modelos não usam `DocumentPaper`, não criam Operation, não consultam Demo Dataset e não possuem fallback local.

## Backlog — Paginação Global + Modelos de Relatórios

| Item                             | Local                                               | Uso                                                                                             |
| -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Pagination` atualizado          | `apps/platform/components/pagination.tsx`           | Paginação padrão da Platform com page size, primeira/anterior/próxima/última e totais           |
| `TemplateFormDrawer` reutilizado | `apps/platform/components/template-form-drawer.tsx` | Criar/configurar modelos, incluindo assinatura obrigatória, modo e assinatura fixa              |
| `DocumentViewer` reutilizado     | `packages/ui/documents/document-viewer.tsx`         | Preview oficial dos modelos por `templateId`; sem `DocumentPaper` local na página de Relatórios |
| `ConfirmDialog` reutilizado      | `packages/ui/confirm-dialog.tsx`                    | Confirmação de exclusão de modelo                                                               |
| Cards de modelo                  | `app/(platform)/reports/page.tsx`                   | Biblioteca de Modelos de Documentos com badges, hover e ações discretas                         |

Listagens padronizadas com `Pagination`:

- Clientes;
- Equipamentos;
- Operações;
- Usuários;
- Documentos;
- Serviços;
- Ordens;
- Produtos;
- Financeiro.

Regra: filtros e ordenação não são perdidos ao mudar página ou tamanho da página. Quando o endpoint já possui paginação, a tela envia `page`/`limit`; quando o domínio ainda é demo/local, a paginação é aplicada no array já filtrado, usando o mesmo componente visual.

## Sprint 7 — Asset Lifecycle Integration

| Item                              | Local                                                  | Uso                                                                               |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `AssetTimeline`                   | `packages/ui/assets/asset-timeline.tsx`                | Timeline oficial do ativo, renderizada a partir do `TimelineAssembler` do backend |
| `assetLifecycleApi`               | `packages/api/asset-lifecycle.ts`                      | Listagem, detalhe e estatísticas de Asset Lifecycle                               |
| `AssetLifecycle*` types           | `packages/types/index.ts`                              | Contratos de evento, timeline, stats e filtros                                    |
| `OperationDetailDrawer` integrado | `apps/platform/components/operation-detail-drawer.tsx` | Timeline da operação via Asset Lifecycle                                          |
| `DocumentViewer` integrado        | `packages/ui/documents/document-viewer.tsx`            | Aberto diretamente por eventos `DOCUMENT`                                         |

Removidos na Sprint 7:

- `packages/ui/timeline.tsx`;
- helper `operationsToTimeline`;
- timeline local derivada de `/operations`;
- timeline demo em detalhes de cliente/equipamento.

Regra visual: o frontend usa `event.timeline.icon`, `color`, `title`, `subtitle`, `category`,
`badges` e `references` enviados pelo backend. Não há mapeamento local de enum para montar timeline.

## Sprint 6 — Document Center & Configuration

| Item                                   | Local                                               | Uso                                                                                            |
| -------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DocumentViewer`                       | `packages/ui/documents/document-viewer.tsx`         | Viewer único do Document Engine: preview oficial, páginas, miniaturas, zoom, render e download |
| `documentsApi`                         | `packages/api/documents.ts`                         | Preview/render/download/configuração de documentos                                             |
| `signaturesApi`                        | `packages/api/signatures.ts`                        | CRUD/upload/download de assinaturas                                                            |
| `TemplateFormDrawer` atualizado        | `apps/platform/components/template-form-drawer.tsx` | Configura assinatura obrigatória, modo e assinatura fixa                                       |
| Central Documental real                | `app/(platform)/documentos/page.tsx`                | Lista `OperationDocument` via `/operations`; abre `DocumentViewer`                             |
| Operator Documentos real               | `app/operator/(shell)/documents/page.tsx`           | Lista documentos por cliente selecionado via `/operations`                                     |
| Configurações → Documentos/Assinaturas | `app/(platform)/settings/page.tsx`                  | Consome `/documents/configuration` e `/signatures`                                             |

Removidos na Sprint 6:

- `packages/ui/documents/document-preview.tsx`;
- `packages/ui/documents/document-download.tsx`;
- fluxo `GeneratedDocument`;
- preview local com `DocumentPaper` para documento emitido;
- `operationsApi.getDocuments` e consumo de `demo.documents.v1` nas telas de documentos.

O frontend não monta PDF, não gera documento e não baixa JSON estrutural. O fluxo oficial é:

```text
Preview backend → Render backend → Download backend
```

Pacotes compartilhados (`@erp/*`) + apps (`@platform/*`, `@operator/*`). Ver `ARCHITECTURE.md`.

## Compartilhado — `@erp/ui` (Design System)

Primitivos (Sprint 2): `status-pill`, `status-chip`, `skeletons`, `empty-state`, `empty-illustration`, `states`, `drawer`, `drawer-tabs`, `confirm-dialog`, `search-input`, `filter-bar`, `section-card`, `metric-card`. `auth/*` (provider scope-aware, gate, require-auth, login/change-password screens). `theme/*`, `base/*`.

### Novos na Sprint 3

| Componente             | Arquivo                       | Uso                                               |
| ---------------------- | ----------------------------- | ------------------------------------------------- |
| `Stepper`              | `wizard/stepper.tsx`          | progresso segmentado                              |
| `WizardProgressHeader` | `wizard/progress-header.tsx`  | header sticky (etapa X/N)                         |
| `WizardFooter`         | `wizard/step-footer.tsx`      | controles voltar/continuar/enviar                 |
| `PhotoInput`           | `photo-input.tsx`             | captura multi-foto (preview/remover/reordenar)    |
| `SignaturePad`         | `documents/signature-pad.tsx` | **refinado**: desfazer/limpar/confirmar/indicador |
| `applyBranding`        | `auth/auth-provider.tsx`      | aplica cores da empresa ao tema (export)          |

## Operator — `@operator/*` (`apps/operator`)

| Item                | Arquivo                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `OperatorShell`     | `shell/operator-shell.tsx` (brand bar + bottom nav)                     |
| `OperatorBottomNav` | `components/bottom-nav.tsx` (Início/Agenda/Atend./Clientes/Perfil)      |
| `OperatorHome`      | `features/home/operator-home.tsx`                                       |
| `AtendimentoWizard` | `features/atendimento/atendimento-wizard.tsx` (10 etapas + pickers)     |
| Config/serviços     | `lib/service-types.ts` (tipos + checklists HVAC)                        |
| Outbox offline      | `lib/offline-queue.ts` (fila local + status + flush placeholder)        |
| Submissão           | `lib/atendimento.ts` (`AtendimentoDraft`, `submitAtendimento` → outbox) |

Componentes herdados: `service-card`, `schedule-card`, `quick-action`, `operator-header`.

## Platform — `@platform/*`

Inalterado em estrutura; ajustes: Financeiro (métricas + grid de alturas iguais) e Settings (cores dinâmicas via `applyBranding` + `refresh`). `equipment-display`/`user-display` continuam em `apps/platform` (reutilizados também pelo Operator via `@platform/equipment-display`).

## Sprint 4 — novos

| Item                                                 | Local                                | Uso                                         |
| ---------------------------------------------------- | ------------------------------------ | ------------------------------------------- |
| `useInstallPrompt` / `InstallButton`                 | `@erp/ui/pwa`                        | instalação do PWA (Chromium + fallback iOS) |
| `QrFoundation` (atualizado)                          | `@platform/components/qr-foundation` | QR + copiar código + baixar PNG             |
| `operationsApi` (`getOrders`/`getProducts`)          | `@erp/api/operations`                | snapshots demo de OS e Produtos             |
| `app/manifest.ts` + `public/icons/operator-icon.svg` | `app/`                               | manifest PWA + ícone                        |

Telas demo: `/documentos` (DocumentViewer + RBAC), `/demo-ready` (apresentação), Ordens/Produtos (Demo Dataset), QR do operador (`/operator/qr`).

## Sprint 5 — novos

| Item                         | Local                 | Uso                                      |
| ---------------------------- | --------------------- | ---------------------------------------- |
| `BrandLogo`                  | `@erp/ui/brand`       | logo do cliente (login/sidebar/operator) |
| `Timeline` / `TimelineEvent` | `@erp/ui/timeline`    | histórico (Serviço/Cliente/Equipamento)  |
| `operationsApi.getServices`  | `@erp/api/operations` | snapshot `demo.services.v1`              |

Telas: `/reports` (central documental), `/servicos` (histórico timeline), `/operator/{equipamentos,documents,sync}`, `/demo-ready` (roteiro guiado). Docker: `frontend/Dockerfile` + serviço `frontend` no compose.

## Regras

- Dados via `@erp/api`; nunca `fetch` direto, nunca mocks. Operator escreve no outbox local até o backend de Serviços existir.
- Reutilizáveis ficam em `packages/ui`; layouts completos não são compartilhados.
- RBAC sempre do backend; sessões Platform/Operator isoladas por escopo.

## Backlog #001 — Agenda

| Item                                     | Local                                      | Uso                                                             |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `AgendaEventDrawer`                      | `@platform/components/agenda-event-drawer` | detalhe lateral do evento + ações RBAC                          |
| `financialApi.getScheduleRange(from,to)` | `@erp/api`                                 | schedule por intervalo (navegação do calendário)                |
| `DemoScheduleItem`                       | `@erp/types`                               | item de agenda enriquecido (equipment/serviceType/endsAt/notes) |

## Backlog #002 — QR Code

| Item                       | Local                | Uso                                                      |
| -------------------------- | -------------------- | -------------------------------------------------------- |
| `QrScanner`                | `@erp/ui/qr-scanner` | leitura real de QR pela câmera (PWA, `@zxing/browser`)   |
| `equipmentsApi.lookupByQr` | `@erp/api`           | resolve equipamento por `GET /equipments/lookup/:qrCode` |

Biblioteca de QR: `@zxing/browser` + `@zxing/library` (`BrowserQRCodeReader`, somente QR).

## Backlog #003 — Modelos & Documentos

| Item                                 | Local                                       | Uso                                                                   |
| ------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------- |
| `DocumentPaper`                      | `@erp/ui/documents/document-paper`          | base visual legada/modelos; documentos emitidos usam `DocumentViewer` |
| `MODEL_BLUEPRINTS` / `buildDocument` | `@erp/ui/documents/model-blueprints`        | 7 modelos + montagem do documento                                     |
| `TemplateFormDrawer`                 | `@platform/components/template-form-drawer` | criar/editar modelo                                                   |

Páginas: `/reports` = Gestão de Modelos; `/documentos` = Central Documental (filtros cumulativos + preview + download).

## Backlog #004 — Operações

| Item                     | Local                                          | Uso                                                                               |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `OperationView`          | `@erp/ui/operations/operation-view`            | renderiza uma Operation pelas seções (Renderers)                                  |
| `buildOperationSections` | `@erp/ui/operations/operation-sections`        | modelo de seções (fundação reutilizável dos documentos)                           |
| `OPERATION_*`            | `@erp/ui/operations/operation-shared`          | labels/tones de operações                                                         |
| `OperationDetailDrawer`  | `@platform/components/operation-detail-drawer` | drawer: AssetTimeline + Checklist + Fotos + Observações + Assinatura + Documentos |
| `operationApi`           | `@erp/api/operation`                           | domínio real `/operations` (≠ `operationsApi` demo)                               |

Arquitetura: **OperationForm → Sections → Renderers** — um único modelo de seções
reutilizado por OS/PMOC/Laudo/Relatório/Visita/Orçamento/Recibo (sem forms
duplicados). Páginas: `/operacoes` (Platform). Operator: o Wizard cria uma
Operation real e a OS rascunho. Histórico oficial em Equipamento/Cliente vem de
`/asset-lifecycle`.

## Sprint — Assignment Domain + Operator Workflow

| Item                  | Local                                                  | Uso                                                                  |
| --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `AssignmentCard`      | `apps/operator/components/assignment-card.tsx`         | card mobile-first para fila de campo do Operator                     |
| `ASSIGNMENT_STATUS_*` | `packages/ui/assignments/assignment-shared.ts`         | labels, status pills e CTA principal por estado                      |
| `assignmentsApi`      | `packages/api/assignments.ts`                          | client real do domínio `/assignments`                                |
| `AssignmentSection`   | `apps/platform/components/operation-detail-drawer.tsx` | seção da Operation com responsável, status, histórico e reatribuição |

Regras:

- cards do Operator consomem `Assignment`, não snapshots;
- timeline da execução vem de `/assignments/history/:operationId`;
- reatribuição usa `UserSelect` existente e `PATCH /assignments/:id/reassign`;
- não há componente local de agenda/OS paralelo.

## Frontend Sprint 10 — Budget Integration

| Item                      | Local                                                  | Uso                                                                       |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `budgetsApi`              | `packages/api/budgets.ts`                              | client tipado para `/budgets`, stats, history e `/operations/:id/budgets` |
| Central Comercial         | `app/(platform)/budgets/page.tsx`                      | listagem, filtros, paginação, métricas e drawers do domínio Budget        |
| `BudgetDetailDrawer`      | `app/(platform)/budgets/page.tsx`                      | resumo, itens, histórico, aprovação, documento e timeline                 |
| `BudgetCreationDrawer`    | `app/(platform)/budgets/page.tsx`                      | criação via backend; usa Product/Pricing e não calcula totais localmente  |
| `OperationBudgetsSection` | `apps/platform/components/operation-detail-drawer.tsx` | orçamentos vinculados à Operation + criação rápida                        |
| `DocumentViewer`          | `packages/ui/documents/document-viewer.tsx`            | visualização/download do documento oficial emitido pelo Budget            |
| `BudgetDocumentPanel`     | `app/(platform)/budgets/page.tsx`                      | emissão, visualização e download oficial do PDF de Budget                 |

Componentes reutilizados:

- `DataTable`;
- `Pagination`;
- `MetricCard`;
- `FilterBar`/`FilterChip`;
- `Drawer`;
- `StatusChip`;
- `SkeletonList`/`SkeletonCard`;
- `ErrorState`;
- `EmptyState`;
- `Gate`;
- `AssetTimeline`;
- `DocumentViewer`.

Notas:

- O frontend não calcula subtotal, total, custo ou margem de orçamento.
- O resumo pré-salvamento mostra apenas os itens selecionados; snapshots aparecem após retorno do backend.
- Render/download de PDF específico de Budget usam `POST /budgets/:id/render` e
  `GET /budgets/:id/download`.

## Frontend Sprint 11 — Financial & Procurement

| Item                                          | Local                                                       | Uso                                                                             |
| --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `financialApi`                                | `packages/api/financial.ts`                                 | client real para contas, categorias, lançamentos, stats e histórico             |
| `procurementApi`                              | `packages/api/procurement.ts`                               | client real para pedidos de compra, itens, recebimentos, stats e histórico      |
| `FinancialEntryDrawer`                        | `apps/platform/components/financial-drawers.tsx`            | criar/editar lançamento, pagar, cancelar e consultar histórico                  |
| `FinancialAccountDrawer`                      | `apps/platform/components/financial-drawers.tsx`            | criar/editar/desativar conta financeira                                         |
| `FinancialCategoryDrawer`                     | `apps/platform/components/financial-drawers.tsx`            | criar/editar/desativar categoria financeira                                     |
| `PurchaseOrderDrawer`                         | `apps/platform/components/purchase-order-drawer.tsx`        | criar/editar pedido, adicionar itens, enviar, cancelar e registrar recebimentos |
| `FinancialStatusBadge` / `FinancialTypeBadge` | `apps/platform/components/financial-procurement-badges.tsx` | badges reutilizáveis de lançamentos financeiros                                 |
| `PurchaseStatusBadge`                         | `apps/platform/components/financial-procurement-badges.tsx` | badge reutilizável de status de compra                                          |
| `Pagination`                                  | `apps/platform/components/pagination.tsx`                   | paginação oficial reutilizada em Financeiro e Compras                           |

Notas:

- os drawers chamam exclusivamente endpoints reais;
- recebimento de compra não calcula estoque localmente, apenas envia quantidades para o backend;
- lançamentos financeiros não manipulam saldo no frontend;
- botões são escondidos via `<Gate>`/RBAC visual, mantendo o backend como autoridade final;
- utilitários `.input`, `.btn-primary` e `.btn-secondary` foram adicionados ao Design System global para formulários administrativos.

## Sprint 17 — Executive Dashboard

| Item                                         | Local                                                       | Uso                                               |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Executive Dashboard                          | `app/(platform)/page.tsx`                                   | centro executivo/operacional da Platform          |
| `maintenanceApi`                             | `packages/api/maintenance.ts`                               | stats e planos ativos de Maintenance Planning     |
| `pmocApi`                                    | `packages/api/pmoc.ts`                                      | stats e PMOCs ativos/compliance                   |
| `MetricCard`                                 | `packages/ui/metric-card.tsx`                               | cards acionáveis do resumo executivo e snapshots  |
| `DashboardSection`                           | `apps/platform/components/dashboard-section.tsx`            | blocos de hierarquia do dashboard                 |
| `ErrorState` / `EmptyState` / `SkeletonCard` | `packages/ui/*`                                             | loading, falha parcial e estados vazios por seção |
| `PurchaseStatusBadge`                        | `apps/platform/components/financial-procurement-badges.tsx` | status de pedidos no bloco Estoque e Compras      |

Componentes internos da home:

- `AttentionCenter`: prioriza situações críticas e de warning com navegação direta;
- `OperationsToday`: visão operacional diária e carga por operador;
- `FinancialSnapshot`: visão financeira restrita por RBAC;
- `MaintenanceCompliance`: visão de Maintenance + PMOC;
- `InventoryProcurement`: riscos de estoque e compras;
- `RecentActivity`: feed bounded e seguro via Asset Lifecycle.

Regras:

- a home não usa `dashboardApi` nem Demo Dataset;
- cada seção tem sua própria consulta e falha isolada;
- cards importantes são links para workflows reais;
- não há renderização de metadata bruta nem HTML inseguro.

## Sprint 18 — Product UX Polish

Padrões consolidados:

- `next/image` usado em previews compatíveis:
  - Profile avatar;
  - UserDetail avatar;
  - Settings asset preview;
  - Visita Técnica photo preview;
  - `PhotoInput`.
- `unoptimized` é obrigatório nesses casos porque as fontes são `blob:`/`data:`/conteúdo autenticado, não assets públicos otimizáveis.
- `BrandLogo` mantém `<img>` porque usa asset local pequeno e evita configuração remota desnecessária.
- Renderizadores documentais/assinaturas mantêm `<img>` por lidarem com conteúdo base64/blob controlado pelo Document Engine.
- `ErrorState`, `EmptyState`, `Skeleton*`, `Pagination`, `Drawer`, `Gate`, `MetricCard` e badges existentes continuam como padrões; nenhum novo sistema de toast/notification foi introduzido.

Rotas stale:

- páginas legadas que não representam mais fonte oficial usam `redirect()` em vez de `ComingSoonState`.

## Sprint 20.5 — Component Security Notes

- Componentes de timeline não devem exibir `metadata`, `storageKey`, `eventId`, `deletedAt` ou e-mail do performer.
- Componentes de upload/preview local devem revogar object URLs no cleanup.
- `AssetTimeline` e consumidores derivados devem preferir `timeline.title`, `timeline.subtitle`, `timeline.description`, `timeline.icon`, `timeline.color`, `timeline.badges` e `timeline.references`.

## Sprint 22 — production readiness component impact

No UI component was added in this sprint.

Runtime integration impact:

- shared API client now supports relative `/api/v1` base URLs for same-origin proxy deployments;
- demo bridge is disabled by default;
- existing Platform and Operator route shells were validated through the release smoke runner.

Components continue to consume domain clients instead of calling `fetch` directly.

## Sprint 22.5 — component impact

No component was added or changed.

Dependency impact:

- `postcss@8.5.16` override closes the frontend audit finding without changing component APIs.
- Existing Design System/component contracts remain unchanged.

## Product Backlog Closure 01 — component impact

Componentes evoluídos:

- `ProductFormDrawer`: seções de identificação, classificação, fornecedor contextual e descrição; sugestões via `datalist` para categoria, SKU, código interno e unidade.
- `CustomerFormDrawer`: seção opcional de endereço inicial, retry seguro quando apenas o endereço falhar, e lookup CEP com campos sempre editáveis.
- `EquipmentFormDrawer`: helper explícito quando o cliente selecionado não possui endereço cadastrado.
- `ReportsPage` / `TemplatePreviewDrawer`: preview vertical, header compacto, badges e metadados consolidados antes do `DocumentViewer`.
- `PricingDrawer`: abertura controlada pela aba Preços, mantendo criação/revisão de preço dentro do domínio Pricing.

Novo adapter:

- `cepApi.lookupCep`: cliente isolado para ViaCEP, usado apenas para preenchimento assistido; não é fonte de verdade e não remove edição manual.

Decisão de domínio:

- decisão superada pelo Product Backlog Closure 01.1: Produto↔Fornecedor agora é persistido via
  junction backend `ProductSupplier`.

## Product Backlog Closure 01.1 — component impact

Componentes evoluídos:

- `ProductFormDrawer`: categoria agora usa select oficial com opções fixas e `Outros` com campo
  customizado; SKU/código interno usam entrada assistida com prefixos; fornecedor principal usa
  selector real de `Supplier`.
- `SupplierDrawer`: continua sendo o fluxo oficial de criação/edição de fornecedor e agora retorna o
  fornecedor salvo para auto-seleção no formulário de produto quando aplicável.
- `PricingDrawer`: abre a partir da aba Preços sem depender da lista paginada de Produtos; trata
  loading, erro, estado vazio, saving e validação básica antes de chamar a API oficial.

Decisão de domínio atualizada:

- o frontend não simula fornecedor em estado local permanente; envia `primarySupplierId` para o
  backend e lê `Product.suppliers[]` nas respostas.

## Product Backlog Closure 03 — component impact

- `ExportButton`: CSV continua client-side para linhas visíveis; PDF chama backend, mostra estado
  “Gerando PDF…”, trata erro e baixa Blob com filename seguro.
- Settings/Assinaturas: `SignatureEditor` agora é Drawer lateral, com seções de identificação,
  método de assinatura, upload/desenho e preview.
- `SignatureCanvas`: canvas responsivo com pointer/touch/mouse, limpar desenho e conversão para PNG
  `File`.
- `SignaturePreview`: baixa imagem apenas via endpoint autorizado de assinatura e não consome
  storage key.

## Product Backlog Closure 02 — document component impact

Componentes evoluídos:

- `TemplatePreviewDrawer` em `/reports`:
  - usa selector de Operation real;
  - chama `DocumentViewer` com `source={{ operationId, type }}`;
  - permite render/download quando há template/tipo suportado.
- `DocumentViewer`:
  - continua sendo a única superfície oficial de preview/render/download;
  - renderiza assinaturas vindas do blueprint oficial;
  - mantém download por `contentBase64` autorizado e object URL temporário.

Responsabilidade:

- Reports descobre/aciona emissão por tipo documental;
- Documents lista/historiza documentos emitidos.

## Document Semantics Closure — component semantics

`TemplateModelCard` agora expõe ações semanticamente separadas:

- `Visualizar modelo`: template preview estrutural, sem emissão.
- `Pré-visualizar com dados reais`: Operation preview, com render/download oficiais.

`DocumentViewer` continua sendo a superfície única de documento, mas recebe fontes distintas:

- `{ templateId }` para Model Preview;
- `{ operationId, type }` para Real Data Preview.

Tipos:

- `TECHNICAL_OPINION` foi adicionado aos tipos frontend e aparece como “Laudo Técnico”.
- `REPORT` permanece rotulado como legado.

## Product Backlog Closure 04 — Components

- `UserAvatar`: componente compartilhado para renderizar avatar autenticado por `avatarAssetId`;
- `AvatarCropDrawer`: drawer local do perfil para recortar/reposicionar avatar antes de persistir;
- `PlatformTopbar`: Notification Center real com badge, painel, retry, empty/loading e mark read/all;
- `OperatorHeader`: sino conectado ao backend com contador e painel compacto.

# Closure 06

- `OperationDetailDrawer`: seção Datas e coleta de assinatura da OS com persistência autoritativa.
- `DocumentViewer`: identificação de preview de modelo versus dados reais; render explícito atual.
- `AssignmentCard`: data operacional vem somente de `operation.scheduledFor`.

# Closure 06.1

- `Drawer`: agora usa React portal, permitindo drawers documentais aninhados em largura integral.
- `DocumentViewer`: verificado com fonte real `operationId + WORK_ORDER`, 3 páginas e assinatura
  visível.
- `DataTable` ativo em `/operacoes`: confirmou as colunas Criado e Data do agendamento.

## DC02B

- `DocumentViewer`: consome `blueprint.header.corporate` para identificação completa da empresa e
  mantém fallback para o header legado.
- `ReportWorkflowDrawer` / `ContentStep`: em `TECHNICAL_REPORT`, coleta competência, enum de
  manutenção, listas semanal/semestral e equipamentos/setores. Apenas persiste o payload da
  Operation; não monta PDF ou snapshots.
# Components added/extended — Technical Report workflow

- `MultiSelect`: reusable searchable multi-selection with selected chips, keyboard-focusable search, empty state, and bounded dropdown scrolling.
- `ReportWorkflowDrawer`: equipment selection and structured maintenance checklist now live exclusively in Content; Evidence gates image upload to PMOC.
- `MaintenanceChecklistsPage` / `ChecklistEditor`: paginated catalog, filters, create/edit drawer, and confirmed soft deactivation.
# Work Order workflow components

- `ReportWorkflowDrawer`: seletor de origem `EXISTING | NEW`, criação de Operation DRAFT e fluxo
  completo de OS.
- `InspectedEquipmentSelector`: multiseleção pesquisável reutilizada pela OS e Relatório de Visita.
- `DocumentViewer`: renderização de `imageGallery` em grade compacta de duas colunas.
