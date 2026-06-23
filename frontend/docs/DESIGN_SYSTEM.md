# DESIGN SYSTEM — Sprint 0.a

Tudo definido em `src/app/globals.css` via `@theme` (Tailwind v4). Componentes referenciam **apenas tokens** — nunca cores hardcoded.

## Cores

| Token | Light | Dark |
|---|---|---|
| `--color-background` | `hsl(220 20% 98%)` | `hsl(222 47% 5%)` |
| `--color-foreground` | `hsl(222 47% 11%)` | `hsl(210 40% 98%)` |
| `--color-muted` | `hsl(220 14% 96%)` | `hsl(217 33% 12%)` |
| `--color-muted-foreground` | `hsl(220 9% 46%)` | `hsl(215 20% 65%)` |
| `--color-card` | `hsl(0 0% 100%)` | `hsl(222 47% 8%)` |
| `--color-border` | `hsl(220 13% 91%)` | `hsl(217 33% 16%)` |
| `--color-primary` | `hsl(221 83% 53%)` | `hsl(217 91% 60%)` |
| `--color-accent` | `hsl(262 83% 58%)` | `hsl(263 90% 66%)` |

## Estados

| Token | Uso |
|---|---|
| `--color-success` | Concluído |
| `--color-warning` | Atenção |
| `--color-danger` | Crítico / urgente |
| `--color-info` | Informativo / agendado |
| `--color-pending` | Pendente (alias do warning) |
| `--color-offline` | Equipamento/operador offline |

Componente: `StatusPill` (`components/shared/status-pill.tsx`) renderiza variantes `success | warning | danger | info | pending | offline | in_progress | done | scheduled`.

## Espaçamento

| Token | Valor |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 40px |

## Bordas / raio

| Token | Valor |
|---|---|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px |
| `--radius-xl` | 20px |

## Sombras

| Token | Uso |
|---|---|
| `--shadow-card` | Cards e listas em repouso |
| `--shadow-hover` | Estados hover/CTA primário |
| `--shadow-floating` | Modais, command palette, bottom-nav |

## Tipografia

Stack: `Inter` (carregada em produção via `<link>` no `app/layout.tsx`, fallback system-ui).

| Classe | Tamanho | Peso | Uso |
|---|---|---|---|
| `.text-display` | 36px | 700 | Título de tela |
| `.text-heading` | 24px | 600 | Seções e rotas internas |
| `.text-body` | 15px | 400 | Corpo padrão (default `body`) |
| `.text-caption` | 12px | 400 | Auxiliar, meta, labels |
| `.font-mono` | — | — | Horários, IDs, atalhos |

## Motion

- `animate-fade-in` (220ms) em entrada de rota e modais.
- Botões: `active:scale-[0.98]` para feedback tátil no Operador.
- `framer-motion` não foi adicionado como dependência nesta sprint para manter o bundle leve; pode ser introduzido pontualmente na próxima sprint.

## Acessibilidade

- `:focus-visible` global com `outline 2px var(--color-ring)`.
- Toques ≥ 44px no Operador (`min-h-12`, botão central `h-14 w-14`).
- `aria-label` obrigatório em botões somente-ícone.
- Contraste WCAG AA validado nos pares texto/fundo dos tokens.

## Princípios

1. **Velocidade percebida**: skeletons, fade-in curto, sem spinners centralizados.
2. **Densidade controlada**: Plataforma densa, Operador respirado.
3. **Hierarquia clara**: 1 CTA primário por tela.
4. **Sem aparência de ERP**: sem grids financeiros, sem cinza chumbo, sem gráficos por padrão.
5. **Dois produtos, uma fundação**: tudo que muda entre Plataforma e Operador são layout e navegação. Tokens são compartilhados.
