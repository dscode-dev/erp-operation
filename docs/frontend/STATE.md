# STATE — Frontend

## Work Order — QR textual

- O `DocumentViewer` recebe apenas metadata `Código QR` nas novas Ordens de Serviço.
- Não existe QR gráfico local ou espaço reservado; documentos históricos continuam compatíveis.

## Refinamento TECHNICAL_REPORT — 14/07/2026

- `DocumentViewer` passou a espelhar o cabeçalho PDF em duas linhas: logo isolada, seguida por
  título/número e dados institucionais em colunas independentes.
- O Renderer PDF foi alinhado às proporções já aprovadas no Preview; nenhuma composição frontend
  adicional foi criada.
- A Central renomeou a seleção para `Equipamentos`; a composição e a ordem permanecem recebidas do
  Blueprint oficial, sem QR ou seções locais.

## Refinamento do cabeçalho documental

- `DocumentViewer` centraliza verticalmente a logo em relação ao bloco textual e não apresenta
  metadados técnicos no rodapé público.

## DC-02 — Relatório de Visita Técnica

- o workflow `TECHNICAL_REPORT` coleta objetivo, diagnóstico, atividades, recomendações e
  observações finais em campos autoritativos da Operation;
- `DocumentViewer` continua único e passou a respeitar `pageBreakAfter` e pesos de componentes para
  paginação coerente com o LayoutEngine;
- runtime Chrome confirmou `RVT-000015` em `/reports`, Preview com quatro páginas e os mesmos grupos
  do PDF oficial;
- não existe preview, PDF, QR ou política de assinatura local.

## Product Backlog Closure 07 — Central de Relatórios

- `/reports` virou a Central oficial com dashboard, histórico, filtros e wizard em quatro etapas.
- documentos com origem Operation podem reabrir o wizard para edição dos dados e novo render.
- `/report-templates` recebeu a biblioteca exclusivamente administrativa.
- `/reports/visita` redireciona para a Central; o fluxo duplicado foi removido.
- Financeiro foi movido para Gestão; Documentos permaneceu em Operação.
- Configurações não replica mais Templates/Document Configuration.
- Browser real confirmou menus, cinco cards, wizard e separação de responsabilidades.

## DC-01.2 — Preview/PDF parity

- o contrato reconhece a quebra preferencial de seção após Equipamento, preservando compatibilidade;
- `DocumentViewer` renderiza a imagem QR oficial do Blueprint, sem placeholder textual.
- tokens visuais do Blueprint alinham Preview e PDF para cores, tipografia e espaçamento.
- metadados, larguras de tabela, checklist e assinaturas foram aproximados do Renderer oficial.
- runtime real confirmou QR, assinatura técnica configurada e assinatura coletada no Preview 3/3.
- nenhuma rota ou fluxo documental paralelo foi criado.

## DC-01 — Work Order

- criação de Operation coleta defeito, serviços e observações separadamente;
- Operator envia notas de execução como `serviceDescription`;
- configurações da organização permitem endereço e website institucionais;
- DocumentViewer renderiza logo e informações institucionais do Blueprint.

## Document Engine D1

- `/documentos` consome `GET /documents`, sem mesclar Operations ou datasets locais.
- filtros, busca e paginação são server-side e cumulativos.
- drawer apresenta resumo, metadados e `DocumentViewer` para preview/render/download.
- templates suportam múltiplas assinaturas institucionais e políticas de execução.
- assinaturas suportam conselho profissional e departamento.
- BudgetDetailDrawer foi preservado por já consumir o Document Engine oficial.

## Product Backlog Closure 06.1 — visual runtime verification

Status: concluída em 11 de julho de 2026.

- `/operacoes` exibiu em Chrome real `Criado` e `Data do agendamento` com valores distintos.
- Drawer exibiu `Datas` e `Agendado para` sem fallback.
- DocumentViewer real exibiu assinatura na página 3/3.
- `Drawer` usa portal no `document.body`, corrigindo clipping de viewers aninhados.
- Script opt-in de inspeção visual registra screenshots temporários e evidência segura.

## Product Backlog Closure 06 — OS real e datas operacionais

Status: concluída em 11 de julho de 2026.

