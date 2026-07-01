# COMPONENTS — Frontend

## Frontend Sprint 9 — Navigation UX & Creation Flows

| Item | Local | Uso |
|---|---|---|
| `CustomerSelect` | `apps/platform/components/entity-select.tsx` | Seleção reutilizável de cliente |
| `CustomerAddressSelect` | `apps/platform/components/entity-select.tsx` | Endereço do cliente selecionado |
| `EquipmentSelect` | `apps/platform/components/entity-select.tsx` | Equipamentos filtrados por cliente |
| `UserSelect` | `apps/platform/components/entity-select.tsx` | Seleção visual de responsável |
| `DateTimePicker` | `apps/platform/components/entity-select.tsx` | Data/hora para agendamento |
| `ServiceTypeSelect` | `apps/platform/components/entity-select.tsx` | Tipo oficial da Operation |
| `OperationCreationDrawer` | `apps/platform/components/operation-creation-drawer.tsx` | Drawer/wizard reutilizado por Agenda, Operações, Serviços e OS |

Decisão: esses componentes ficam em `apps/platform/components` porque são fluxos específicos da
Platform. Se o Operator ou outro app precisar deles no futuro, podem ser promovidos para
`packages/ui`.

## Frontend Sprint 8 — Inventory, Materials & Pricing

| Item | Local | Uso |
|---|---|---|
| `inventoryApi` | `packages/api/inventory.ts` | Products, Inventory Items, Stock Movements, Suppliers e Operation Materials |
| `pricingApi` | `packages/api/pricing.ts` | Pricing, preço vigente, stats e histórico |
| Tipos Inventory/Pricing | `packages/types/index.ts` | Contratos reais das Sprints 12/13 do backend |
| Central real de produtos | `app/(platform)/produtos/page.tsx` | Abas Catálogo, Estoque, Fornecedores, Preços e Movimentos |
| `ProductFormDrawer` real | `apps/platform/components/product-form-drawer.tsx` | Criação/edição de produto via `/products` |
| Materiais na Operation | `apps/platform/components/operation-detail-drawer.tsx` | Seção **Materiais utilizados** via `/operations/:id/materials` |
| Dashboard Inventory/Pricing | `app/(platform)/page.tsx` | Widgets reais de estoque, pricing e movimentações |

Regras:

- saldo não é editado diretamente no frontend; movimentações usam `POST /inventory/movements`;
- consumo de material em Operation usa `POST /operations/:id/materials`;
- Pricing não é exibido para OPERATOR/VIEWER;
- criação/revisão de Pricing fica restrita a OWNER;
- nenhum mock ou novo Demo Dataset foi adicionado.

## Backlog — Document Template Preview

| Item | Local | Uso |
|---|---|---|
| `documentsApi.previewTemplateDocument` | `packages/api/documents.ts` | Consome `GET /documents/templates/:templateId/preview` |
| `DocumentViewer` com `templateId` | `packages/ui/documents/document-viewer.tsx` | Preview oficial de modelo sem Operation |
| `/reports` integrado | `app/(platform)/reports/page.tsx` | Drawer de modelo usa `DocumentViewer source={{ templateId }}` |

Regra: previews de modelos não usam `DocumentPaper`, não criam Operation, não consultam Demo Dataset e não possuem fallback local.

## Backlog — Paginação Global + Modelos de Relatórios

| Item | Local | Uso |
|---|---|---|
| `Pagination` atualizado | `apps/platform/components/pagination.tsx` | Paginação padrão da Platform com page size, primeira/anterior/próxima/última e totais |
| `TemplateFormDrawer` reutilizado | `apps/platform/components/template-form-drawer.tsx` | Criar/configurar modelos, incluindo assinatura obrigatória, modo e assinatura fixa |
| `DocumentViewer` reutilizado | `packages/ui/documents/document-viewer.tsx` | Preview oficial dos modelos por `templateId`; sem `DocumentPaper` local na página de Relatórios |
| `ConfirmDialog` reutilizado | `packages/ui/confirm-dialog.tsx` | Confirmação de exclusão de modelo |
| Cards de modelo | `app/(platform)/reports/page.tsx` | Biblioteca de Modelos de Documentos com badges, hover e ações discretas |

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

