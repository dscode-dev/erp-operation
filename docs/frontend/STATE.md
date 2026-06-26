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