- Tabela de Operações separa “Criado” (`createdAt`) e “Data do agendamento” (`scheduledFor`).
- Drawer da Operation ganhou seção Datas e captura persistente de assinatura para a OS.
- Confirmação da assinatura aguarda backend e recarrega a fonte autoritativa.
- DocumentViewer identifica visualmente modelo versus preview com dados reais e pede render atual.
- Operator prioriza `scheduledFor`; ausência aparece como “Não agendado”, sem usar `assignedAt`.

Validação final: build passou; lint passou com 2 warnings pré-existentes (imports não utilizados em
`bottom-nav.tsx` e `sidebar.tsx`).

## Product Backlog Closure 05 — Reports visual refinement and document consistency

Status: concluída em 10 de julho de 2026.

Correções e refinamentos:

- `/reports` teve os cards de modelos refinados para layout mais compacto, com ações discretas e
  menos peso visual.
- O drawer explicita a diferença entre preview estrutural de modelo e preview com dados reais.
- Preview de modelo continua usando `DocumentViewer source={{ templateId }}`.
- Preview real/render/download continuam usando `DocumentViewer source={{ operationId, type }}`.
- Nenhum preview local, `DocumentPaper` ou fallback visual foi reintroduzido.
- O frontend passou a receber assinatura coletada da execução pelo mesmo `SignatureComponent` usado
  pelo PDF.
- Achado então pendente: `/reports/visita` era visual-only. Resolvido na Closure 05.1 abaixo.

Validação:

- `frontend npm run build`: passou.
- `frontend npm run lint`: passou com 2 warnings pré-existentes fora do escopo.

## Product Backlog Closure 05.1 — Platform Visit Report consolidated

Status: concluída em 10 de julho de 2026.

- `/reports/visita` deixou de ser visual-only.
- A rota agora seleciona uma Operation real e persiste evidências por `PATCH /operations/:id`.
- Checklist, observações, fotos e assinatura passam a pertencer à Operation.
- O preview usa `DocumentViewer source={{ operationId, type: "TECHNICAL_REPORT" }}`.
- Não há PDF local, object URL persistente ou modelo frontend paralelo.
- Fotos persistidas aparecem no `DocumentViewer` quando o backend resolve a imagem no blueprint.

Validação:

- `frontend npm run lint`: passou com 2 warnings pré-existentes.
- `frontend npm run build`: passou.

## Sprint 23 — V1 Product Completion & End-to-End Workflow Closure

Status: parcial/concluída em 10 de julho de 2026.

Sprint 23 não criou novos domínios nem contratos. O foco foi inspecionar os workflows V1 reais e
fechar continuidade crítica no Operator PWA.

Correções aplicadas:

- `/operator/services/[id]` deixou de exibir apenas cards estáticos de fluxo e passou a expor
  contexto operacional completo da Assignment/Operation:
  - cliente;
  - endereço;
  - equipamento;
  - tipo/status da Operation;
  - checklist oficial da Operation;
  - timeline/histórico da Assignment.
- O operador agora visualiza materiais consumidos pela Operation usando
  `GET /operations/:id/materials`.
- Quando a Assignment está `STARTED`, o operador pode registrar material via
  `POST /operations/:id/materials`, reutilizando Inventory oficial; saldo continua autoridade do
  backend.
- Documentos vinculados à Operation agora abrem o `DocumentViewer` oficial no Operator detail.
- O `DocumentViewer` deixou de exibir “placeholder” como versão e passa a usar o `version` do
  Blueprint.

Achados deferidos:

- Fotos e assinatura de campo continuam preservadas na Operation, mas coleta guiada completa no PWA
  fica para Sprint 24 como polish de experiência de campo.
- Offline sync continua fora da V1 e permanece como V1.1/Post-V1.

Validação:

- `frontend npm run lint`: passou com 2 warnings pré-existentes.
- `frontend npm run build`: passou.
- `backend npx prisma validate` com `DATABASE_URL` seguro: passou.
- `backend npm run lint`: passou.
- `backend npm run build`: passou.
- `backend npm test -- --silent`: 10 suites / 27 testes passaram.
- Suítes backend com PostgreSQL real não executaram porque não havia Postgres local em
  `127.0.0.1:5432`; não foram apontadas como regressão funcional.

## Sprint 21 — Performance, Load & Observability

Status: concluída em 6 de julho de 2026.

Sprint de verificação e documentação. Não criou telas nem fluxos novos.

