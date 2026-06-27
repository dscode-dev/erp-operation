# STATE — Sprint 5 (RC1 · Product Polish & Commercial Demo)

Status: Concluída ✅ — Release Candidate 1. Next.js 15 · App Router · RSC. `tsc` limpo (frontend e backend; exceto `routes/` legado). Sem mocks locais — backend + Demo Dataset.

## STAGE 0 — Branding

Identidade do cliente (Climatize) aplicada: `logo.PNG`/`favicon.PNG` copiados para `frontend/public/brand/` + `app/icon.png` (favicon) + `app/apple-icon.png` (iOS). Componente `@erp/ui/brand` (`BrandLogo`) usado no **login**, **sidebar** e **top bar do operador**. Tema azul/branco definitivo (Sprint 3); troca dinâmica de cores do OWNER preservada.

## STAGE 1 — Relatórios → Central documental (`/reports`)

A Platform administra (não cria) documentos dos operadores. Lista RVT, Laudos, PMOC, Orçamentos, Recibos e OS (snapshot `demo.documents.v1`) com operador/cliente/equipamento/data/status, **preview** (DocumentViewer), revisar/editar (OWNER) e **download**. Filtros por tipo + busca + export.

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
- **Documentos** (`/documentos`) virou **Central Documental**: lista documentos emitidos (`demo.documents.v1`) com filtros **cumulativos** (cliente, equipamento, operador, tipo, status, período), preview profissional (`DocumentPaper`) e download estruturado (JSON) + export CSV.
- Backend: `DocumentTemplate.isActive` (migration + DTO + serviço). Sem novos Demo Datasets.

## Backlog #004 — Operações (OS + Formulários Base)

- Domínio **Operation** real consumido via `operationApi` (`@erp/api/operation`) — distinto do `operationsApi` (snapshots demo). Tipos em `@erp/types` (`Operation*`, `CreateOperationPayload`).
- **Operator**: o Wizard de atendimento passou a **criar uma Operation real** (`POST /operations`) ao finalizar — fotos convertidas para data URL, assinatura e checklist enviados; a OS rascunho é gerada no backend. Tela de sucesso: "Atendimento registrado com sucesso · OS #000001 criada". (substitui o outbox local).
- **Platform**: nova página `/operacoes` (lista real, filtros por status, paginação) + `OperationDetailDrawer` com Timeline + Checklist + Fotos + Observações + Assinatura + Documentos relacionados (preview via `DocumentPaper`).
- **Fundação reutilizável** `@erp/ui/operations`: `operation-sections` (modelo de seções), `operation-view` (renderers), `operation-shared` (labels/tones + `operationsToTimeline`). Todos os documentos reutilizam essa base (OperationForm → Sections → Renderers).
- **Histórico (Timeline)** automático em: drawer de Equipamento (aba Histórico), drawer de Cliente (aba Histórico) e detalhe de Equipamento no operator — derivado de `/operations` (sem duplicação).
- **Documentos** (`/documentos`): agora mescla os documentos reais das Operations (incluindo a **OS em rascunho**) com o snapshot demo, mantendo filtros/preview.
