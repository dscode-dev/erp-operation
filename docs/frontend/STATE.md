# STATE — Sprint 0.A

Status: Concluída ✅ (Next.js 15, exportável, totalmente mockado)

## Foco da sprint

Elevar a qualidade visual, organização e UX da Plataforma e do Operador, **sem criar funcionalidades novas**. Toda a fundação técnica das sprints anteriores foi preservada.

## Principais mudanças

### Sidebar (reorganizada em grupos)
- **Operação**: Dashboard, Agenda, Atendimentos, Ordens de Serviço (em breve).
- **Cadastros**: Clientes, Equipamentos, Produtos (em breve), Serviços (em breve).
- **Gestão**: Relatórios (em breve), Financeiro, Usuários (em breve).
- **Sistema**: Configurações (em breve), Perfil (em breve).
- Grupos recolhíveis com indicador, item ativo com barra lateral e fundo `primary/10`, tooltips quando colapsada, badge "em breve" para placeholders.

### Dashboard operacional (`/`)
- Remoção do título grande "Bom dia, Equipe!".
- Novo `GreetingHeader`: **"Olá, Darlan."** + data ("Segunda-feira, 22 de junho") + contador de pendências.
- Métricas reduzidas em altura e com pill de tendência (`MetricCard` reprojetado).
- Seções: **Hoje**, **Serviços do dia + Atividade**, **Próximos compromissos + Equipe + Alertas**.
- Novos componentes: `AlertCard`, `TeamStatusList`.

### Financeiro (`/financial`) — NOVO
- 4 indicadores (receita, despesa, lucro, previsão).
- Gráfico `RevenueChart` (SVG puro, sem dependências, 6 meses).
- Despesas por categoria + tabela de recebíveis + cards de tendência.
- Totalmente mockado.

### Agenda (`/agenda`) — reprojetada
- Layout estilo Google/Notion Calendar: grade horária 07h–18h × 7 dias com eventos posicionados por minuto.
- Coluna lateral fixa: **Próximos eventos** + legenda de tipos.
- Eventos coloridos por tipo (`atendimento`, `manutencao`, `visita`, `urgencia`) usando tokens `--color-event-*`.
- Toggle Dia/Semana/Mês (visual) e navegador de semana.

### Operador
- `OperatorHeader` discreto ("Olá, Ana." + data, sem saudação grande).
- `QuickAction` agora é gradient, maior (≥88px), com 3 tons (`primary`, `accent`, `success`).
- Hero do próximo atendimento com gradiente em 3 paradas, blur orgânico, endereço inline e botão de ligação.

### Topbar / Tipografia / Tokens
- Hierarquia tipográfica refinada: `text-page-title` 28px, `text-section-title` 20px, `text-card-title` 16px, body 14px.
- Aliases legados (`text-display`, `text-heading`) preservados.
- Novos tokens: `--color-event-*`, `--color-primary-soft`, `--color-surface`.
- Scrollbar discreta global, sombras suavizadas.

## Arquitetura de produto (mantida)

| Ambiente | Local | Produção |
|---|---|---|
| Plataforma (OWNER / MANAGER, desktop-first) | `localhost:3000/` | `empresa.com.br` |
| Operador (OPERATOR, mobile-first) | `localhost:3000/operator` | `operator.empresa.com.br` |

## Princípios de UX consolidados

1. **Hierarquia antes de tamanho** — títulos menores, eyebrows e ações claras.
2. **Densidade controlada** — Plataforma densa porém respirada (gap-6, padding-3.5).
3. **Cor com função** — verde/âmbar/vermelho só sinalizam estado; primário só em ações ativas/CTA.
4. **Cartões com hover** — `-translate-y-0.5` + `shadow-hover` indica clicabilidade.
5. **Mock-first** — toda interação é visual; não há persistência.

## Fora de escopo

Backend, persistência, autenticação, formulários funcionais, QR real, integração com mapas.

## Arquivos para sincronização (preview Lovable)

Espelhar do `nextjs-export/` para o app TanStack se quiser pré-visualização local:
- `src/app/(platform)/page.tsx`
- `src/app/(platform)/agenda/page.tsx`
- `src/app/(platform)/financial/page.tsx`
- `src/app/globals.css`
- `src/components/platform/*` (sidebar, page-header, metric-card, greeting-header, alert-card, team-status-list, revenue-chart, dashboard-section)
- `src/components/operator/*` (quick-action, operator-header)
- `src/mocks/data.ts`

## Próxima sprint (Sprint 0.B — sugestões)

- Skeletons completos para dashboard, agenda e listas (estrutura existe em `components/shared/skeletons.tsx`, falta aplicar).
- Empty states ilustrados em cada lista.
- Detalhe de evento da agenda (sheet lateral mockado).
- Página `/configuracoes` (perfil, equipe, contratos).
- `framer-motion` em entradas de rota e sheets.
- Drag-and-drop visual de eventos na agenda.