Resultados do build Next.js 15/Turbopack:

- build passou;
- shared First Load JS: 139 kB;
- rotas Operator principais ficaram entre 142 kB e 153 kB de First Load JS;
- rotas administrativas mais pesadas identificadas:
  - `/equipamentos`: 449 kB;
  - `/budgets`: 336 kB;
  - `/produtos`: 330 kB;
  - `/financial`: 325 kB;
  - `/purchase-orders`: 324 kB.

Decisões:

- nenhum chunk foi extraído nesta sprint porque os cenários backend/API ficaram dentro do budget e a
  sprint não autorizava refatoração funcional ampla;
- `/equipamentos`, `/budgets` e `/produtos` ficam marcadas como candidatas a code splitting fino em
  Sprint 22/Post-V1 Optimization;
- manter paginação global e cancelamento de requisições em filtros/drawers para preservar os
  budgets backend medidos.

Baseline backend relevante para frontend:

- dashboard fan-out: p95 181.06 ms, error rate 0;
- Document Engine preview/render/download: p95 104.04 ms, error rate 0;
- Operator read path: p95 28.31 ms, error rate 0.

## Frontend Sprint 9 (Architecture Inspection, Navigation UX & Creation Flows)

Status: Concluída ✅ — 1 de julho de 2026. Next.js 15 · App Router · TypeScript. Navegação reorganizada e fluxos de criação consolidados sobre Operation real.

## Frontend Sprint 9 — Architecture Inspection, Navigation UX & Creation Flows

- Sidebar reorganizada:
  - Visão Geral: Dashboard, Agenda;
  - Operação: Operações, Serviços, Ordens de Serviço, Documentos;
  - Cadastros: Clientes, Equipamentos, Produtos;
  - Gestão: Relatórios, Financeiro, Usuários;
  - Sistema: Configurações, Perfil, Modo demo.
- Criados componentes reutilizáveis em `apps/platform/components`:
  - `CustomerSelect`;
  - `CustomerAddressSelect`;
  - `EquipmentSelect`;
  - `UserSelect`;
  - `DateTimePicker`;
  - `ServiceTypeSelect`;
  - `OperationCreationDrawer`.
- Fluxos de criação adicionados:
  - Agenda: **Novo agendamento** cria Operation agendada real;
  - Operações: **Nova operação** cria Operation real;
  - Serviços: **Novo serviço** usa o mesmo fluxo de Operation;
  - Ordens de Serviço: **Nova OS** cria Operation real e depende do backend para gerar OS rascunho.
- `OperationCreationDrawer` evita criar domínios paralelos: Agenda, Serviços e OS continuam usando Operation.
- RBAC visual aplicado com `<Gate>`:
  - Agenda usa `canSchedules`;
  - Operações/Serviços/OS usam OWNER/MANAGER/OPERATOR;
  - backend segue como autoridade final.
- Limitação documentada: o backend atual cria Operation com `operatorId = actor.id`; o seletor de operador fica preparado na UI, mas a delegação persistida depende de contrato backend futuro.

Validação:

- `npm run build` passou.

## Document Certification DC02B

Status: concluída em 13 de julho de 2026.

- `/reports` persiste competência, tipo de manutenção, checklists estruturados e equipamentos
  inspecionados para `TECHNICAL_REPORT`;
- equipamentos disponíveis são carregados pelo cliente selecionado;
- Configurações permite inscrição estadual e telefones adicionais;
- `DocumentViewer` renderiza o Corporate Header do Blueprint com fallback retrocompatível;
- Preview, render e download permanecem no Document Engine;
- lint passou com um warning preexistente e build de 39 rotas passou.
- Chrome headless confirmou o documento runtime na Central de Relatórios e cinco páginas/miniaturas
  no `DocumentViewer`.
- `npm run lint` passou com warnings pré-existentes de `<img>` e export anônimo.

## Frontend Sprint 8 — Inventory, Materials & Pricing Integration

- `@erp/api/inventory` criado para Products, Inventory Items, Stock Movements, Suppliers e Operation Materials.
- `@erp/api/pricing` criado para Pricing, stats, preço vigente e histórico.
- Tipos adicionados em `@erp/types`: `Product`, `InventoryItem`, `StockMovement`, `Supplier`, `OperationPart`, `ProductPricing`, `ResolvedProductPricing`, `InventoryStats` e `PricingStats`.
- `/produtos` deixou de usar `operationsApi.getProducts`/`demo.products.v1` e virou central real com abas:
  - Catálogo;
  - Estoque;
  - Fornecedores;
  - Preços;
  - Movimentos.
