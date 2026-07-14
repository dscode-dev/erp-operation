# ARCHITECTURE — Frontend

O Builder backend decide que `WORK_ORDER` contém somente `Código QR` no metadata. O Viewer não
interpreta o tipo documental nem recria a imagem, preservando a arquitetura Blueprint-driven.

O cabeçalho em duas linhas é uma projeção do `header` do Blueprint; a ordem das seções e a decisão
de omitir QR/documentos relacionados pertencem ao Builder backend. O frontend não replica essas
regras e apenas preserva a ordem recebida.

`DocumentViewer` continua consumindo o Blueprint oficial. A versão raiz é metadado de integração e
não conteúdo visual; header e footer são apresentados sem composição documental paralela.

## DC-02

```text
Central de Relatórios
→ POST/PATCH Operation (conteúdo técnico)
→ DocumentViewer
→ Document Engine Preview/Render/Download
→ mesmo DocumentBlueprint no Viewer e no PDF
→ GET /documents
```

A paginação do Viewer é apenas uma projeção visual dos componentes e das orientações de quebra do
Blueprint; não contém regra de negócio ou template de `TECHNICAL_REPORT`. A composição semântica
permanece no Builder e a paginação definitiva no LayoutEngine/Renderer.

## Product Backlog Closure 07

`ReportWorkflowDrawer → Operation/MaintenanceExecution → configuração por tipo → DocumentViewer → Preview/Render/Download → GET /documents`.

O wizard apenas orquestra domínios oficiais. Não possui renderer, PDF engine, template local, política local de assinatura ou repositório próprio.

## DC-01.2

Orientações de paginação permanecem no Blueprint/LayoutEngine; o frontend não introduz regras
específicas para a Ordem de Serviço.

`DocumentVisualStyle` é um contrato aditivo do Blueprint e não uma folha de estilo documental
paralela. O Viewer traduz os mesmos tokens e componentes consumidos pelo Renderer PDF. QR e
assinaturas chegam como assets resolvidos pelo backend; o frontend não acessa Storage, não gera QR
e não interpreta a política do template.

## DC-01

A especialização visual/semântica da OS reside no DocumentBuilder. O frontend apenas captura campos
da Operation e representa o Blueprint oficial no DocumentViewer; não possui template local de OS.

## Document Engine D1

`GET /documents` é o read model documental oficial. O frontend não agrega Operations, Budgets ou
snapshots. `DocumentViewer` permanece a fronteira única para Blueprint, render e download.
TemplateFormDrawer envia políticas e IDs; resolução, autorização e assets permanecem no backend.

## Product Backlog Closure 05 — document preview architecture

Arquitetura preservada:

```text
Reports
↓
DocumentViewer
↓
Document Engine API
↓
Blueprint oficial
↓
Preview / Render / Download
```

Decisões:

- Preview de modelo e preview de dados reais são fluxos semanticamente diferentes, mas usam o mesmo
  viewer.
- O frontend não monta documentos e não acessa assinatura de Operation diretamente.
- Preview e PDF devem divergir apenas quando o backend emitir novo blueprint/render; após render,
  `renderMetadata` contém proveniência (`sourceKind`, `sourceId`, `templateId`).

## Product Backlog Closure 05.1 — Platform visit workflow architecture

`/reports/visita` segue a arquitetura oficial:

```text
Platform Visit Evidence UI
↓
PATCH /operations/:id
↓
Operation + OperationPhoto + StorageProvider
↓
DocumentContext
↓
DocumentBuilder
↓
DocumentBlueprint
├─ DocumentViewer
└─ PDF Engine
```

Decisões:

- não existe `VisitReport` frontend/domain;
- fotos não são armazenadas como object URLs;
- assinatura não é anexada manualmente ao preview;
- PDF não é gerado no frontend.

## Sprint 23 — V1 product workflow closure

Sprint 23 preserva a arquitetura oficial:

```text
Operator PWA
↓
Assignments API
↓
Operation context
├─ Inventory API para materiais
├─ DocumentViewer / Document Engine para documentos
└─ Assignment history para timeline de execução
```

Decisões:

- O Operator PWA não monta workflows paralelos; ele atua sobre Assignment e Operation.
- Consumo de material continua passando por Inventory e `OperationPart`; o frontend não calcula
  saldo autoritativo.
- Documentos continuam passando por `DocumentViewer`; não existe geração local de PDF.
- Cards de capacidades ainda não finalizadas foram rebaixados para informação clara, evitando CTAs
  mortos.
- Nenhum state manager, cache global, domínio novo ou infraestrutura offline foi introduzido.

## Sprint 21 — Performance architecture review

Sprint 21 confirmou a arquitetura de consumo real:

```text
UI paginada / drawers / dashboard
↓
packages/api
↓
Backend paginado + Document Engine + Asset Lifecycle
```

Decisões:

- o frontend não deve criar caches globais persistentes de domínio para "ganhar performance";
- performance deve vir de paginação, filtros cumulativos, abort de requests obsoletas e componentes
  únicos reutilizáveis;
- o dashboard executivo atual permanece fan-out porque o backend medido ficou dentro do budget;
- se staging ou usuários reais apontarem gargalo, a próxima ação correta é endpoint agregado no
  backend, não cálculo local duplicado;
- rotas administrativas grandes devem ser otimizadas por code splitting de componentes pesados,
  preservando contratos e RBAC.

Riscos classificados:

- Sprint 22: avaliar lazy-load interno em `/equipamentos`, principalmente drawers/document viewer;
- Sprint 23: revisar `/budgets` e `/produtos` se métricas reais indicarem impacto;
- Post-V1 Optimization: introduzir bundle analyzer dedicado e budgets automatizados no CI.

## Frontend Sprint 9 — Architecture Inspection & Creation Flow Consolidation

Criações operacionais foram consolidadas sobre um único fluxo:

```text
Agenda / Operações / Serviços / OS
↓
OperationCreationDrawer
↓
operationApi.createOperation
↓
Backend Operation + OS rascunho
```

Decisões:

- não criar domínio `Service` paralelo no frontend;
- não criar OS isolada no frontend;
- Agenda usa Operation agendada enquanto não existir endpoint dedicado de agenda;
- selects reutilizáveis ficam em `apps/platform/components/entity-select.tsx`;
- `OperationCreationDrawer` concentra validação, stepper, loading, erro, sucesso e confirmação;
- RBAC visual continua via `<Gate>` e backend continua a fronteira real de autorização.

Limitação de contrato:

- `CreateOperationDto` do backend atual não aceita `operatorId` e usa o ator autenticado como
  operador. A UI já possui `UserSelect`, mas não envia `operatorId` para evitar erro
  `forbidNonWhitelisted`. A delegação real deve ser implementada em contrato backend futuro.

## Frontend Sprint 8 — Inventory, Materials & Pricing

Integração adicionada sem alterar backend:

```text
packages/api/inventory.ts
packages/api/pricing.ts
↓
app/(platform)/produtos
OperationDetailDrawer
Dashboard
```

Decisões:

- `Product` continua representando catálogo técnico; a UI não adiciona preço no produto.
- `InventoryItem` continua representando estoque físico; a UI não adiciona custo no estoque.
- `ProductPricing` é consumido exclusivamente por `pricingApi`.
- saldo físico nunca é alterado por edição direta; a UI registra `StockMovement`.
- consumo de materiais em Operation é delegado ao backend, que cria movimento e publica lifecycle.
- RBAC é aplicado por `<Gate>`, mas 401/403 do backend continuam sendo a autoridade final.
- A Sprint 8 não cria novas rotas fora de `/produtos`; a central usa abas para reduzir dispersão.
- Nenhum Demo Dataset novo foi criado; `demo.products.v1` deixou de alimentar `/produtos`.

Fluxo de materiais:

```text
OperationDetailDrawer
↓
GET /operations/:id/materials
↓
produto + inventory item + quantidade
↓
POST /operations/:id/materials
↓
backend cria StockMovement + AssetLifecycle
```

## Backlog — Document Template Preview

O preview de modelos agora é independente de documentos emitidos:

```text
DocumentTemplate
↓
documentsApi.previewTemplateDocument(templateId)
↓
DocumentViewer
↓
DocumentBlueprint oficial do backend
```

Decisões:

- `DocumentViewer` aceita `source={{ templateId }}` e chama `GET /documents/templates/:templateId/preview`.
- `/reports` não consulta mais uma Operation real para pré-visualizar modelos.
- Não existe preview local, `DocumentPaper`, Demo Dataset ou Operation fictícia nesse fluxo.
- Renderização definitiva de PDF para modelos continua fora do escopo; o viewer recebe `canRender=false` e `canDownload=false`.
- Erros de template inexistente, inativo, assinatura inválida, asset ausente e renderização são exibidos pelos estados padrão do Orbit/DocumentViewer.

## Backlog — Paginação Global + Modelos de Relatórios

A Platform passou a ter paginação visual e comportamental padronizada:

```text
filtros/ordenação
↓
query backend paginada ou array local já filtrado
↓
Pagination
↓
tabela/lista/card grid
```

Decisões:

- `apps/platform/components/pagination.tsx` é o único componente de paginação usado nas listagens da Platform.
- Trocar página ou tamanho de página não limpa filtros nem ordenação; filtros alterados resetam a página para `1`.
- Não foram criados endpoints nem contratos novos.
- Telas cujo backend já retorna `Paginated<T>` enviam `page` e `limit`.
- Telas ainda dependentes de dataset/demo aplicam paginação client-side sobre o resultado filtrado para evitar renderizar a lista completa.
- `/reports` não gera documento nem monta preview local: a biblioteca de modelos reutiliza `DocumentViewer`, que chama o preview oficial por `templateId`.

## Sprint 7 — Asset Lifecycle Integration

O frontend não monta mais histórico operacional local para Cliente, Equipamento ou Operação. A
arquitetura normativa é:

```text
AssetLifecycleEvent
↓
assetLifecycleApi
↓
AssetTimeline
↓
Event Drawer
├─ DocumentViewer quando documentId existir
└─ OperationDetailDrawer quando operationId existir
```

Decisões:

- `packages/api/asset-lifecycle.ts` é a única porta frontend para o Asset Lifecycle.
- `packages/ui/assets/asset-timeline.tsx` é o componente único de timeline.
- O componente consome o payload `timeline` produzido pelo `TimelineAssembler` do backend.
- O frontend não interpreta enum para ícone/cor/título/badge.
- Listagens suportam paginação, carregar mais, filtros rápidos, busca local segura, loading,
  skeleton, retry e estado vazio.
- Metadata nunca é renderizada como HTML.
- RBAC é respeitado pelo backend; o frontend apenas trata 401/403.
- O componente local antigo `@erp/ui/timeline` foi removido.

## Sprint 6 — Document Engine Integration

O frontend não possui mais pipeline local de documento oficial. A arquitetura normativa é:

```text
OperationDocument
↓
documentsApi.preview*
↓
DocumentViewer
↓
documentsApi.render*
↓
documentsApi.download*
```

Decisões:

- `packages/api/documents.ts` é a única porta para Document Engine.
- `packages/api/signatures.ts` é a única porta para assinaturas.
- `packages/ui/documents/document-viewer.tsx` é o viewer único para Platform e Operator.
- O viewer renderiza o `DocumentBlueprint` recebido do backend para preview de tela, mas nunca monta PDF.
- Renderização PDF e download sempre chamam backend.
- `/documentos` não usa mais Demo Dataset.
- Configuração documental e assinaturas vivem em `/settings` e respeitam RBAC do backend.
- Templates em `/reports` editam apenas dados persistidos em `/organization/templates`; não há editor visual nem mock de layout.

A partir da Sprint 3.0 o frontend é composto por **dois produtos independentes** que
compartilham apenas o backend, o Design System e os pacotes comuns:

- **ERP Platform** — gestão (OWNER / MANAGER), desktop-first.
- **ERP Operator** — operação de campo, mobile-first (PWA).

> Decisão: separação **in-repo** (um único projeto Next.js 15 / App Router) com
> separação física por pastas e aliases. A estrutura espelha um monorepo
> (`apps/*` + `packages/*`) e pode ser promovida a workspaces reais
> (apps/platform e apps/operator como Next apps separados) sem refatorar imports,
> pois nenhum código de produto importa o outro — apenas `packages/*`.

## Estrutura física

```
frontend/
  app/                         # Next App Router (apenas route shells finos)
    layout.tsx                 # html/body + ThemeProvider + AppProviders
    app-providers.tsx          # escolhe o app (e a sessão) pelo pathname
    login/ trocar-senha/       # auth da Platform (escopo platform)
    (platform)/                # shell autenticado da Platform (sidebar/topbar)
    operator/
      layout.tsx               # container mínimo (público)
      login/ trocar-senha/     # auth do Operator (escopo operator)
      (shell)/                 # shell autenticado do Operator (bottom nav)
  apps/
    platform/                  # código exclusivo da Platform
      components/ ...
      equipment-display.ts user-display.ts
    operator/                  # código exclusivo do Operator
      components/ ...
      shell/operator-shell.tsx
  packages/                    # compartilhado pelos dois apps
    types/   # contratos da API + documentos          -> @erp/types
    api/     # cliente HTTP único + domínios + useQuery -> @erp/api
    utils/   # cn, format, export, hooks               -> @erp/utils
    ui/      # design system, primitivos, auth, docs    -> @erp/ui/*
```

### Aliases (tsconfig `paths`)

| Alias         | Aponta para      | Conteúdo                                           |
| ------------- | ---------------- | -------------------------------------------------- |
| `@erp/types`  | `packages/types` | tipos da API e de documentos                       |
| `@erp/api`    | `packages/api`   | cliente HTTP, módulos de domínio, `useQuery`       |
| `@erp/utils`  | `packages/utils` | helpers puros e hooks                              |
| `@erp/ui/*`   | `packages/ui`    | DS, primitivos, `auth/*`, `documents/*`, `theme/*` |
| `@platform/*` | `apps/platform`  | componentes/utilitários da Platform                |
| `@operator/*` | `apps/operator`  | componentes/shell do Operator                      |
| `@/*`         | `frontend/`      | apenas route shells em `app/`                      |

