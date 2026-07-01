# STATE — Frontend Sprint 7 (Asset Lifecycle Integration)

Status: Concluída ✅ — 30 de junho de 2026. Next.js 15 · App Router · TypeScript. Timelines oficiais agora consomem exclusivamente o Asset Lifecycle do backend.

## Backlog — Document Template Preview

Status: Concluído ✅ — 1 de julho de 2026.

- `DocumentViewer` passou a aceitar `source={{ templateId }}`.
- `@erp/api/documents` adicionou `previewTemplateDocument(templateId)`.
- `/reports` removeu a dependência de uma Operation real para preview de modelo.
- O drawer de preview mantém duas colunas, mas a coluna direita agora chama exclusivamente:
  - `GET /documents/templates/:templateId/preview`.
- Sem `DocumentPaper`, sem preview local, sem Demo Dataset e sem Operation fictícia.
- Templates inexistentes/inativos e erros de renderização são tratados pelo estado padrão de erro do `DocumentViewer`.

Validação:

- `npm run lint` passou com warnings pré-existentes de `<img>`/export anônimo fora do escopo.
- `npm run build` passou.

## Backlog — Paginação Global + Modelos de Relatórios

Status: Concluído ✅ — 1 de julho de 2026. Backlog frontend; posteriormente refinado pelo preview oficial de template do backend.

- `Pagination` virou o componente padrão para listagens da Platform: primeira, anterior, próxima, última, página atual, total, total de páginas e troca de tamanho de página.
- Listagens com backend paginado preservam filtros/ordenação ao trocar página/tamanho:
  - `/clientes`;
  - `/equipamentos`;
  - `/operacoes`;
  - `/usuarios`;
  - `/documentos` usando a paginação de `/operations`.
- Listagens ainda baseadas em dataset local/demo receberam paginação client-side com o mesmo componente, sem carregar todos os registros na tabela:
  - `/servicos`;
  - `/ordens`;
  - `/produtos`;
  - `/financial`.
- `/reports` foi refeito como **Modelos de Documentos**:
  - cards modernos e compactos;
  - badges de ativo/inativo, assinatura obrigatória, assinatura fixa/modo e template padrão;
  - ações principais reduzidas a **Visualizar** e **Configurar**;
  - botão **Novo Modelo** no cabeçalho usando o `TemplateFormDrawer` existente.
- Preview de modelo não usa `DocumentPaper` nem preview local. O drawer reutiliza `DocumentViewer` e consome o preview oficial do backend por `templateId`.
- `TemplateFormDrawer` preservado e evoluído apenas em UX, com foco automático no nome.
- Exclusão de modelo disponível por confirmação no drawer de preview, respeitando proteção de templates de sistema pelo backend.

Validação:

- `npm run lint` passou com warnings pré-existentes de `<img>`/export anônimo fora do escopo.
- `npm run build` passou.

## Sprint 7 — Asset Lifecycle Integration

- `@erp/api/asset-lifecycle` integrado aos endpoints oficiais:
  - `GET /equipments/:id/lifecycle`;
  - `GET /equipments/:id/lifecycle/stats`;
  - `GET /asset-lifecycle`;
  - `GET /asset-lifecycle/:id`.
- Tipos `AssetLifecycle*` adicionados em `@erp/types`.
- `AssetTimeline` criado em `@erp/ui/assets/asset-timeline.tsx`.
- Timelines locais removidas:
  - `@erp/ui/timeline` removido;
  - `operationsToTimeline` removido;
  - histórico local/demo em Cliente, Equipamento, Operator e OperationDetailDrawer substituído.
- Página `/equipamentos/[id]` ganhou abas:
  - Resumo;
  - Informações;
  - Timeline;
  - Documentos;
  - Métricas;
  - Anexos.
- `/clientes/[id]` passou a mostrar timeline consolidada via `GET /asset-lifecycle?customerId=...`.
- Drawers de Cliente e Equipamento usam `AssetTimeline`.
- Operator `/operator/equipamentos/[id]` usa o mesmo `AssetTimeline`.
- Eventos `DOCUMENT` abrem o `DocumentViewer` existente.
- Eventos com `operationId` abrem o `OperationDetailDrawer` existente.
- Dashboard passou a consumir `GET /asset-lifecycle` para widgets reais de ciclo de vida.

Validação:

- `npm run build` passou.
- `npm run lint` passou com warnings pré-existentes de imagem/useMemo fora do escopo.

## Sprint 6 — Document Center & Configuration Integration

