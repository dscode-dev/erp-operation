# ARCHITECTURE — Frontend (Sprint 3.0)

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

**Documentos:** toda a responsabilidade documental (preview detalhado, gestão,
download) é da Platform. O Operator apenas envia dados, assina e acompanha o
status do envio.

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
- **Central documental** (`/reports`) e **Serviços/histórico** (`/servicos`) consomem `demo.documents.v1`/`demo.services.v1` via `@erp/api/operations`.
- **Timeline** (`@erp/ui/timeline`) reutilizada em Serviço/Cliente/Equipamento.
- **Docker**: `frontend/Dockerfile` (Next `output: standalone`) + serviço `frontend` no compose (serve Platform e Operator; subdomínios via proxy em produção). Vars: `FRONTEND_PORT`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ENABLE_DEMO`.
- **Demo guiado** (`/demo-ready`): roteiro comercial de ponta a ponta.

## Subdomínios / deploy futuro

Promoção a monorepo real: mover `app/(platform)+login+trocar-senha` para
`apps/platform` (Next app) e `app/operator/*` para `apps/operator` (Next app),
mantendo `packages/*` como workspaces. Como nenhum produto importa o outro e
todo compartilhamento passa por `@erp/*`, a divisão é mecânica.
