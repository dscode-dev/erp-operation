# ROUTES — Sprint 0.A

Rota raiz `/` abre a **Plataforma**. Não existe tela de seleção de ambiente.

## Plataforma (desktop-first) — route group `(platform)`

| Path | Arquivo | Descrição |
|---|---|---|
| `/` | `src/app/(platform)/page.tsx` | Dashboard operacional (saudação + Hoje + Serviços + Atividade + Agenda + Equipe + Alertas) |
| `/servicos` | `src/app/(platform)/servicos/page.tsx` | Lista completa de atendimentos do dia |
| `/clientes` | `src/app/(platform)/clientes/page.tsx` | Carteira de clientes |
| `/clientes/[id]` | `src/app/(platform)/clientes/[id]/page.tsx` | Detalhe do cliente |
| `/equipamentos` | `src/app/(platform)/equipamentos/page.tsx` | Inventário de equipamentos |
| `/equipamentos/[id]` | `src/app/(platform)/equipamentos/[id]/page.tsx` | Detalhe do equipamento |
| `/agenda` | `src/app/(platform)/agenda/page.tsx` | Agenda semanal estilo Google Calendar (grade horária + sidebar de próximos) |
| `/ordens` | `src/app/(platform)/ordens/page.tsx` | **NOVO** — Ordens de Serviço: indicadores, filtros e tabela completa (nº, tipo, SLA, valor, status) |
| `/ordens/[id]` | `src/app/(platform)/ordens/[id]/page.tsx` | **NOVO** — Detalhe da OS: resumo, checklist com progresso, itens/mão de obra, linha do tempo e anexos |
| `/financial` | `src/app/(platform)/financial/page.tsx` | **NOVO** — Dashboard financeiro (mockado) com indicadores, gráfico SVG, recebíveis e despesas |

Layout: `src/app/(platform)/layout.tsx` — Sidebar agrupada (Operação · Cadastros · Gestão · Sistema) + Topbar.

> Placeholders na sidebar (badge "em breve", sem rota ainda): Produtos, Serviços, Relatórios, Usuários, Configurações, Perfil.

## Operador (mobile-first)

| Path | Arquivo | Descrição |
|---|---|---|
| `/operator` | `src/app/operator/page.tsx` | Home (próximo atendimento + ações rápidas) |
| `/operator/services` | `src/app/operator/services/page.tsx` | Fila de atendimentos |
| `/operator/services/[id]` | `src/app/operator/services/[id]/page.tsx` | Detalhe do atendimento |
| `/operator/documents` | `src/app/operator/documents/page.tsx` | Documentos |
| `/operator/profile` | `src/app/operator/profile/page.tsx` | Perfil |

Layout: `src/app/operator/layout.tsx` — Container centralizado `max-w-[640px]` + `OperatorBottomNav`.

## Root

`src/app/layout.tsx` — html/body, `ThemeProvider`, `CommandPaletteProvider` (Ctrl/⌘+K em qualquer rota).