| Item | Local | Uso |
|---|---|---|
| `AssetTimeline` | `packages/ui/assets/asset-timeline.tsx` | Timeline oficial do ativo, renderizada a partir do `TimelineAssembler` do backend |
| `assetLifecycleApi` | `packages/api/asset-lifecycle.ts` | Listagem, detalhe e estatísticas de Asset Lifecycle |
| `AssetLifecycle*` types | `packages/types/index.ts` | Contratos de evento, timeline, stats e filtros |
| `OperationDetailDrawer` integrado | `apps/platform/components/operation-detail-drawer.tsx` | Timeline da operação via Asset Lifecycle |
| `DocumentViewer` integrado | `packages/ui/documents/document-viewer.tsx` | Aberto diretamente por eventos `DOCUMENT` |

Removidos na Sprint 7:

- `packages/ui/timeline.tsx`;
- helper `operationsToTimeline`;
- timeline local derivada de `/operations`;
- timeline demo em detalhes de cliente/equipamento.

Regra visual: o frontend usa `event.timeline.icon`, `color`, `title`, `subtitle`, `category`,
`badges` e `references` enviados pelo backend. Não há mapeamento local de enum para montar timeline.

## Sprint 6 — Document Center & Configuration

| Item | Local | Uso |
|---|---|---|
| `DocumentViewer` | `packages/ui/documents/document-viewer.tsx` | Viewer único do Document Engine: preview oficial, páginas, miniaturas, zoom, render e download |
| `documentsApi` | `packages/api/documents.ts` | Preview/render/download/configuração de documentos |
| `signaturesApi` | `packages/api/signatures.ts` | CRUD/upload/download de assinaturas |
| `TemplateFormDrawer` atualizado | `apps/platform/components/template-form-drawer.tsx` | Configura assinatura obrigatória, modo e assinatura fixa |
| Central Documental real | `app/(platform)/documentos/page.tsx` | Lista `OperationDocument` via `/operations`; abre `DocumentViewer` |
| Operator Documentos real | `app/operator/(shell)/documents/page.tsx` | Lista documentos por cliente selecionado via `/operations` |
| Configurações → Documentos/Assinaturas | `app/(platform)/settings/page.tsx` | Consome `/documents/configuration` e `/signatures` |

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
| Componente | Arquivo | Uso |
|---|---|---|
| `Stepper` | `wizard/stepper.tsx` | progresso segmentado |
| `WizardProgressHeader` | `wizard/progress-header.tsx` | header sticky (etapa X/N) |
| `WizardFooter` | `wizard/step-footer.tsx` | controles voltar/continuar/enviar |
| `PhotoInput` | `photo-input.tsx` | captura multi-foto (preview/remover/reordenar) |
| `SignaturePad` | `documents/signature-pad.tsx` | **refinado**: desfazer/limpar/confirmar/indicador |
| `applyBranding` | `auth/auth-provider.tsx` | aplica cores da empresa ao tema (export) |

## Operator — `@operator/*` (`apps/operator`)

| Item | Arquivo |
|---|---|
| `OperatorShell` | `shell/operator-shell.tsx` (brand bar + bottom nav) |
| `OperatorBottomNav` | `components/bottom-nav.tsx` (Início/Agenda/Atend./Clientes/Perfil) |
| `OperatorHome` | `features/home/operator-home.tsx` |
| `AtendimentoWizard` | `features/atendimento/atendimento-wizard.tsx` (10 etapas + pickers) |
| Config/serviços | `lib/service-types.ts` (tipos + checklists HVAC) |
| Outbox offline | `lib/offline-queue.ts` (fila local + status + flush placeholder) |
| Submissão | `lib/atendimento.ts` (`AtendimentoDraft`, `submitAtendimento` → outbox) |

Componentes herdados: `service-card`, `schedule-card`, `quick-action`, `operator-header`.

## Platform — `@platform/*`

Inalterado em estrutura; ajustes: Financeiro (métricas + grid de alturas iguais) e Settings (cores dinâmicas via `applyBranding` + `refresh`). `equipment-display`/`user-display` continuam em `apps/platform` (reutilizados também pelo Operator via `@platform/equipment-display`).

## Sprint 4 — novos

