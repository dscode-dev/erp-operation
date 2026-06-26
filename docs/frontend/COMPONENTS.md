# COMPONENTS — Sprint 3.0

Componentes agora vivem em **pacotes compartilhados** (`packages/*`) ou em
**apps** (`apps/platform`, `apps/operator`). Ver `docs/frontend/ARCHITECTURE.md`.

## Compartilhado — `@erp/*`

### `@erp/types` (`packages/types`)
Contratos da API (`index.ts`) e de documentos (`documents.ts`: `GeneratedDocument`, `DocumentKind`, `DocumentStatus`, `DOCUMENT_KIND_LABEL`, `toDataUrl`).

### `@erp/api` (`packages/api`)
Cliente HTTP único + `tokens` (scope-aware: `setSessionScope`/`getSessionScope`), domínios (`authApi`, `usersApi`, `organizationApi`, `customersApi`, `equipmentsApi`, `dashboardApi`, `financialApi`, `demoApi`) e `useQuery`.

### `@erp/utils` (`packages/utils`)
`cn`, `format` (datas/moeda/máscaras/iniciais), `export` (CSV), `useDebounce`.

### `@erp/ui` (`packages/ui`) — Design System
| Grupo | Itens |
|---|---|
| Primitivos | `status-pill`, `status-chip`, `skeletons`, `empty-state`, `empty-illustration`, `states` (AsyncBoundary/Error/ComingSoon), `drawer`, `drawer-tabs`, `confirm-dialog`, `search-input`, `filter-bar`, `section-card`, `metric-card` |
| `auth/*` | `auth-provider` (scope-aware), `gate`, `require-auth`, `login-screen`, `change-password-screen` |
| `documents/*` | `document-preview`, `document-download`, `document-viewer`, `signature-pad` |
| `theme/*` | `theme-provider`, `theme-toggle` |
| `base/*` | `badge`, `card` |

> Componentes novos da sprint: `LoginScreen`, `ChangePasswordScreen` (auth compartilhada com `variant`).

## Platform — `@platform/*` (`apps/platform`)

`components/*`: `sidebar`, `topbar`, `page-header`, `data-table`, `pagination`, `export-button`, `command-palette`, drawers de entidade (`customer-*`, `equipment-detail-drawer`, `user-*`, `service-detail-drawer`), `new-service-*`, `qr-foundation`, `dashboard-section`, `greeting-header`, `team-status-list`, `info-card`, `breadcrumbs`, `revenue-chart`, `activity-feed`, `alert-card`. Utilitários de domínio: `equipment-display.ts`, `user-display.ts`.

## Operator — `@operator/*` (`apps/operator`)

`shell/operator-shell.tsx` (**novo** — chrome de app de campo: brand bar + bottom nav). `components/*`: `bottom-nav`, `operator-header`, `quick-action`, `service-card`, `schedule-card`.

## App shells (`app/`)

`app-providers.tsx` (**novo** — seleciona sessão por pathname), `layout.tsx` (ThemeProvider + AppProviders). Páginas de auth: `login`, `trocar-senha` (platform), `operator/login`, `operator/trocar-senha` (operator).

## Regras

- Componentes consomem dados via `@erp/api`; nunca `fetch` direto, nunca mocks.
- Sessões isoladas por app (escopo de token); RBAC sempre do backend (`<Gate>` apenas oculta).
- `packages/*` nunca importa `apps/*`; `apps/platform` e `apps/operator` nunca se importam.
- Layouts completos não são compartilhados; apenas o Design System.
