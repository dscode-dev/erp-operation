# COMPONENTS — Sprint 1.c

## `components/platform/` (desktop-first)

| Componente | Arquivo | Descrição |
|---|---|---|
| `PlatformSidebar` | `sidebar.tsx` | Sidebar colapsável com indicador ativo |
| `PlatformTopbar` | `topbar.tsx` | Empresa, busca global, notificações, theme toggle, avatar |
| `PageHeader` | `page-header.tsx` | Cabeçalho de rota (eyebrow/título/descrição aceitam `ReactNode`) |
| `Breadcrumbs` | `breadcrumbs.tsx` | Trilha de navegação para drill-down (`items: { label, href? }[]`) |
| `FilterBar` | `filter-bar.tsx` | Campo de busca + chips de filtro + slot direito |
| `DataTable` | `data-table.tsx` | Tabela genérica `<T>` — agora aceita `rowHref?: (row) => string` para linhas clicáveis (renderiza `<Link>` por célula, SSR-friendly) |
| `InfoCard` / `InfoRow` | `info-card.tsx` | Cartão de seção com header + linhas label/value para detalhes |
| `MetricCard` | `metric-card.tsx` | Card de indicador operacional |
| `ActivityFeed` | `activity-feed.tsx` | Lista de atividade recente |
| `DashboardSection` | `dashboard-section.tsx` | Wrapper de seção |
| `NewServiceButton` | `new-service-button.tsx` | Botão client que abre o sheet de criação |
| `NewServiceSheet` | `new-service-sheet.tsx` | Sheet lateral multi-step (Cliente → Equipamento → Tarefas → Agendamento → Resumo) |

## `components/operator/` (mobile-first)

| Componente | Arquivo | Descrição |
|---|---|---|
| `OperatorBottomNav` | `bottom-nav.tsx` | Nav inferior, 5 itens, botão central QR elevado |
| `OperatorHeader` | `operator-header.tsx` | Saudação + notificações |
| `QuickAction` | `quick-action.tsx` | Botão grande de ação rápida |
| `ServiceCard` | `service-card.tsx` | Card de atendimento → `/operator/services/[id]` |
| `ScheduleCard` | `schedule-card.tsx` | Item compacto de agenda → detalhe |

## `components/shared/`

| Componente | Arquivo | Descrição |
|---|---|---|
| `CommandPaletteProvider` / `useCommandPalette` | `command-palette.tsx` | Ctrl/⌘+K global mockado |
| `EmptyState` | `empty-state.tsx` | Estado vazio padrão |
| `StatusPill` | `status-pill.tsx` | Pill semântica por estado |
| `SkeletonLine` / `SkeletonCard` / `SkeletonList` | `skeletons.tsx` | Placeholders shimmer |

## `components/theme/`

| Componente | Arquivo | Descrição |
|---|---|---|
| `ThemeProvider` | `theme-provider.tsx` | `next-themes` |
| `ThemeToggle` | `theme-toggle.tsx` | Toggle light/dark |

## Utilitários

- `lib/utils.ts` — `cn()`.
- `mocks/data.ts` — agora exporta também: `clientDetails`, `getClientById`, `equipmentDetails`, `getEquipmentById` e tipos `ClientDetail`, `ClientServiceRow`, `ClientEquipmentRow`, `ClientContact`, `EquipmentDetail`, `EquipmentHistoryRow`.