- `@erp/api/documents` integrado aos endpoints oficiais:
  - `GET /documents/operations/:operationId/:type/preview`;
  - `POST /documents/operations/:operationId/:type/render`;
  - `GET /documents/:documentId/preview`;
  - `POST /documents/:documentId/render`;
  - `GET /documents/:documentId/download`;
  - `GET /documents/configuration`.
- `@erp/api/signatures` integrado ao domínio de assinaturas:
  - listagem, criação, edição, soft delete, upload e download.
- `/documentos` virou a Central Documental real: lista documentos vindos de `/operations`, sem `demo.documents.v1`, com filtros cumulativos por cliente, equipamento, operador, tipo, status e data.
- `DocumentViewer` foi substituído por um componente único do Document Engine: preview oficial, páginas, miniaturas, zoom, navegação, atualizar preview, renderizar e baixar PDF real.
- `OperationDetailDrawer` e Operator `/operator/documents` reutilizam o mesmo `DocumentViewer`.
- `/settings` ganhou:
  - seção **Documentos**, consumindo `/documents/configuration`;
  - seção **Assinaturas**, consumindo `/signatures`.
- `/reports` permanece como Gestão de Modelos, mas removeu preview com dados de exemplo e passou a exibir configuração real dos templates.
- `TemplateFormDrawer` passou a administrar `requiresSignature`, `signatureMode` e `signatureId`.
- Fluxos removidos: `DocumentPreview`, `DocumentDownload`, `GeneratedDocument`, download JSON/local, preview `DocumentPaper` para documentos emitidos e `operationsApi.getDocuments`.

Validação:

- `npm run lint` passou com warnings existentes de imagem/useMemo fora do escopo.
- `npm run build` passou.

Pendências conscientes:

- O backend ainda não aplica assinatura fixa/coletada no PDF; o frontend apenas persiste e exibe a configuração.
- Editor visual, workflow, aprovação, versionamento, ICP/DocuSign e assinatura eletrônica continuam fora do escopo.

## STAGE 0 — Branding

Identidade do cliente (Climatize) aplicada: `logo.PNG`/`favicon.PNG` copiados para `frontend/public/brand/` + `app/icon.png` (favicon) + `app/apple-icon.png` (iOS). Componente `@erp/ui/brand` (`BrandLogo`) usado no **login**, **sidebar** e **top bar do operador**. Tema azul/branco definitivo (Sprint 3); troca dinâmica de cores do OWNER preservada.

## STAGE 1 — Relatórios → Central documental (`/reports`)

A Platform administrava documentos por snapshot `demo.documents.v1` nesta etapa histórica; a Sprint 6 substituiu esse fluxo por `/operations` + Document Engine oficial.

## STAGE 2 — Serviços (`/servicos`) → Histórico operacional

Timeline do histórico: cliente, equipamento, operador, tipo, data, documentos e eventos (snapshot `demo.services.v1`). Drawer com `Timeline`. Sidebar: "Atendimentos" renomeado para "Serviços"; placeholder removido. Preparado para a futura Ordem de Serviço.

## STAGE 4 — Timeline reutilizável

`@erp/ui/timeline` (`Timeline` + `TimelineEvent`) com kinds instalação/manutenção/visita/documento/observação. Usado em **Serviço**, **Cliente** (`/clientes/[id]`) e **Equipamento** (`/equipamentos/[id]`), filtrando os serviços demo por cliente/equipamento.

## STAGE 3 — Operator refinado

Home com atalhos: Escanear QR · Agenda · Clientes · Equipamentos · Documentos · Sincronizar (+ CTA Novo Atendimento). Novas rotas: `/operator/equipamentos` (busca), `/operator/documents` (lista demo, somente leitura — nunca edita finalizados), `/operator/sync` (outbox offline-ready). Mobile-first mantido.

## STAGE 6 — Docker

