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

## Subdomínios / deploy futuro

Promoção a monorepo real: mover `app/(platform)+login+trocar-senha` para
`apps/platform` (Next app) e `app/operator/*` para `apps/operator` (Next app),
mantendo `packages/*` como workspaces. Como nenhum produto importa o outro e
todo compartilhamento passa por `@erp/*`, a divisão é mecânica.
