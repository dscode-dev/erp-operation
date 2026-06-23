# ROUTES — Sprint 1.b

Rota raiz `/` abre a **Plataforma**. Não existe tela de seleção de ambiente.

## Plataforma (desktop-first) — route group `(platform)`

| Path | Arquivo | Descrição |
|---|---|---|
| `/` | `src/app/(platform)/page.tsx` | Dashboard operacional (home) |
| `/servicos` | `src/app/(platform)/servicos/page.tsx` | Lista completa de atendimentos do dia |
| `/clientes` | `src/app/(platform)/clientes/page.tsx` | Carteira de clientes |
| `/clientes/[id]` | `src/app/(platform)/clientes/[id]/page.tsx` | Detalhe do cliente (dados, contatos, atendimentos, equipamentos) |
| `/equipamentos` | `src/app/(platform)/equipamentos/page.tsx` | Inventário de equipamentos |
| `/equipamentos/[id]` | `src/app/(platform)/equipamentos/[id]/page.tsx` | Detalhe do equipamento (identificação, specs, histórico) |
| `/agenda` | `src/app/(platform)/agenda/page.tsx` | Visão semanal (kanban de 7 colunas) |

Layout: `src/app/(platform)/layout.tsx` — Sidebar colapsável + Topbar (busca global, notificações, seletor de empresa, menu do usuário).

As linhas das tabelas `/clientes` e `/equipamentos` agora são clicáveis e navegam para o detalhe via prop `rowHref` do `DataTable`.

> Pendente para próxima sprint: `/configuracoes`, formulário "Novo serviço", middleware de subdomínios.

## Operador (mobile-first)

| Path | Arquivo | Descrição |
|---|---|---|
| `/operator` | `src/app/operator/page.tsx` | Home (próximo atendimento + ações rápidas) |
| `/operator/services` | `src/app/operator/services/page.tsx` | Fila de atendimentos |
| `/operator/services/[id]` | `src/app/operator/services/[id]/page.tsx` | Detalhe do atendimento (checklist, cliente, equipamento, CTA) |
| `/operator/documents` | `src/app/operator/documents/page.tsx` | Documentos |
| `/operator/profile` | `src/app/operator/profile/page.tsx` | Perfil |

Layout: `src/app/operator/layout.tsx` — Container centralizado `max-w-[640px]` + `OperatorBottomNav`.

## Root

`src/app/layout.tsx` — html/body, `ThemeProvider`, `CommandPaletteProvider` (Ctrl/⌘+K em qualquer rota).