- `ProductFormDrawer` agora cria/edita produto via backend.
- Página de produtos exibe SKU, código interno, fabricante, marca, modelo, categoria, unidade, status, estoque associado e preço vigente quando permitido.
- Estoque exibe saldo atual, mínimo, ideal, reservado, disponível, localização, status crítico e histórico de movimentações.
- Fornecedores têm listagem, cadastro, edição, desativação, busca e paginação.
- Pricing exibe custo, reposição, custo médio, venda, mínimo, sugerido, margem, vigência e histórico; criação/revisão somente OWNER.
- `OperationDetailDrawer` ganhou seção **Materiais utilizados**, consumindo `GET /operations/:id/materials`, adicionando/removendo materiais por endpoints reais.
- Dashboard consome `/inventory/stats`, `/inventory/movements` e `/pricing/stats` para widgets reais.
- RBAC respeitado por `<Gate>` e por tratamento de 403 da API; backend continua autoridade final.

Validação:

- `npm run build` passou.
- `npm run lint` passou com warnings pré-existentes de `<img>` e export anônimo.

## Sprint 7 — Asset Lifecycle Integration

Status: Concluída ✅ — 30 de junho de 2026. Timelines oficiais agora consomem exclusivamente o Asset Lifecycle do backend.

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

## Sprint — Assignment Domain + Operator Workflow

Integração concluída:

- `packages/api/assignments.ts` criado para consumir `/assignments`;
- tipos `Assignment`, `AssignmentStatus`, `AssignmentHistoryItem` adicionados em `@erp/types`;
- `OperationCreationDrawer` envia `operatorId` e passa a criar Operation + Assignment automaticamente;
- `/agenda` da Platform passou a ser uma visão de calendário sobre Assignments reais;
- `OperationDetailDrawer` mostra responsável, status, histórico e permite reatribuição para
  OWNER/MANAGER;
- Operator Home passou a usar `/assignments/my`;
- `/operator/services` virou **Minhas ordens** reais;
- `/operator/agenda` mostra a agenda de campo por Assignments;
- `/operator/services/[id]` controla aceite, início, conclusão e recusa via backend.

Validação:

- `npm run build` passou;
- `npm run lint` passou com warnings antigos de `<img>` fora do escopo.

## Frontend Sprint 10 — Budget Integration

Integração concluída:

- `packages/api/budgets.ts` criado para consumir a API oficial de Budget;
- `@erp/types` expandido com `Budget`, `BudgetItem`, `BudgetApproval`, `BudgetHistory`,
  `BudgetStats`, `BudgetStatus` e payloads;
- `/budgets` criado como **Central Comercial**;
- Sidebar adicionou **Orçamentos** para `OWNER`/`MANAGER`;
- Dashboard (`/`) adicionou widgets reais de Budget via `GET /budgets/stats`;
- `OperationDetailDrawer` ganhou seção **Orçamentos** consumindo
  `GET /operations/:id/budgets` e criação vinculada à Operation.

Endpoints integrados:

- `GET /budgets`;
- `GET /budgets/:id`;
- `GET /operations/:id/budgets`;
- `POST /budgets`;
- `PATCH /budgets/:id/approve`;
- `PATCH /budgets/:id/reject`;
- `DELETE /budgets/:id`;
- `GET /budgets/stats`;
- `GET /budgets/history/:id`.

UX implementada:

- cards de métricas;
- tabela paginada;
- filtros cumulativos por busca, cliente, equipamento, status e período;
- `BudgetDetailDrawer` com resumo, itens, histórico, aprovação, documento e timeline;
- `BudgetCreationDrawer` consumindo Product/Pricing e enviando apenas itens para o backend;
- ações de aprovar, rejeitar e cancelar com confirmação;
- loading, skeleton, retry, empty states, badges e drawers responsivos.

Document Engine:

- preview do modelo `BUDGET` usa `DocumentViewer` com
  `GET /documents/configuration/types/BUDGET` + `GET /documents/templates/:templateId/preview`;