| Item | Local | Uso |
|---|---|---|
| `useInstallPrompt` / `InstallButton` | `@erp/ui/pwa` | instalação do PWA (Chromium + fallback iOS) |
| `QrFoundation` (atualizado) | `@platform/components/qr-foundation` | QR + copiar código + baixar PNG |
| `operationsApi` (`getOrders`/`getProducts`) | `@erp/api/operations` | snapshots demo de OS e Produtos |
| `app/manifest.ts` + `public/icons/operator-icon.svg` | `app/` | manifest PWA + ícone |

Telas demo: `/documentos` (DocumentViewer + RBAC), `/demo-ready` (apresentação), Ordens/Produtos (Demo Dataset), QR do operador (`/operator/qr`).

## Sprint 5 — novos

| Item | Local | Uso |
|---|---|---|
| `BrandLogo` | `@erp/ui/brand` | logo do cliente (login/sidebar/operator) |
| `Timeline` / `TimelineEvent` | `@erp/ui/timeline` | histórico (Serviço/Cliente/Equipamento) |
| `operationsApi.getServices` | `@erp/api/operations` | snapshot `demo.services.v1` |

Telas: `/reports` (central documental), `/servicos` (histórico timeline), `/operator/{equipamentos,documents,sync}`, `/demo-ready` (roteiro guiado). Docker: `frontend/Dockerfile` + serviço `frontend` no compose.

## Regras

- Dados via `@erp/api`; nunca `fetch` direto, nunca mocks. Operator escreve no outbox local até o backend de Serviços existir.
- Reutilizáveis ficam em `packages/ui`; layouts completos não são compartilhados.
- RBAC sempre do backend; sessões Platform/Operator isoladas por escopo.

## Backlog #001 — Agenda

| Item | Local | Uso |
|---|---|---|
| `AgendaEventDrawer` | `@platform/components/agenda-event-drawer` | detalhe lateral do evento + ações RBAC |
| `financialApi.getScheduleRange(from,to)` | `@erp/api` | schedule por intervalo (navegação do calendário) |
| `DemoScheduleItem` | `@erp/types` | item de agenda enriquecido (equipment/serviceType/endsAt/notes) |

## Backlog #002 — QR Code

| Item | Local | Uso |
|---|---|---|
| `QrScanner` | `@erp/ui/qr-scanner` | leitura real de QR pela câmera (PWA, `@zxing/browser`) |
| `equipmentsApi.lookupByQr` | `@erp/api` | resolve equipamento por `GET /equipments/lookup/:qrCode` |

Biblioteca de QR: `@zxing/browser` + `@zxing/library` (`BrowserQRCodeReader`, somente QR).

## Backlog #003 — Modelos & Documentos

| Item | Local | Uso |
|---|---|---|
| `DocumentPaper` | `@erp/ui/documents/document-paper` | base visual legada/modelos; documentos emitidos usam `DocumentViewer` |
| `MODEL_BLUEPRINTS` / `buildDocument` | `@erp/ui/documents/model-blueprints` | 7 modelos + montagem do documento |
| `TemplateFormDrawer` | `@platform/components/template-form-drawer` | criar/editar modelo |

Páginas: `/reports` = Gestão de Modelos; `/documentos` = Central Documental (filtros cumulativos + preview + download).

## Backlog #004 — Operações

| Item | Local | Uso |
|---|---|---|
| `OperationView` | `@erp/ui/operations/operation-view` | renderiza uma Operation pelas seções (Renderers) |
| `buildOperationSections` | `@erp/ui/operations/operation-sections` | modelo de seções (fundação reutilizável dos documentos) |
| `OPERATION_*` | `@erp/ui/operations/operation-shared` | labels/tones de operações |
| `OperationDetailDrawer` | `@platform/components/operation-detail-drawer` | drawer: AssetTimeline + Checklist + Fotos + Observações + Assinatura + Documentos |
| `operationApi` | `@erp/api/operation` | domínio real `/operations` (≠ `operationsApi` demo) |

Arquitetura: **OperationForm → Sections → Renderers** — um único modelo de seções
reutilizado por OS/PMOC/Laudo/Relatório/Visita/Orçamento/Recibo (sem forms
duplicados). Páginas: `/operacoes` (Platform). Operator: o Wizard cria uma
Operation real e a OS rascunho. Histórico oficial em Equipamento/Cliente vem de
`/asset-lifecycle`.
