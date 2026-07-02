# ARCHITECTURE — Frontend

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

| Alias | Aponta para | Conteúdo |
|---|---|---|
| `@erp/types` | `packages/types` | tipos da API e de documentos |
| `@erp/api` | `packages/api` | cliente HTTP, módulos de domínio, `useQuery` |
| `@erp/utils` | `packages/utils` | helpers puros e hooks |
| `@erp/ui/*` | `packages/ui` | DS, primitivos, `auth/*`, `documents/*`, `theme/*` |
| `@platform/*` | `apps/platform` | componentes/utilitários da Platform |
| `@operator/*` | `apps/operator` | componentes/shell do Operator |
| `@/*` | `frontend/` | apenas route shells em `app/` |

Regra de dependência: `app → apps/* → packages/*`. `packages/*` nunca importa
`apps/*`; `apps/platform` e `apps/operator` nunca importam um ao outro.

## Responsabilidades

| Platform (gestão) | Operator (campo) |
|---|---|
| Dashboard, Clientes, Equipamentos, Usuários, Financeiro, Relatórios, Configurações, Templates | Agenda, Atendimentos, OS, Checklist, Fotos, Assinatura, consulta de Clientes/Equipamentos |
| Visualizar, gerenciar, aprovar, editar, baixar documentos, acompanhar indicadores | Executar serviço, capturar dados, fotografar, coletar assinatura, enviar |
| Desktop-first | Mobile-first, uma mão, poucos toques |

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