`frontend/Dockerfile` (multi-stage, Next `output: standalone`) + `frontend/.dockerignore`. `docker-compose.yml`: serviço `frontend` (serve Platform `/` e Operator `/operator`; subdomínios via proxy em produção). `.env.example`: `FRONTEND_PORT`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ENABLE_DEMO`.

## STAGE 7 — RC1 Demo (`/demo-ready`)

Roteiro guiado de 8 passos (Dashboard → Cliente → Equipamento → Operator → Atendimento → Serviços → Documentos → Download) + contagens ao vivo + atalho "Abrir ERP Operador". Parece um fluxo único.

## Backend (aditivo)

Novos snapshots `demo.documents.v1` e `demo.services.v1` na factory (+ `DEMO_SETTING_KEYS`). Servidos dinamicamente pelo `/internal/demo/dataset`.

## Pendências para a 1.0

Domínios reais (Agenda, Serviços, Ordem de Serviço, Documentos) substituindo o Demo Dataset; geração real de PDF + assinatura embarcada; encoder de QR scannable + scanner de câmera; sync real do outbox + service worker (cache offline); ícones PNG multi-resolução; rodar `next build`/seed e `docker compose` no ambiente real (validado por `tsc`).

## Backlog #001 — Agenda (produção)

- `/agenda` reescrita como **calendário mensal** (grade de 6 semanas, segunda-first), com células de altura fixa — nenhum evento ultrapassa os limites; excedente vira "+N mais" (drawer do dia).
- Navegação completa: mês anterior/próximo, seletor de mês, seletor de ano, botão **Hoje**. Cada navegação **consulta o backend** via `financialApi.getScheduleRange(from, to)` (intervalo da grade visível).
- Eventos **clicáveis** → `AgendaEventDrawer` (lateral) com cliente, equipamento, operador, tipo, data/horário, status, observações e ações gated por RBAC (reagendar/editar — escopo futuro).
- UX: loading (skeleton nas células + spinner na toolbar), erro + retry, empty state ("Nenhum agendamento no mês"), transição suave entre meses (`animate-fade-in` por mês).
- Build de produção desbloqueado: `routes/` (preview TanStack legado) excluído do `tsconfig` (quebrava `next build`).

## Backlog #002 — QR Code operacional (produção)

- Scanner real de câmera (PWA) com `@zxing/browser` (apenas QR): `packages/ui/qr-scanner.tsx` — câmera traseira por padrão, troca de câmera, cancelar, loading, guia de enquadramento + linha de leitura (`animate-scanline`), e tratamento de permissão negada / câmera indisponível / QR inválido / equipamento inexistente.
- Botão "Escanear QR Code" no fluxo Novo Atendimento → Buscar Equipamento: lê o QR → `GET /equipments/lookup/:qrCode` → card do equipamento (nome, cliente, endereço, patrimônio, série, status, foto) → confirma → **pré-seleciona no wizard e avança** (sem nova busca).
- `/operator/qr` passou a usar o scanner real + `lookupByQr` (sem simulação).
- API: `equipmentsApi.lookupByQr(qrCode)`; backend `GET /equipments/lookup/:qrCode`.

## Backlog #003 — Relatórios, Documentos e Templates

- **Relatórios** (`/reports`) virou **Gestão de Modelos**: 7 modelos profissionais (OS, Relatório Técnico, Visita Técnica, PMOC, Laudo, Orçamento, Recibo) com identidade compartilhada (`@erp/ui/documents/document-paper` + `model-blueprints`). Ações por modelo: pré-visualizar, editar, ativar/desativar (`isActive`), definir padrão, importar (upload), versão (updatedAt) — consumindo `/organization/templates`.
- **Documentos** (`/documentos`) virou **Central Documental** histórica com snapshot; substituída na Sprint 6 por documentos reais de Operations, preview oficial e download PDF via backend.
- Backend: `DocumentTemplate.isActive` (migration + DTO + serviço). Sem novos Demo Datasets.

## Backlog #004 — Operações (OS + Formulários Base)

- Domínio **Operation** real consumido via `operationApi` (`@erp/api/operation`) — distinto do `operationsApi` (snapshots demo). Tipos em `@erp/types` (`Operation*`, `CreateOperationPayload`).
- **Operator**: o Wizard de atendimento passou a **criar uma Operation real** (`POST /operations`) ao finalizar — fotos convertidas para data URL, assinatura e checklist enviados; a OS rascunho é gerada no backend. Tela de sucesso: "Atendimento registrado com sucesso · OS #000001 criada". (substitui o outbox local).
- **Platform**: nova página `/operacoes` (lista real, filtros por status, paginação) + `OperationDetailDrawer` com Timeline + Checklist + Fotos + Observações + Assinatura + Documentos relacionados. Preview foi migrado na Sprint 6 para `DocumentViewer`.
- **Fundação reutilizável** `@erp/ui/operations`: `operation-sections` (modelo de seções), `operation-view` (renderers), `operation-shared` (labels/tones + `operationsToTimeline`). Todos os documentos reutilizam essa base (OperationForm → Sections → Renderers).
- **Histórico (Timeline)** automático em: drawer de Equipamento (aba Histórico), drawer de Cliente (aba Histórico) e detalhe de Equipamento no operator — derivado de `/operations` (sem duplicação).
- **Documentos** (`/documentos`): agora mescla os documentos reais das Operations (incluindo a **OS em rascunho**) com o snapshot demo, mantendo filtros/preview.