- render/download de PDF de orçamento emitido permanecem aguardando contrato backend específico de
  Budget Document. Nenhum preview local foi criado.

RBAC:

- UI exibe Budget para `OWNER`/`MANAGER`, alinhada ao backend da Sprint 14;
- `OPERATOR` não acessa o domínio comercial;
- backend continua sendo a autoridade final para 401/403.

Validação:

- `npm run lint` passou;
- `npm run build` passou.

## Backlog — Budget Document Emission

Integração concluída:

- `packages/api/budgets.ts` expõe `renderBudget` e `downloadBudget`;
- `/budgets` usa `BudgetDocumentPanel` no drawer de detalhe;
- "Emitir Documento" chama `POST /budgets/:id/render`;
- "Baixar PDF" chama `GET /budgets/:id/download`;
- `DocumentViewer` recebe `documentId` oficial, sem preview local;
- placeholder de documento futuro foi removido;
- `Budget.document` é usado para reabrir documento já emitido;
- Timeline reconhece o evento `DOCUMENT_RENDERED`.

UX:

- Budget `CANCELED`/`REJECTED` bloqueia emissão;
- documento ausente mostra empty state com CTA;
- erros de render/download aparecem no drawer;
- download converte `contentBase64` oficial em Blob PDF.

Validação:

- `npm run lint` passou com warnings pré-existentes de `<img>` e config;
- `npm run build` passou com os mesmos warnings pré-existentes.

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

## Frontend Sprint 11 — Financial & Procurement Integration (Orbit V1)

Financial e Procurement foram integrados na Platform usando apenas APIs oficiais do backend.

Implementado:

- `packages/api/financial.ts` agora consome o domínio real `/financial/*`; o antigo bridge financeiro por Demo Dataset foi removido.
- `packages/api/procurement.ts` criado para `/purchase-orders`, itens, recebimentos, stats e histórico.
- `/financial` virou módulo real com dashboard financeiro, filtros, paginação, contas, categorias, lançamentos, pay/cancel e drawers reutilizáveis.
- `/purchase-orders` criado como central de Pedidos de Compra com métricas, filtros, paginação, detalhe, itens, envio, cancelamento e recebimento parcial/total.
- Sidebar reorganizada nos grupos Visão Geral, Operação, Cadastros, Financeiro, Compras, Gestão e Sistema; “Modo Demo” removido do menu.
- Dashboard principal passou a exibir widgets reais de Financial e Procurement.
- `/demo-ready` não depende mais do antigo bridge financeiro.
- Tipos compartilhados adicionados para `Financial*` e `Purchase*`.

Validação:

- `npm run lint` passou com warnings legados de `<img>` e `postcss.config.mjs`;
- `npm run build` passou.

Pendências para polish:

- Evoluir fornecedores para rota própria caso o produto decida separar de `/produtos`;
- aplicar tabelas responsivas/cards mobile em Financeiro e Compras;
- melhorar máscaras monetárias/CPF-CNPJ nos formulários;
- substituir warnings legados de `<img>` por `next/image`.

## Sprint 17 — Executive Dashboard & Operational Intelligence (Orbit V1)

O dashboard principal (`/`) foi transformado em centro executivo/operacional usando apenas contratos reais existentes.

Arquitetura da informação implementada:

1. Resumo executivo.
2. Centro de atenção.
3. Operação hoje.
4. Snapshot financeiro.
5. Ativos, manutenção e PMOC.
6. Estoque e compras.
7. Atividade relevante recente.

Fontes reais consumidas:

- Assignments: `/assignments`;
- Operations: `/operations/stats`;
- Financial: `/financial/stats`;
- Inventory: `/inventory/stats` e `/inventory/movements`;
- Procurement: `/purchase-orders/stats` e `/purchase-orders`;
- Maintenance Planning: `/maintenance-plans/stats` e `/maintenance-plans`;
- PMOC: `/pmoc/stats` e `/pmoc`;
- Asset Lifecycle: `/asset-lifecycle`.

Removido da home:

- `dashboardApi`;
- Demo Dataset;
- cards decorativos;
- métricas fake;
- valores hardcoded de negócio;
- feed local de agenda/financeiro.

Resiliência:

- cada seção possui loading/error/empty independente;
- falha em Financial não derruba Operações;
- falha em Procurement não derruba Maintenance/PMOC;
- consultas de atenção e atividade são bounded (`limit` pequeno) e sem leitura de listas completas.