Regra de dependência: `app → apps/* → packages/*`. `packages/*` nunca importa
`apps/*`; `apps/platform` e `apps/operator` nunca importam um ao outro.

## Responsabilidades

| Platform (gestão)                                                                             | Operator (campo)                                                                          |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Dashboard, Clientes, Equipamentos, Usuários, Financeiro, Relatórios, Configurações, Templates | Agenda, Atendimentos, OS, Checklist, Fotos, Assinatura, consulta de Clientes/Equipamentos |
| Visualizar, gerenciar, aprovar, editar, baixar documentos, acompanhar indicadores             | Executar serviço, capturar dados, fotografar, coletar assinatura, enviar                  |
| Desktop-first                                                                                 | Mobile-first, uma mão, poucos toques                                                      |

**Documentos:** preview estruturado, renderização e download são responsabilidade do backend.
Platform administra a Central Documental e configurações; Operator apenas consulta documentos reais
do cliente selecionado e abre o mesmo viewer quando autorizado.

## Autenticação (isolada)

Cada app tem **sua própria sessão**, nunca compartilhada:

- `packages/api/tokens.ts` é **scope-aware**: tokens vivem em
  `erp.platform.*` e `erp.operator.*` no localStorage.
- `AppProviders` monta um `AuthProvider` com `scope="platform"` ou
  `scope="operator"` conforme o pathname; o provider chama `setSessionScope`
  antes de qualquer acesso a token.
- Telas de login/troca de senha são compartilhadas (`packages/ui/auth/
{login-screen,change-password-screen}`) com `variant` por app; cada uma roda
  sob o provider escopado correspondente.
- `RequireAuth` deriva os caminhos de login/troca a partir do escopo
  (`/login` vs `/operator/login`).

O mesmo usuário pode acessar os dois ambientes; as sessões permanecem
independentes. Em produção os apps vivem em subdomínios distintos
(`erp.empresa.com.br` e `operator.empresa.com.br`), reforçando o isolamento.

## Comunicação com o backend

- Cliente HTTP **único** em `packages/api/client.ts` (`api.empresa.com.br/api/v1`):
  envelope `{success,data}`, `Authorization: Bearer`, `X-Request-Id`, refresh
  single-flight, replay em 401, emissão de invalidação de sessão.
- Os dois apps consomem exatamente os mesmos módulos de domínio
  (`usersApi`, `customersApi`, `equipmentsApi`, …). Nunca há cliente HTTP duplicado.
- **RBAC**: 100% do backend (`GET /users/me` → role + permissions). `<Gate>` e a
  sidebar apenas ocultam; 401/403 são a autoridade final. Sem regras locais.

## Design System compartilhado

`packages/ui` define cores/tipografia (via `app/globals.css` + tokens) e os
componentes base (drawers, chips, estados, tabelas auxiliares, documentos,
theme). **Layouts completos não são compartilhados**: Platform e Operator têm
shells próprios (`apps/platform/components/{sidebar,topbar}` vs
`apps/operator/shell/operator-shell`).

## Operator workflow (Sprint 3)

Fluxo de campo em `apps/operator` + `app/operator/*`, mobile-first:

- **Navegação**: bottom nav (Início/Agenda/Atendimentos/Clientes/Perfil); sem menus laterais.
- **Wizard de atendimento** (`/operator/atendimento`, route group `(full)`, sem shell): Cliente → Endereço → Equipamento → Tipo → Checklist → Observações → Fotos → Assinatura → Resumo → Enviar. Construído com `@erp/ui/wizard/*`, `@erp/ui/photo-input`, `@erp/ui/documents/signature-pad`.
- **Leitura** de clientes/equipamentos via `@erp/api` (real); agenda/serviços via Demo Dataset (`getSchedule`).
- **Documentos**: o Operator só coleta dados + assinatura; geração/visualização ficam na Platform/Backend.

### Offline-ready (arquitetura, sem sync nesta sprint)

`apps/operator/lib/offline-queue.ts` é o **outbox** local (localStorage `erp.operator.outbox`) com `status` (`pending/syncing/sent/error`), `attempts` e `flushOutbox()` placeholder. `submitAtendimento` enfileira a submissão. Quando o backend de Serviços existir, `flushOutbox` vira POST + transições de status + retry/backoff — sem refatorar a UI.

### Branding dinâmico

