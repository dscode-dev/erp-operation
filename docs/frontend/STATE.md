# STATE — Sprint 2

Status: Concluída ✅ — **Plataforma Administrativa consolidada** (Next.js 15 · App Router · RSC). Continuação direta da Sprint 1 (backend real como fonte única; sem novos mocks).

## Foco da sprint

Entregar módulos administrativos realmente utilizáveis por OWNER/MANAGER, priorizando produtividade (drawers, wizards, cards, estados) em vez de CRUD genérico. Tudo consome **API real** ou **Demo Dataset**.

## Módulos entregues

| Módulo | Rota | Backend | Acesso |
|---|---|---|---|
| Usuários | `/usuarios` | `/users` CRUD + avatar | OWNER edita · MANAGER/VIEWER leem |
| Perfil | `/profile` | `/users/me`, preferences, avatar, change-password | todos |
| Configurações | `/settings` | organization, settings, templates, assets | OWNER edita · MANAGER lê |
| Serviços (Atendimentos) | `/servicos` | Demo `demo.schedule.v1` + ServiceDetailDrawer | todos |
| Relatórios | `/reports` | categorias (arquitetura) | `canReports` |
| Visita Técnica | `/reports/visita` | fluxo visual (clientes/equipments/users reais) | `canReports` |
| Dashboard | `/` | stats + users + customers + finance (demo) | todos (financeiro gated) |

### Usuários (completo)
Listagem, busca (debounce), filtros (papel/status), paginação server-side, ordenação, **drawer de detalhes** (dados/permissões/preferências + avatar), criação (senha temporária exibida uma única vez e copiável), edição, ativar/desativar, excluir (soft), **reset de senha**, proteção de auto-ação e último OWNER. Troca obrigatória de senha continua no fluxo `/trocar-senha`.

### Perfil
Avatar (upload/remover, 2 MiB), troca de senha voluntária (revoga sessões → relogin), preferências (tema sincronizado com next-themes + notificações), identidade e organização.

### Configurações
Identidade visual (upload de LOGO/HEADER/FOOTER com preview), dados da organização (edição OWNER, cores aplicadas ao tema), parâmetros (idioma/timezone/moeda/prefixo), modelos de documento (listagem; editor é escopo futuro).

### Relatórios + Visita Técnica
Três categorias (Operacionais, Técnicos, Visita Técnica). Visita Técnica tem **fluxo visual** completo: cliente, equipamento, operador (dados reais), observações, fotos (preview local), assinatura (canvas). **Sem geração de PDF** — montagem do documento é do backend (Sprint 3), reusando a arquitetura `GeneratedDocument → Preview → Review → Download`.

## RBAC

Aplicado em toda a aplicação via `useAuth().can/hasRole` e `<Gate>`: sidebar filtra itens; páginas sensíveis (Relatórios, Financeiro, Configurações, Usuários) escondem ações/redirecionam; 401/403 do backend continuam sendo a autoridade final.

## Componentes compartilhados (novos)

`components/shared/`: `ConfirmDialog`, `SearchInput`, `StatusChip`, `SectionCard`, `EmptyIllustration`, `FilterBar` (+`FilterChip`), `MetricCard` (re-export), `DrawerTabs`. Drawers de Customer/Equipment/User/Service padronizados sobre `Drawer` + `DrawerTabs`.

## DataTable refinada

`onRowClick`, **ordenação client-side** (colunas com `sortAccessor`), **seleção** (checkbox por linha + selecionar todos), além de `rowHref`. Exportação CSV em todas as listas; PDF segue como ação "via backend".

## Arquitetura documental

Mantida e estendida: `SignaturePad` (captura visual de assinatura) adicionado. Geração permanece exclusiva do backend.

## Mobile

`/operator` validado e estável (sem novos módulos): consome `/users/me` + Demo Dataset, rotas íntegras desde a Sprint 1.

## Fora de escopo (Sprint 3)

Ordem de Serviço completa · Orçamento · PMOC · Recibo · Laudo Técnico · Assinatura (envio/embed) · Workflow Operador → Backend → Documento final.