RBAC:

- indicadores financeiros só são requisitados para `OWNER`/`MANAGER` com `canFinancial`;
- indicadores de compras são requisitados apenas para `OWNER`/`MANAGER`;
- o backend permanece autoridade final.

Validação:

- `npm run lint` passou com warnings legados;
- `npm run build` passou;
- não houve alteração backend nesta sprint.

Pendências para polish/hardening:

- criar endpoint agregado futuro se o volume real tornar o fan-out atual indesejado;
- adicionar filtros deep-link nas telas destino (`/financial`, `/produtos`, `/purchase-orders`, `/operacoes`);
- substituir os warnings legados de `<img>`;
- considerar testes frontend quando houver runner dedicado no pacote.

## Sprint 18 — Product UX Inspection, Frontend Consolidation & Polish

Inspeção sistemática executada em 38 rotas `page.tsx`:

- Platform: Dashboard, Agenda, Operações, Serviços, Ordens, Documentos, Budgets, Clientes, Equipamentos, Produtos/Estoque/Fornecedores/Pricing, Financeiro, Compras, Relatórios/Templates, Usuários, Settings, Profile e rotas legadas.
- Operator PWA: Home, Agenda, Minhas Ordens, Detalhe da Assignment, Clientes, Equipamentos, Documentos, QR, Sync, Profile, Login, Troca de Senha e Wizard de Atendimento.

Classificação:

- P0: 0 encontrados.
- P1: 4 encontrados / 4 corrigidos.
  - rotas legadas de Serviços e Ordens ainda serviam Demo Dataset;
  - rota Demo Ready ainda acessível com dados demo;
  - rotas detalhe placeholder de Produto/OS;
  - navegação duplicada para fluxos que hoje pertencem a Operações.
- P2: 7 encontrados / 7 corrigidos.
  - warnings legados de `next/image`;
  - warning de PostCSS anonymous export;
  - deep-links do dashboard sem filtros suportados;
  - Produtos não inicializava `tab` por querystring;
  - Financeiro não inicializava filtros por querystring;
  - Compras não inicializava status por querystring;
  - Operações não inicializava status por querystring.
- P3: 4 encontrados / 2 corrigidos / 2 deferidos.
  - labels/navegação refinados na sidebar;
  - rotas stale redirecionam com segurança;
  - bundle report da home será analisado em Sprint 21;
  - brand/document images mantidos com `<img>` por razão técnica.

Correções:

- `/servicos`, `/ordens`, `/ordens/[id]`, `/produtos/[id]` e `/demo-ready` agora redirecionam para fluxos reais, sem dead UI.
- Sidebar removeu destinos duplicados de Serviços/Ordens; Operações é a fonte operacional V1.
- Dashboard usa deep-links para `?status=`, `?type=` e `?tab=`.
- `/financial`, `/purchase-orders`, `/produtos` e `/operacoes` inicializam filtros suportados via URL.
- Warnings de imagem corrigidos com `next/image` em Profile, User Detail, Settings, Visita Técnica e PhotoInput.
- `postcss.config.mjs` corrigido para export nomeado.

Validação:

- `npm run lint` passou sem warnings;
- `npm run build` passou;
- `git diff --check` passou.

Decisões:

- Suppliers continua dentro de `/produtos?tab=suppliers`; a aba já possui fluxo completo e rota própria geraria duplicação neste momento.
- `<img>` permanece em BrandLogo e renderizadores documentais/base64 onde o optimizer do Next não é adequado.
- Frontend ainda não possui test runner configurado; item movido para certificação.

## Sprint 20.5 — Frontend AppSec Closure

Status: concluída em 5 de julho de 2026.

Correções frontend:

- `frontend/app/(platform)/reports/visita/page.tsx` passou a revogar object URLs criados para previews locais de fotos ao remover cada item e no unmount da página.
- `frontend/packages/types/index.ts` alinhou `AssetLifecycleEvent` ao contrato público sanitizado do backend: performer não expõe e-mail e anexos não expõem campos internos.

Decisões:

- timelines continuam consumindo `AssetLifecycle.timeline` como fonte oficial;
- frontend não deve depender de `metadata` bruto, `storageKey`, `eventId` ou `deletedAt`;
- downloads e ações em anexos continuam exclusivamente por endpoints autorizados.

