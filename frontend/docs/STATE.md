# STATE — Sprint 1.b

Status: Concluída ✅ (Next.js 15, exportável)

## Mudanças em relação à Sprint 1

- **Drill-down de Cliente**: `/clientes/[id]` com breadcrumbs, métricas, dados cadastrais, contatos, notas operacionais, lista de atendimentos recentes e equipamentos do cliente.
- **Drill-down de Equipamento**: `/equipamentos/[id]` com identificação (tag, fabricante, modelo, série), métricas (status, manutenções, garantia), especificações técnicas, localização e histórico de manutenções.
- **Linhas clicáveis** em `/clientes` e `/equipamentos`: `DataTable` recebeu prop `rowHref?: (row) => string` que envolve cada célula em `<Link>` mantendo SSR puro.
- Novos componentes compartilhados: `Breadcrumbs`, `InfoCard`, `InfoRow`.
- `PageHeader` agora aceita `ReactNode` para `eyebrow` e `description`.
- Mocks expandidos: `clientDetails`, `equipmentDetails`, `getClientById`, `getEquipmentById`, com tipos `ClientDetail`, `ClientServiceRow`, `ClientEquipmentRow`, `ClientContact`, `EquipmentDetail`, `EquipmentHistoryRow`.

## Arquitetura de produto

| Ambiente | Local | Produção |
|---|---|---|
| Plataforma (OWNER / MANAGER, desktop-first) | `localhost:3000/` | `empresa.com.br` |
| Operador (OPERATOR, mobile-first) | `localhost:3000/operator` | `operator.empresa.com.br` |

## Decisões de UX

- Drill-down segue padrão de duas colunas: principal (2/3) com listas operacionais (atendimentos, equipamentos, histórico, specs) e lateral (1/3) com dados cadastrais, contatos e notas.
- Breadcrumbs discretas no topo, abaixo do shell, usando `text-caption` para preservar a hierarquia do `PageHeader`.
- Métricas dos detalhes priorizam contexto operacional: em aberto, equipamentos, última visita, SLA (cliente) — status, última/próxima manutenção, garantia (equipamento).
- Linhas das tabelas inteiras viraram alvo de clique (área grande), mantendo navegação `Link` semântica sem `useRouter`.
- Detalhes são server components puros (`async` + `params: Promise`) — `notFound()` para IDs inexistentes.

## Fora de escopo

Backend, persistência, formulários de criação, edição, autenticação, QR real, integração com mapas/telefone (links `tel:`/`mailto:` mockados).

## Próxima sprint (sugestões)

- Middleware Next.js para rewrite por subdomínio (`operator.*` → `/operator`).
- Formulário "Novo serviço" como sheet/modal mockado, acessível dos detalhes de cliente e equipamento.
- Filtros funcionais com URL `searchParams`.
- Página `/configuracoes` (equipe, contratos, integrações).
- `framer-motion` em transições de rota e sheet do QR.