`@erp/ui/auth` exporta `applyBranding(primary, secondary)`. A Settings aplica ao vivo na edição e persiste via `PATCH /organization`; o `AuthProvider` reaplica no bootstrap (`GET /users/me`), propagando as cores a toda a app.

## Preparação para Backend Sprint 6 (Scheduling Domain)

A agenda do Operator consome `financialApi.getSchedule` (hoje Demo Dataset `demo.schedule.v1`). Ao surgir o domínio real, basta apontar essa função para o novo endpoint em `packages/api` — Home, Agenda e a lista de atendimentos passam a ser funcionais sem mudança de UI. O Wizard já produz uma submissão estruturada (`AtendimentoSubmission`) pronta para o POST de criação de OS.

## PWA (Sprint 4)

O app instalável é o **Operator**. `app/manifest.ts` define identidade azul/branco, `display: standalone` e `start_url`/`scope` `/operator`. `@erp/ui/pwa` provê `useInstallPrompt` (beforeinstallprompt + detecção iOS/standalone) e `InstallButton` (Perfil do operador), com fallback iOS "Adicionar à Tela de Início". Service worker / cache offline ficam para o futuro (offline-ready já estruturado no outbox).

## Demo dataset → telas (Sprint 4)

O endpoint `/internal/demo/dataset` retorna todo `demo.*` dinamicamente. Além de dashboard/schedule/finance, foram adicionados `demo.orders.v1` e `demo.products.v1` — consumidos por `@erp/api/operations` (`getOrders`/`getProducts`) nas telas de Ordens e Produtos. Quando os domínios reais existirem, troca-se a implementação em `packages/api/operations.ts` sem mudar as telas.

## QR (Sprint 4)

Platform exibe o QR (matriz visual determinística + código real) com copiar/baixar PNG. Operator resolve por simular/colar/selecionar (sem scanner nativo ainda). Um encoder de QR real e a resolução pública por scan são escopo futuro do backend.

## RC1 (Sprint 5)

