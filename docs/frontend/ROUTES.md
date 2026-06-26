# ROUTES — Sprint 3

Dois apps no mesmo runtime Next, separados por pathname (`app/app-providers.tsx`). Ver `ARCHITECTURE.md`.

## Platform (gestão · desktop-first)

`/login`, `/trocar-senha` (escopo platform) + shell autenticado em `app/(platform)/…`:
`/`, `/agenda`, `/servicos`, `/ordens`, `/clientes` (+`/[id]`), `/equipamentos` (+`/[id]`), `/produtos`, `/financial`, `/usuarios`, `/profile`, `/settings`, `/reports` (+`/visita`), `/documentos` (**novo** — visibilidade demo de documentos), `/demo-ready` (**novo** — modo apresentação). Sprint 4: Ordens e Produtos passam a consumir o Demo Dataset (`demo.orders.v1`/`demo.products.v1`).

## Operator (campo · mobile-first)

Sessão escopo `operator`. Três zonas sob `app/operator/`:

| Zona | Layout | Rotas |
|---|---|---|
| Público | `operator/layout.tsx` (mínimo) | `/operator/login`, `/operator/trocar-senha` |
| Shell (nav inferior) | `operator/(shell)/layout.tsx` (`RequireAuth` + `OperatorShell`) | `/operator` (Home), `/operator/agenda`, `/operator/services` (+`/[id]`), `/operator/clientes` (+`/[id]`), `/operator/equipamentos` (+`/[id]`), `/operator/qr`, `/operator/documents`, `/operator/sync`, `/operator/profile` |
| Full-screen | `operator/(full)/layout.tsx` (`RequireAuth`, sem nav) | `/operator/atendimento` (Wizard) |

Navegação inferior: Início · Agenda · Atendimentos · Clientes · Perfil.

### Wizard de atendimento (`/operator/atendimento`)

10 etapas: Cliente → Endereço → Equipamento → Tipo → Checklist → Observações → Fotos → Assinatura → Resumo → Enviar (sucesso). Full-screen, fora do shell (sem bottom nav).

## PWA

`app/manifest.ts` gera `/manifest.webmanifest` (app instalável = Operator, `start_url`/`scope` `/operator`). Instalação via Perfil do operador (`@erp/ui/pwa/install-button`).

## Produção (deploy futuro)

`erp.empresa.com.br` → Platform · `operator.empresa.com.br` → Operator · ambos consomem `api.empresa.com.br`.