## Sprint 22 — Production Readiness frontend notes

Status: validado em 6 de julho de 2026 dentro do gate RC local.

Alterações frontend:

- `packages/api/client.ts` passou a tratar `NEXT_PUBLIC_API_BASE_URL` relativo, permitindo `/api/v1`
  atrás de reverse proxy same-origin;
- `NEXT_PUBLIC_ENABLE_DEMO` passou a defaultar para `false`;
- `.env.example` do frontend passou a documentar demo bridge como opt-in;
- smoke de release valida rotas principais Platform e Operator contra build real.

Validações:

- `npm run build` passou;
- `npm run lint` passou;
- `npm run release:smoke:frontend` passou contra frontend em `127.0.0.1:4000` e API em
  `127.0.0.1:3001`.

Observação operacional:

- o pacote Next alerta que `next start` não é o modo ideal para `output: standalone`; o Dockerfile de
  produção usa o servidor standalone gerado pelo build.

## Sprint 22.5 — External RC Closure frontend notes

Status: executado em 10 de julho de 2026.

Correções:

- adicionado override `postcss@8.5.16` para fechar advisory transitivo reportado via `next`;
- lockfile atualizado por `npm install`.

Validação:

- `npm audit --json`: 0 vulnerabilidades;
- `npm run lint`: passou com 2 warnings existentes;
- `npm run build`: passou.

Decisão operacional:

- frontend V1 continua assumindo um backend isolado por instalação/cliente;
- deployments same-origin devem usar `/api/v1`;
- Demo Dataset/bridge permanece opt-in e desabilitado por padrão.

RC externo:

- smoke HTTPS externo ainda não foi executado por ausência de ambiente externo.

## Product Backlog Closure 01 — Product Registration, Pricing Entry Point, Customer Address and Reports Preview

Status: concluído em 10 de julho de 2026.

Correções aplicadas:

- cadastro de produto reorganizado em seções profissionais: identificação, classificação técnica, fornecedor contextual e descrição;
- categoria passou a usar sugestões reais derivadas do catálogo carregado, mantendo `category` como string do backend;
- SKU e código interno passaram a ter UX de sugestão/entrada controlada, preservando unicidade no backend;
- fornecedor não foi vinculado diretamente ao produto, pois o domínio real associa fornecedores via Procurement/Purchase Orders;
- CTA superior “Novo preço” foi removido; criação/revisão de preço fica na aba Preços e continua usando Pricing Domain;
- criação de cliente passou a permitir endereço inicial via endpoint oficial `/customers/:id/addresses`;
- falha ao salvar endereço não duplica cliente em retry;
- consulta de CEP foi adicionada como adaptador isolado ViaCEP, sem impedir edição manual;
- criação de equipamento agora deixa explícito quando o cliente selecionado não possui endereços;
- drawer de preview de Modelos de Documentos passou para layout vertical com preview legível e metadados menos duplicados.

Validação:

- `npm run lint` passou com 2 warnings preexistentes;
- `npm run build` passou;
- `git diff --check` passou antes da documentação.

## Product Backlog Closure 01.1 — Product Form, Supplier Resolution and Pricing Flow Fix

Status: concluído em 10 de julho de 2026.

Correções aplicadas:

- `ProductFormDrawer` substituiu categoria livre/datalist por select visível com categorias oficiais
  e opção `Outros` com campo obrigatório de categoria customizada;
- edição restaura categoria conhecida como opção selecionada e categoria desconhecida como `Outros`
  preenchido;
- SKU e código interno usam entrada assistida com prefixos técnicos e referências existentes sem
  remover a validação de unicidade do backend;
- fornecedores ativos são carregados de `GET /suppliers?page=1&limit=100&active=true` dentro do fluxo
  do formulário de produto;
- falha ao carregar fornecedores aparece como erro com retry, não como estado vazio;
- criação de fornecedor reaproveita o `SupplierDrawer` oficial, atualiza opções e auto-seleciona o
  fornecedor recém-criado quando o formulário de produto está aberto;
- produto envia `primarySupplierId` para persistência real no backend;
- aba Pricing abre sempre o `PricingDrawer` oficial para OWNER e o drawer trata loading/erro/estado
  vazio de produtos;
