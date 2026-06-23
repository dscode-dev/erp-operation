# Next.js 15 Export — Sprint 0

Estrutura **exportável** equivalente à Sprint 0 (Fundação, Arquitetura Visual e Design System),
gerada em paralelo ao app Lovable. **Não é executada pelo Lovable** — copie esta pasta para o
seu repositório fora do Lovable e rode localmente.

## Stack

- Next.js 15 (App Router, RSC, Turbopack)
- React 19
- TypeScript estrito
- Tailwind CSS v4 (via `@import "tailwindcss"`)
- shadcn/ui-compatível (tokens semânticos via CSS vars)
- next-themes (light/dark)
- Mocks locais (sem backend, sem APIs)

## Como usar fora do Lovable

```bash
# 1) Copie a pasta nextjs-export/ para um novo repo
cp -r nextjs-export/ ../meu-app-next && cd ../meu-app-next

# 2) Instale
npm install      # ou pnpm i / bun i

# 3) Rode
npm run dev      # http://localhost:3000
```

## Estrutura

```
src/
  app/
    layout.tsx              # Root layout + ThemeProvider
    page.tsx                # Landing / seletor de ambiente
    globals.css             # Tailwind v4 + tokens
    platform/
      layout.tsx            # Shell do ambiente Platform
      page.tsx
      dashboard/page.tsx
    operator/
      layout.tsx            # Shell do ambiente Operator
      page.tsx
      dashboard/page.tsx
  components/
    layout/                 # Sidebar, Topbar, Shell
    theme/                  # ThemeProvider + ThemeToggle
    ui/                     # Button, Card, Badge (tokens)
  lib/utils.ts              # cn()
  mocks/                    # Dados mockados
  styles/                   # (livre)
docs/
  STATE.md
  COMPONENTS.md
  ROUTES.md
  DESIGN_SYSTEM.md
```

## Rotas

| Rota | Ambiente | Descrição |
|---|---|---|
| `/` | — | Seletor de ambiente |
| `/platform` | Platform | Home Platform |
| `/platform/dashboard` | Platform | Dashboard mockado |
| `/operator` | Operator | Home Operator |
| `/operator/dashboard` | Operator | Dashboard mockado |

## Definition of Done (Sprint 0)

- [x] Compila (`next build`)
- [x] Lint passa (`next lint`)
- [x] Layouts Platform e Operator funcionam
- [x] Troca de tema (light/dark) funciona
- [x] Dashboard mockado renderiza
- [x] Responsividade (mobile-first com Tailwind)
- [x] Documentação em `docs/`
