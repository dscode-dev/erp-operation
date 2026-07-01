# ROUTES — Frontend

## Backlog — Document Template Preview

- `/reports`: o botão **Visualizar** abre o drawer atual e renderiza o modelo com:
  - `GET /documents/templates/:templateId/preview`;
  - `DocumentViewer source={{ templateId }}`.
- O preview de modelo não depende mais de `/operations`, não cria Operation fictícia e não tem fallback local.
- Templates sem registro persistido exibem estado "Template indisponível"; templates inativos/erros de renderização são tratados pelo `DocumentViewer`.

## Backlog — Paginação Global + Modelos de Relatórios

- `/reports`: agora é a biblioteca de **Modelos de Documentos**, não lista documentos emitidos.
  - Cards mostram ícone, nome, descrição, status, assinatura obrigatória, modo/fixa, template padrão e última atualização.
  - **Visualizar** abre drawer com duas colunas: metadados/configuração à esquerda e `DocumentViewer` à direita.
  - O preview usa exclusivamente o backend (`/documents/templates/:templateId/preview`) através do `DocumentViewer`.
  - **Configurar** abre o `TemplateFormDrawer` existente.
  - **Novo Modelo** abre o mesmo drawer, escolhendo o tipo no cabeçalho.
- `/clientes`, `/equipamentos`, `/operacoes`, `/usuarios`, `/documentos`, `/servicos`, `/ordens`, `/produtos` e `/financial`: usam o componente padrão de paginação.
- `/documentos`: mantém a Central Documental real, paginada pela consulta de `/operations`.

## Sprint 7 — Asset Lifecycle

- `/equipamentos/[id]`: detalhes do equipamento com abas Resumo, Informações, Timeline,
  Documentos, Métricas e Anexos. Timeline consome `/equipments/:id/lifecycle` e stats consomem
  `/equipments/:id/lifecycle/stats`.
- `/clientes/[id]`: timeline consolidada do cliente via `/asset-lifecycle?customerId=...`.
- `/`: dashboard adiciona widgets reais de ciclo de vida usando `/asset-lifecycle`.
- `/operator/equipamentos/[id]`: PWA/operator usa o mesmo `AssetTimeline`.
- `CustomerDetailDrawer`, `EquipmentDetailDrawer` e `OperationDetailDrawer`: históricos usam
  Asset Lifecycle, sem timeline local.

Eventos de timeline:

- `documentId` abre `DocumentViewer`;
- `operationId` abre `OperationDetailDrawer`.

## Sprint 6 — Documentos

- `/documentos`: Central Documental real. Consome `/operations` para listar `OperationDocument` e abre `DocumentViewer` com endpoints oficiais de preview/render/download.
- `/settings`: inclui seções **Documentos** (`GET /documents/configuration`) e **Assinaturas** (`/signatures`).
- `/reports`: Gestão de Modelos/Templates. Exibe configuração real dos templates e administra assinatura por template.
- `/operator/documents`: documentos reais filtrados pelo cliente selecionado; usa `/operations?customerId=...` e `DocumentViewer`.
- `OperationDetailDrawer`: documentos relacionados abrem o mesmo `DocumentViewer`.

Rotas antigas de preview local/demo foram removidas das telas de documentos. Ordens/Serviços demo não exibem mais rascunho local de documento.

Dois apps no mesmo runtime Next, separados por pathname (`app/app-providers.tsx`). Ver `ARCHITECTURE.md`.

## Platform (gestão · desktop-first)

`/login`, `/trocar-senha` (escopo platform) + shell autenticado em `app/(platform)/…`:
`/`, `/agenda`, `/operacoes` (**Backlog #004** — domínio operacional real, lista `/operations` + drawer), `/servicos`, `/ordens`, `/clientes` (+`/[id]`), `/equipamentos` (+`/[id]`), `/produtos`, `/financial`, `/usuarios`, `/profile`, `/settings`, `/reports` (+`/visita`), `/documentos` (central documental real via Document Engine), `/demo-ready` (modo apresentação). Sprint 4: Ordens e Produtos passam a consumir o Demo Dataset (`demo.orders.v1`/`demo.products.v1`).

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
