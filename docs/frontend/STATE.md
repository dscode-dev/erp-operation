# STATE — Sprint 3.0 (Operator Mobile Foundation)

Status: Concluída ✅ — **refatoração arquitetural** (sem novas funcionalidades). Next.js 15 · App Router · RSC.

## Objetivo

Separar fisicamente **Platform** (gestão) e **Operator** (campo) em dois produtos independentes que compartilham apenas backend, Design System e pacotes comuns. Ver `docs/frontend/ARCHITECTURE.md`.

## O que mudou

### Estrutura (separação física)

- `packages/` — compartilhado: `types` (`@erp/types`), `api` (`@erp/api`), `utils` (`@erp/utils`), `ui` (`@erp/ui/*`, inclui `auth/*`, `documents/*`, `theme/*`).
- `apps/platform/` — componentes/utilitários exclusivos da Platform.
- `apps/operator/` — componentes + `shell/operator-shell.tsx` exclusivos do Operator.
- `app/` — apenas route shells finos do Next App Router.
- Aliases novos: `@erp/types`, `@erp/api`, `@erp/utils`, `@erp/ui/*`, `@platform/*`, `@operator/*`. Todos os imports `@/lib`/`@/components` foram migrados.
- Removidas as pastas antigas `lib/`, `components/`, `hooks/` (conteúdo movido).

### Autenticação isolada

- Tokens **scope-aware** (`erp.platform.*` vs `erp.operator.*`) — sessões nunca compartilhadas.
- `AppProviders` escolhe o `AuthProvider` (scope `platform`/`operator`) pelo pathname.
- Telas compartilhadas `LoginScreen`/`ChangePasswordScreen` com `variant` por app.
- `RequireAuth` deriva login/troca do escopo (`/login` vs `/operator/login`).

### Layouts independentes

- Platform: mantém sidebar + topbar (sem mudança significativa).
- Operator: novo `OperatorShell` com identidade de app de campo (brand bar + bottom nav), sob route group `app/operator/(shell)/`. `app/operator/login` e `app/operator/trocar-senha` são públicos.

### RBAC

Continua 100% do backend (`/users/me`); `<Gate>` + sidebar apenas ocultam. Sem regras locais.

## DoD

- Platform e Operator separados arquiteturalmente ✅
- Autenticação isolada (sessões/escopos distintos) ✅
- Layouts independentes ✅
- Componentes compartilhados organizados em `packages/` ✅
- API Layer única (`@erp/api`) ✅
- `ARCHITECTURE.md` criado ✅
- Build íntegro: `tsc` limpo (exceto `routes/`, preview TanStack legado não relacionado) ✅
- Nenhum módulo da Platform quebrado (rotas/imports preservados) ✅

## Fora de escopo (Sprint 3)

Novos formulários/módulos operacionais, geração de documentos, agenda funcional, OS, orçamento, PMOC, laudo, recibo.
