# COMPONENTS — Sprint 0.A

## `components/platform/` (desktop-first)

| Componente | Arquivo | Descrição |
|---|---|---|
| `PlatformSidebar` | `sidebar.tsx` | **Sidebar agrupada** em 4 categorias (Operação · Cadastros · Gestão · Sistema), grupos recolhíveis, item ativo com barra lateral e fundo `primary/10`, badge "em breve", tooltips quando colapsada |
| `PlatformTopbar` | `topbar.tsx` | Empresa ativa · busca global (⌘K) · notificações · theme toggle · avatar |
| `PageHeader` | `page-header.tsx` | Título reduzido para `text-page-title` (28px), eyebrow/description aceitam `ReactNode` |
| `GreetingHeader` | `greeting-header.tsx` | **NOVO** — saudação discreta ("Olá, {nome}.") + data + contador de pendências |
| `Breadcrumbs` | `breadcrumbs.tsx` | Trilha de navegação para drill-down |
| `FilterBar` | `filter-bar.tsx` | Busca + chips + slot direito |
| `DataTable` | `data-table.tsx` | Tabela genérica `<T>` com `rowHref?` |
| `InfoCard` / `InfoRow` | `info-card.tsx` | Cartão label/value para detalhes |
| `MetricCard` | `metric-card.tsx` | **Reprojetado** — valor 22px, ícone em quadrado, pill de tendência com seta colorida, hover sobe o card |
| `ActivityFeed` | `activity-feed.tsx` | Lista de atividade recente |
| `AlertCard` | `alert-card.tsx` | **NOVO** — alerta operacional com severidade (`danger`/`warning`/`info`) e ring tonal |
| `TeamStatusList` | `team-status-list.tsx` | **NOVO** — operadores com avatar, status (online/em_servico/offline) e OS atual |
| `RevenueChart` | `revenue-chart.tsx` | **NOVO** — gráfico SVG linha + área (receita vs despesa, 6 meses) sem dependências |
| `DashboardSection` | `dashboard-section.tsx` | Wrapper de seção (label 11px uppercase) |
| `NewServiceButton` / `NewServiceSheet` | … | Sheet multi-step de criação de serviço |

## `components/operator/` (mobile-first)

| Componente | Arquivo | Descrição |
|---|---|---|
| `OperatorBottomNav` | `bottom-nav.tsx` | Nav inferior, 5 itens, botão QR elevado |
| `OperatorHeader` | `operator-header.tsx` | **Reprojetado** — "Olá, {nome}." + data discreta, sem cabeçalho gigante |
| `QuickAction` | `quick-action.tsx` | **Reprojetado** — gradient bg, min-h 88px, 3 tons (`primary`/`accent`/`success`), feedback tátil |
| `ServiceCard` | `service-card.tsx` | Card de atendimento |
| `ScheduleCard` | `schedule-card.tsx` | Item de agenda |

## `components/shared/`

| Componente | Arquivo | Descrição |
|---|---|---|
| `CommandPaletteProvider` / `useCommandPalette` | `command-palette.tsx` | ⌘K global |
| `EmptyState` | `empty-state.tsx` | Estado vazio com ícone + descrição |
| `StatusPill` | `status-pill.tsx` | Pill semântica por estado |
| `SkeletonLine` / `SkeletonCard` / `SkeletonList` | `skeletons.tsx` | Placeholders shimmer |

## `components/theme/`

| Componente | Arquivo | Descrição |
|---|---|---|
| `ThemeProvider` / `ThemeToggle` | `theme/*` | Light/Dark via classe `.dark` |

## Padrões de uso

- **Saudação do dashboard**: sempre `GreetingHeader` com `name` + `pending`.
- **Métricas de topo**: grid `grid-cols-2 lg:grid-cols-6` para Plataforma, `grid-cols-2 lg:grid-cols-4` para Financeiro.
- **Eventos da Agenda**: usar `kind` (`atendimento`/`manutencao`/`visita`/`urgencia`) com tokens `--color-event-*`.
- **Alertas**: usar `AlertCard` para qualquer aviso operacional; severidade define ring + dot.
- **Ações rápidas (Operador)**: 3 colunas, tons alternados (`primary`/`accent`/`success`).
