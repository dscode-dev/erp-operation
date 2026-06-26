# ROUTES — Sprint 2

`/` abre a **Plataforma** (protegida por `RequireAuth`). Não autenticado → `/login`; senha temporária → `/trocar-senha`.

## Autenticação (root layout, sem shell)

| Path | Arquivo | Descrição |
|---|---|---|
| `/login` | `app/login/page.tsx` | Login (`POST /auth/login` → `GET /users/me`) |
| `/trocar-senha` | `app/trocar-senha/page.tsx` | Troca obrigatória de senha |

## Plataforma — route group `(platform)`

| Path | Arquivo | Backend | Novo na Sprint 2 |
|---|---|---|---|
| `/` | `app/(platform)/page.tsx` | stats + users + customers + finance | widgets |
| `/agenda` | `agenda/page.tsx` | Demo schedule | — |
| `/servicos` | `servicos/page.tsx` | Demo schedule + ServiceDetailDrawer | drawer |
| `/ordens` (+`/[id]`) | `ordens/...` | — (coming-soon) | — |
| `/clientes` (+`/[id]`) | `clientes/...` | `/customers` | drawer padronizado |
| `/equipamentos` (+`/[id]`) | `equipamentos/...` | `/equipments` | drawer padronizado |
| `/produtos` (+`/[id]`) | `produtos/...` | — (coming-soon) | — |
| `/financial` | `financial/page.tsx` | Demo finance | — |
| `/usuarios` | `usuarios/page.tsx` | `/users` CRUD + avatar | **NOVO** |
| `/profile` | `profile/page.tsx` | `/users/me`, preferences, avatar, change-password | **NOVO** |
| `/settings` | `settings/page.tsx` | organization, settings, templates, assets | **NOVO** |
| `/reports` | `reports/page.tsx` | categorias (arquitetura) | **NOVO** |
| `/reports/visita` | `reports/visita/page.tsx` | clientes/equipments/users reais (fluxo visual) | **NOVO** |

Sidebar (filtrada por RBAC): Operação · Cadastros · Gestão (Relatórios `canReports`, Financeiro `canFinancial`, Usuários OWNER/MANAGER/VIEWER) · Sistema (Configurações OWNER/MANAGER, Perfil).

## Operador (mobile-first) — `RequireAuth`

| Path | Arquivo |
|---|---|
| `/operator` · `/operator/services` · `/operator/services/[id]` · `/operator/qr` · `/operator/documents` · `/operator/profile` | `app/operator/...` |

Estável desde a Sprint 1; consome `/users/me` + Demo Dataset.

## Root

`app/layout.tsx` — `ThemeProvider` › `AuthProvider` › `CommandPaletteProvider`.