- fluxo de criação/revisão de preço mantém `pricingApi.createProductPricing` e
  `pricingApi.revisePricing`.

Validação:

- frontend `npm run lint` passou com 2 warnings preexistentes;
- frontend `npm run build` passou;
- backend `npm run lint`, `npm run build` e `npm test` passaram;
- Prisma `validate` e `generate` passaram com `DATABASE_URL` local.

## Product Backlog Closure 03 — PDF Exports and Signature UX

Status: concluído em 10 de julho de 2026.

Correções aplicadas:

- `ExportButton` agora possui ação PDF real via backend, com pending state, erro e download Blob;
- `/operacoes`, `/documentos` e `/equipamentos` passam filtros ativos para endpoints PDF;
- Settings/Assinaturas foi redesenhado com Drawer lateral claro para criação/edição;
- assinatura suporta dois modos explícitos: upload de imagem e desenho freehand;
- desenho freehand usa canvas pointer/touch/mouse, valida traço vazio, gera PNG transparente e envia
  pelo endpoint oficial `POST /signatures/:id/upload`;
- listagem de assinaturas usa `hasImage`, nunca `imageStorageKey`;
- assinaturas inativas permanecem visíveis; deletadas deixam de aparecer porque o backend filtra
  `deletedAt=null`.

## Product Backlog Closure 02 — Reports real preview/render/download

Status: concluído em 10 de julho de 2026.

Alterações frontend:

- `/reports` passou a selecionar uma Operation real para preview/emissão/download por tipo documental.
- `TemplatePreviewDrawer` preserva layout vertical, mas agora prioriza:
  - identidade do relatório;
  - resumo compacto;
  - fonte real do preview;
  - `DocumentViewer` oficial em área ampla.
- `DocumentViewer` passou a renderizar componentes `signature` do blueprint oficial.
- `/documentos` permanece como central/histórico dos documentos emitidos.

Validação:

- `npm run lint` passou com 2 warnings preexistentes;
- `npm run build` passou.

## Product Backlog Closure 04 — Avatar e Notifications

- `/profile` agora usa crop/reposition antes do upload de avatar;
- avatar final enviado ao backend é PNG 512×512;
- shell/topbar usa componente compartilhado de avatar e reflete `avatarAssetId` da sessão;
- Notification Bell da Platform consome endpoints reais;
- Notification Bell do Operator consome unread/list/read-all reais;
- não há estado local fake de notificações.

## Document Semantics Closure — explicit preview modes and Laudo type

Status: concluído em 10 de julho de 2026.

Alterações frontend:

- `/reports` passou a exibir dois caminhos distintos nos cards:
  - “Visualizar modelo”;
  - “Pré-visualizar com dados reais”.
- Model preview usa `templateId`, não exige Operation e não mostra render/download.
- Real data preview usa `operationId + type` e mantém render/download oficiais.
- `DocumentTemplateType` frontend recebeu `TECHNICAL_OPINION`.
- `DOCUMENT_KIND_LABEL` diferencia:
  - `TECHNICAL_REPORT`: Relatório de Visita Técnica;
  - `TECHNICAL_OPINION`: Laudo Técnico;
  - `REPORT`: Relatório legado.
- `/documentos` passa a filtrar/exibir `TECHNICAL_OPINION`.

Validação:

- `npm run lint` passou com 2 warnings preexistentes;
- `npm run build` passou.
# Closure — Technical Report Creation UX (2026-07-14)

- Central de Relatórios now selects Technical Report equipment only in Content through a searchable multi-select; Origin no longer exposes the ambiguous single-equipment field.
- Weekly/semiannual free-text syntax was replaced with the persistent checklist catalog, structured execution toggles, and per-item observations.
- Added `/maintenance-checklists` for catalog management and inline creation for OWNER/MANAGER.
- Technical Report image upload was removed from the workflow; PMOC keeps the existing secure image flow.
# Work Order wizard closure — 14/07/2026

- O wizard da Central permite escolher Operation existente ou criar a OS do zero.
- O modo novo coleta cliente/responsável na origem e múltiplos equipamentos, solicitação,
  execução/checklist e observações no conteúdo.
- Evidências fotográficas são opcionais e a assinatura continua obedecendo ao template.
- O DocumentViewer suporta a galeria oficial de duas colunas recebida no Blueprint.