- **Branding**: `@erp/ui/brand` (BrandLogo) + `public/brand/*` + `app/icon.png`/`apple-icon.png`. Tema azul/branco definitivo; cores dinâmicas do OWNER preservadas.
- **Central documental** antiga (`/reports`) e **Serviços/histórico** (`/servicos`) consumiam `demo.documents.v1`/`demo.services.v1` via `@erp/api/operations`; a Sprint 6 substituiu documentos oficiais pelo Document Engine.
- **Timeline** (`@erp/ui/timeline`) reutilizada em Serviço/Cliente/Equipamento.
- **Docker**: `frontend/Dockerfile` (Next `output: standalone`) + serviço `frontend` no compose (serve Platform e Operator; subdomínios via proxy em produção). Vars: `FRONTEND_PORT`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ENABLE_DEMO`.
- **Demo guiado** (`/demo-ready`): roteiro comercial de ponta a ponta.

## Subdomínios / deploy futuro

Promoção a monorepo real: mover `app/(platform)+login+trocar-senha` para
`apps/platform` (Next app) e `app/operator/*` para `apps/operator` (Next app),
mantendo `packages/*` como workspaces. Como nenhum produto importa o outro e
todo compartilhamento passa por `@erp/*`, a divisão é mecânica.

## Assignment Domain + Operator Workflow

Assignment é consumido como domínio real no frontend:

```text
Operation
↓
Assignment
↓
Operator workflow
```

Camadas:

- `packages/api/assignments.ts`: único client HTTP de Assignment;
- `packages/types`: contratos compartilhados;
- `packages/ui/assignments`: labels e helpers visuais;
- Platform: criação/agenda/drawer consomem Assignment;
- Operator: Home, Agenda, Minhas Ordens e detalhe consomem `/assignments/my`.

Regras arquiteturais:

- frontend não interpreta autorização; backend decide RBAC e transições;
- frontend não cria agenda, OS ou serviço paralelo;
- timeline de execução vem do backend;
- fluxo visual do Operator apenas chama transições oficiais (`accept`, `start`, `complete`,
  `reject`).

## Budget Domain

Budget é integrado como domínio comercial real da Platform:

```text
Product/Pricing
↓
Budget
↓
Operation (opcional)
↓
Document Engine / Asset Lifecycle
```

Camadas:

- `packages/api/budgets.ts`: único client HTTP do domínio;
- `packages/types`: contratos `Budget*`;
- `/budgets`: Central Comercial;
- `OperationDetailDrawer`: visão de orçamentos da Operation;
- Dashboard: widgets reais via `/budgets/stats`.

Regras arquiteturais:

- frontend nunca calcula preço, custo, margem, subtotal ou total como fonte de verdade;
- criação envia apenas cliente/operação/equipamento, data, observações e itens;
- snapshots comerciais vêm exclusivamente do backend;
- histórico vem de `/budgets/history/:id`;
- emissão documental usa `POST /budgets/:id/render`;
- download documental usa `GET /budgets/:id/download`;
- visualização usa `DocumentViewer` com `documentId` oficial;
- não existe `DocumentPaper`, renderer local ou preview de template como substituto do documento emitido;
- RBAC visual usa `<Gate>`, mas backend é a autoridade final.

## Financial & Procurement Integration

Sprint Frontend 11 integrou dois domínios reais sem alterar contratos do backend:

```text
Platform
↓
packages/api/financial.ts      packages/api/procurement.ts
↓                               ↓
Financial Core                  Procurement
↓                               ↓
saldo/histórico                 recebimento → Inventory
```

Regras arquiteturais:

- componentes nunca chamam `fetch` diretamente;
- todo acesso financeiro passa por `financialApi`;
- todo fluxo de compra passa por `procurementApi`;
- frontend não calcula saldo financeiro como fonte de verdade;
- frontend não altera estoque, não gera `StockMovement` e não calcula saldo físico;
- recebimento de compra envia apenas os itens/quantidades recebidos; Inventory é atualizado pelo backend;
- snapshots de compra (`snapshotCost`, `snapshotDescription`) são enviados/exibidos como contrato do Procurement, mas a integridade fica no backend;
- histórico financeiro e histórico de compra são consumidos dos endpoints oficiais;
- dashboard principal consome `GET /financial/stats` e `GET /purchase-orders/stats`;
- RBAC visual esconde ações para perfis sem acesso, mas backend continua sendo a autoridade.

Namespaces adicionados:

- `financialApi`: accounts, categories, entries, pay, cancel, stats, history;
- `procurementApi`: purchase orders, items, receipts, send, cancel, stats, history.

Componentização:

- drawers financeiros ficam em `apps/platform/components/financial-drawers.tsx`;
- drawer de compras fica em `apps/platform/components/purchase-order-drawer.tsx`;
- badges de status ficam em `apps/platform/components/financial-procurement-badges.tsx`;
- paginação continua centralizada em `apps/platform/components/pagination.tsx`.

## Executive Dashboard & Operational Intelligence

O dashboard da Platform é uma composição de domínios reais, não um domínio analítico novo:

```text
Assignments / Operations
Financial
Maintenance / PMOC
Inventory / Procurement
Asset Lifecycle
        ↓
app/(platform)/page.tsx
        ↓
Executive Dashboard
```

Decisões:

- nenhum endpoint novo foi criado nesta sprint;
- foram adicionados apenas clients frontend para endpoints já existentes (`maintenanceApi`, `pmocApi`);
- a home removeu `dashboardApi` e dependências do Demo Dataset;
- agregações de negócio continuam no backend (`/financial/stats`, `/inventory/stats`, `/purchase-orders/stats`, `/maintenance-plans/stats`, `/pmoc/stats`, `/operations/stats`);
- listas usadas para contexto visual são bounded (`limit` pequeno);
- não há leitura de `AuditLog`;
- atividade recente vem de `AssetLifecycle`, já montado pelo `TimelineAssembler`;
- cada seção usa `useQuery` próprio para preservar falha parcial.

RBAC/AppSec:

- Financial só é requisitado quando a sessão tem `OWNER`/`MANAGER` e `canFinancial`;
- Procurement só é requisitado para `OWNER`/`MANAGER`;
- dados financeiros não são pré-carregados para perfis sem permissão;
- erros são exibidos por `ErrorState`, sem renderizar payload bruto;
- metadata de timeline é exibida apenas por campos seguros (`timeline.title`, `subtitle`, `description`, `date`).

Performance:

- o dashboard evita baixar páginas completas para contagens quando existem endpoints de stats;
- usa stats por domínio como fonte principal;
- usa listas pequenas apenas para contexto acionável;
- caso o volume real exija, a próxima etapa recomendada é um endpoint read-only agregado de dashboard, sem criar plataforma de analytics.

## Sprint 18 — Product UX Consolidation

Polish arquitetural aplicado sem novo domínio:

- rotas legadas passaram a redirecionar para fluxos oficiais;
- sidebar remove destinos duplicados que apontavam para telas demo;
- dashboard e páginas destino compartilham deep-links por querystring;
- parsing de querystring é whitelist-based:
  - status de Operation;
  - status/type/origin de Financial;
  - status de Purchase Orders;
  - tabs de Products.

Estratégia de forms/feedback:

- nenhum novo sistema global de notificações foi criado;
- os fluxos continuam usando feedback local existente (`ErrorState`, mensagens inline, loading state em botões/drawers);
- máscara/formatting existente de CPF/CNPJ foi preservada;
- entradas monetárias/quantidade continuam formatando exibição sem recalcular regras oficiais.

Segurança frontend:

- links contextuais não passam dados sensíveis;
- query params inválidos são ignorados;
- rotas demo/stale não carregam mais dados demo;
- imagens blob/base64 usam `next/image unoptimized` quando seguro;
- `<img>` restante é intencional para BrandLogo local e renderizadores documentais/base64.

Performance:

- eliminadas telas legadas que carregavam Demo Dataset;
- removida duplicação de navegação para Serviços/Ordens;
- lint sem warnings reduz ruído de certificação;
- bundle da home aparece maior no relatório do Next e deve ser investigado com bundle analyzer na Sprint 21 antes de qualquer refator especulativo.

## Sprint 20.5 — AppSec Closure Architecture

Asset Lifecycle é tratado como API pública sanitizada. Componentes devem renderizar a timeline usando `event.timeline` e `event.timeline.references`, sem interpretar metadata bruto nem usar chaves de storage.

Fluxos com `URL.createObjectURL` devem manter ciclo de vida explícito: revogar URL ao remover o item, substituir preview ou desmontar o componente. O fluxo de Visita Técnica já segue essa regra.

## Sprint 22 — production readiness architecture

Frontend production configuration:

- `NEXT_PUBLIC_API_BASE_URL` may be `/api/v1` when the deployment has a same-origin reverse proxy.
- `NEXT_PUBLIC_ENABLE_DEMO` defaults to `false` and must be enabled explicitly only for demo/dev.
- The shared API client resolves relative API bases against `window.location.origin` in the browser.

Release topology:

- `docker-compose.rc.yml` provides a representative local topology with `frontend`, `api`,
  `postgres` and `proxy`.
- The proxy routes `/api/v1/*` to the API and all other paths to the Next frontend.
- Real TLS/certificate/HSTS verification remains an environment responsibility and was not proven in
  this repository workspace.

## Sprint 22.5 — V1 deployment boundaries

Orbit V1 frontend is certified for isolated single-company installations only:

- one customer-facing frontend per deployment;
- one API/database/storage scope per deployment;
- no shared application-level tenant switching;
- no frontend behavior should rely on a tenant selector.

Supply-chain closure:

- frontend uses `overrides.postcss=8.5.16` to remediate the transitive PostCSS advisory bundled
  through Next 15.5.x.

## Product Backlog Closure 01 — architecture notes

Arquitetura preservada:

- Product continua sendo catálogo técnico, sem preço e sem saldo físico.
- Pricing continua sendo a única fonte comercial para custo/preço/margem/vigência.
- Supplier continua pertencendo ao Inventory/Procurement como base para compras; a relação
  Product↔Supplier foi posteriormente oficializada no Product Backlog Closure 01.1 por junction
  backend, sem mover regra de compras para Product.
- CustomerAddress continua sendo recurso separado de Customer; criação com endereço usa duas mutações reais e estado de retry seguro.
- Equipment continua validando endereço pelo cliente selecionado; o frontend não permite seleção fora da lista carregada daquele cliente.
- Reports/Modelos continua renderizando via Document Engine e `DocumentViewer`; não há preview local nem `DocumentPaper`.

## Product Backlog Closure 01.1 — architecture notes

- Product form consome `inventoryApi.listSuppliers` em query própria para não depender da aba
  Fornecedores nem da paginação/filtro atual da página.
- A criação inline de fornecedor reutiliza o `SupplierDrawer` oficial; o fornecedor retornado é
  temporariamente mesclado às opções até o refetch concluir.
- O frontend persiste fornecedor principal enviando `primarySupplierId` e consome
  `Product.suppliers[]`; não há cache local como fonte de verdade.
- Pricing tab abre o `PricingDrawer` oficial independentemente da página atual do catálogo de
  produtos; o drawer carrega produtos ativos e chama `pricingApi`.

CEP:

- `cepApi.lookupCep` é um boundary externo isolado para preenchimento assistido.
- O resultado não é confiado cegamente: todos os campos permanecem editáveis antes da persistência.
- Falhas de CEP não bloqueiam cadastro manual.

Mutation/state safety:

- se `createCustomer` passa e `createAddress` falha, o drawer preserva o `createdCustomerId` para retry apenas do endereço;
- o fluxo evita duplicação de cliente em retry;
- erros do backend continuam exibidos como mensagens inline, sem renderizar payload bruto.

## Product Backlog Closure 02 — document workflow architecture

Fluxo oficial no frontend:

```text
/reports
→ escolher tipo documental
→ escolher Operation real
→ DocumentViewer
→ preview oficial
→ render oficial
→ download autorizado
→ /documentos lista o OperationDocument emitido
```

Regras preservadas:

- nenhum PDF é gerado no frontend;
- nenhum preview autoritativo é montado por componente local;
- `DocumentViewer` é a superfície única de visualização/render/download;
- `/documentos` não compete com `/reports`: ele representa histórico/repositório.

Performance:

- preview não renderiza PDF automaticamente ao abrir drawer;
- render é ação explícita do usuário;
- download ocorre apenas depois de `documentId` existente/renderizado.

## Document Semantics Closure — preview mode architecture

Model Preview e Real Data Preview são caminhos distintos:

```text
Template → TemplatePreviewContext → Blueprint → DocumentViewer
```

Sem render/download oficial.

```text
Operation → DocumentContext → Builder especializado → Blueprint → Render → PDF → Download
```

Com render/download explícitos.

Taxonomia V1:

- `TECHNICAL_REPORT` é factual/operacional.
- `TECHNICAL_OPINION` é analítico/conclusivo com dados existentes.
- `REPORT` é compatibilidade histórica.

## Product Backlog Closure 03 — PDF exports and signature UX architecture

List exports now use backend-generated PDF blobs:

```text
Platform list page
→ ExportButton.onPdf
→ packages/api api.blob()
→ backend /operations|documents|equipments/export
→ browser Blob download
```

Architecture rules:

- frontend never generates list PDFs;
- CSV remains a local convenience export for visible rows only;
- PDF export uses active filters and the backend record limit;
- `api.blob()` preserves auth, request id and refresh-token replay behavior;
- filenames are taken from `Content-Disposition` when available and sanitized before download.

Signature management:

- public signature objects use `hasImage`; frontend never receives or stores `imageStorageKey`;
- upload and freehand drawing converge to the same backend upload endpoint;
- freehand capture is client-side input only, exported as transparent PNG and persisted by the official signature storage pipeline;
- deleted signatures are removed by backend filtering, not by frontend-only hiding;
- the Settings signature area uses a Drawer to keep creation, editing, upload, drawing and preview in a single reusable workflow.

## Product Backlog Closure 04 — Avatar and Notification architecture

Avatar flow:

```text
File selection → Canvas crop 512×512 PNG → POST /users/avatar → AuthProvider.refresh()
→ session.user.avatarAssetId → UserAvatar → GET /users/avatar/:id
```

Identity state remains centralized in `AuthProvider`; no second user store was introduced.

Notification flow:

```text
Domain transition → NotificationsService inside transaction → Notification rows
→ Topbar/Operator bell → unread/list/read APIs
```

No WebSocket/realtime infra was added. V1 refresh uses shell load, focus/visibility and 60s polling
while visible.

# Closure 06 — document source consistency

O frontend distingue três fontes: template preview, Operation preview e documento persistido. Para
Work Order, a fonte real é sempre `operationId + WORK_ORDER`. A API bloqueia download obsoleto; o
cliente apresenta o erro e exige render explícito depois de mutations. Datas operacionais não são
normalizadas para um campo genérico: `createdAt` e `scheduledFor` permanecem conceitos distintos.

# Closure 06.1 — runtime UI and nested overlays

Drawers são portais para `document.body`; isso impede que transforms de um drawer pai criem um novo
containing block para overlays `fixed`. DocumentViewer mantém blueprint oficial e passa a ocupar a
largura solicitada mesmo quando aberto a partir de OperationDetailDrawer ou Timeline.

O script `test/runtime/verify-operations-ui.mjs` valida opt-in a rota ativa, contrato visível, drawer
e assinatura no preview sem introduzir uma suíte/browser como dependência de produção.

## DC02B — Corporate Header e persistência

`DocumentViewer` continua sendo projeção do Blueprint. O Builder monta o Corporate Header com dados
de Organization já carregados pelo DocumentContext; o frontend não consulta assets nem recompõe a
identidade corporativa.

O workflow persiste primeiro os dados documentais na Operation e só então solicita Preview. Assim,
regenerações não dependem de estado React ou de campos técnicos que mudem depois da emissão.
# Technical Report form architecture

Catalog entries are fetched through `maintenanceChecklistTemplatesApi`. The UI uses their IDs only while selecting; it sends immutable description/type/execution/observation snapshots through the existing Operation API. Equipment choices similarly map to `inspectedEquipments[]`. This keeps DocumentContext and the official Document Engine unchanged and prevents the renderer from querying mutable catalogs.
# Work Order creation architecture

A OS independente não é uma entidade local: o frontend cria uma Operation DRAFT e usa o documento
WORK_ORDER que o backend cria transacionalmente. Múltiplos equipamentos são snapshots da Operation.
Galerias são componentes do Blueprint e possuem implementações correspondentes no Viewer e no
Renderer PDF, preservando paridade e evitando geração local.
