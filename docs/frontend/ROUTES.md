# ROUTES — Sprint 3.0

Dois apps no mesmo runtime Next, separados por pathname. A sessão é escolhida por `app/app-providers.tsx` (platform vs operator). Detalhes em `docs/frontend/ARCHITECTURE.md`.

## Root

`app/layout.tsx` — html/body + `ThemeProvider` + `AppProviders` (seleciona o AuthProvider escopado pelo pathname).

## Platform (gestão · desktop-first)

| Path | Arquivo | Sessão |
|---|---|---|
| `/login` | `app/login/page.tsx` → `LoginScreen variant="platform"` | platform |
| `/trocar-senha` | `app/trocar-senha/page.tsx` | platform |
| `/` e demais | `app/(platform)/…` (shell autenticado: sidebar + topbar) | platform |

Rotas do shell (inalteradas): `/`, `/agenda`, `/servicos`, `/ordens` (+`/[id]`), `/clientes` (+`/[id]`), `/equipamentos` (+`/[id]`), `/produtos` (+`/[id]`), `/financial`, `/usuarios`, `/profile`, `/settings`, `/reports` (+`/visita`). Layout: `app/(platform)/layout.tsx` (`RequireAuth` scope platform).

## Operator (campo · mobile-first)

| Path | Arquivo | Sessão |
|---|---|---|
| `/operator/login` | `app/operator/login/page.tsx` → `LoginScreen variant="operator"` | operator |
| `/operator/trocar-senha` | `app/operator/trocar-senha/page.tsx` | operator |
| `/operator` | `app/operator/(shell)/page.tsx` | operator |
| `/operator/services` (+`/[id]`) | `app/operator/(shell)/services/…` | operator |
| `/operator/qr` | `app/operator/(shell)/qr/page.tsx` | operator |
| `/operator/documents` | `app/operator/(shell)/documents/page.tsx` | operator |
| `/operator/profile` | `app/operator/(shell)/profile/page.tsx` | operator |

Layouts: `app/operator/layout.tsx` (container mínimo público) + `app/operator/(shell)/layout.tsx` (`RequireAuth` scope operator + `OperatorShell`). O route group `(shell)` não altera as URLs.

## Notas

- `/login` e `/operator/login` mantêm sessões independentes (escopos de token distintos).
- O mesmo usuário pode autenticar nos dois apps; nenhum estado é compartilhado.
- Em produção: `erp.empresa.com.br` → Platform, `operator.empresa.com.br` → Operator, ambos consumindo `api.empresa.com.br`.
