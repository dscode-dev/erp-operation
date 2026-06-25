# DESIGN SYSTEM — Sprint 0.A

Definido em `src/app/globals.css` via `@theme` (Tailwind v4). Componentes referenciam **apenas tokens** — nunca cores hardcoded.

## Princípios visuais

1. **Hierarquia antes de tamanho** — eyebrows discretos (11px, uppercase, tracking 0.1em), títulos compactos (28px no máximo).
2. **Densidade controlada** — Plataforma respira com `gap-6`/`p-3.5`; Operador é mais espaçoso (`gap-2.5`, toques ≥ 44px).
3. **Cor é função, não decoração** — primary só em CTA/ativos; success/warning/danger só sinalizam estado; tipos de evento têm tokens próprios.
4. **Profundidade discreta** — `shadow-card` em repouso, `shadow-hover` ao hover; cards podem subir com `-translate-y-0.5`.
5. **Mock-first** — toda animação é cosmética; nenhuma persistência.

## Cores semânticas

| Token | Light | Dark |
|---|---|---|
| `--color-background` | `hsl(220 24% 98%)` | `hsl(222 47% 5%)` |
| `--color-foreground` | `hsl(222 47% 11%)` | `hsl(210 40% 98%)` |
| `--color-surface` | `hsl(220 24% 99%)` | `hsl(222 47% 6%)` |
| `--color-card` | `hsl(0 0% 100%)` | `hsl(222 47% 8%)` |
| `--color-muted` | `hsl(220 14% 96%)` | `hsl(217 33% 12%)` |
| `--color-muted-foreground` | `hsl(220 9% 46%)` | `hsl(215 20% 65%)` |
| `--color-border` | `hsl(220 13% 91%)` | `hsl(217 33% 16%)` |
| `--color-primary` | `hsl(221 83% 53%)` | `hsl(217 91% 60%)` |
| `--color-primary-soft` | `primary @ 10%` | `primary @ 15%` |
| `--color-accent` | `hsl(262 83% 58%)` | `hsl(263 90% 66%)` |

## Estados operacionais

| Token | Uso |
|---|---|
| `--color-success` | Concluído |
| `--color-warning` / `--color-pending` | Atenção / pendente |
| `--color-danger` | Crítico / urgente / atrasado |
| `--color-info` | Informativo / agendado |
| `--color-offline` | Equipamento/operador offline |

## Tipos de evento da agenda

| Token | Uso |
|---|---|
| `--color-event-atendimento` | azul `hsl(221 83% 53%)` |
| `--color-event-manutencao` | verde-azulado `hsl(160 70% 40%)` |
| `--color-event-visita` | violeta `hsl(262 83% 58%)` |
| `--color-event-urgencia` | vermelho `hsl(0 84% 60%)` |

## Espaçamento (Plataforma vs Operador)

| Contexto | Padrão |
|---|---|
| Página plataforma | `p-6 lg:p-8`, seções `gap-6`/`gap-8`, cards `p-4`, linhas `py-3.5` |
| Card métrica | `p-4`, valor `22px`, label `11px uppercase` |
| Página operador | `px-4`, seções `gap-6`, ações rápidas `min-h-[88px]` |
| Toques operador | mínimo 44px; botão central QR 56px |

## Raios

| Token | Valor |
|---|---|
| `--radius-sm` | 6px |
| `--radius-md` | 10px (default) |
| `--radius-lg` | 14px |
| `--radius-xl` | 20px |

## Sombras

| Token | Uso |
|---|---|
| `--shadow-card` | repouso |
| `--shadow-hover` | hover / CTA primário |
| `--shadow-floating` | modais, sheets, command palette |

## Tipografia

Stack: `Inter` (carregada em produção via `<link>` no `app/layout.tsx`).

| Classe | Tamanho | Peso | Uso |
|---|---|---|---|
| `.text-page-title` | 28px | 600 | Título da página (era 36px na 0.a) |
| `.text-section-title` | 20px | 600 | Título de seção/módulo |
| `.text-card-title` | 16px | 600 | Título de card |
| `.text-body` | 14px | 400 | Corpo (default) |
| `.text-caption` | 12px | 400 | Meta, eyebrows, labels |
| `.font-mono` | — | — | Horários, IDs, atalhos |

Aliases legados (`.text-display`, `.text-heading`) preservados como sinônimos das classes novas.

## Motion

- `animate-fade-in` (220ms) em entrada de rota.
- `animate-slide-up` (260ms cubic-bezier) para sheets/modais.
- Cards interativos: `hover:-translate-y-0.5` + `hover:shadow-hover`.
- Botões do Operador: `active:scale-[0.98]`.

## Acessibilidade

- `:focus-visible` global com `outline 2px var(--color-ring)`.
- Toques ≥ 44px no Operador, ≥ 36px na Plataforma.
- `aria-label` obrigatório em botões somente-ícone.
- Contraste WCAG AA validado em todos pares.

## Organização da navegação (Plataforma)

Sidebar agrupada em 4 categorias com header recolhível:
- **Operação** — Dashboard, Agenda, Atendimentos, Ordens de Serviço.
- **Cadastros** — Clientes, Equipamentos, Produtos, Serviços.
- **Gestão** — Relatórios, Financeiro, Usuários.
- **Sistema** — Configurações, Perfil.

Item ativo: barra lateral 2px `primary` + fundo `primary/10` + texto `primary` 500.
Item inativo: muted-foreground; hover sobe contraste e ganha fundo `muted`.
Recolhida (`68px`): mostra ícones + tooltip nativo via `title`, separadores horizontais entre grupos.
