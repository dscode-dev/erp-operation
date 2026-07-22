# Frontend Integration

## Execuções dos Operadores

Use `GET /operator-executions?month=YYYY-MM` na visão de gestão e preserve `month`, busca e paginação. Ao selecionar um operador, carregue o resumo por `/:operatorId` e alterne o mesmo endpoint `/:operatorId/operations` entre `HISTORY` e `AGENDA`. Os números já chegam calculados pelo backend; não recompute taxa, atraso ou duração no navegador e não apresente valores de comissão.

Somente OWNER/MANAGER devem visualizar rota e menu. Um `403` continua sendo autoridade do backend. A linha de operação pode abrir o `OperationDetailDrawer` oficial pelo `id` retornado.

## Operator — fluxo OS/RVT concluído em campo

Criação autônoma deve oferecer somente Ordem de Serviço e Relatório de Visita Técnica. O fluxo oficial é: criar Operation `DRAFT` → aceitar/iniciar Assignment → salvar coleta e assinatura → salvar/enviar Handoff → concluir Assignment → finalizar Handoff → renderizar documento → baixar/compartilhar pelo endpoint autenticado.

Para documentos especiais criados pela gestão, o Operator apenas executa a Assignment e envia a coleta; a conclusão permanece em `REVIEW`. O frontend não deve inferir permissão somente pelo tipo: erros `403/409` do backend continuam autoritativos.

Se a renderização falhar após a conclusão, a área Documentos pode repetir `save/submit/finalize/render` para OS/RVT concluídas, sem criar documento paralelo.

## PMOC — confirmação de cobertura ativa

Ao selecionar o cliente em um novo PMOC, consulte `GET /pmoc/active-coverage?customerId=...`. Se `hasActiveCoverage` for verdadeiro, exiba os PMOCs encontrados e solicite confirmação antes da criação. Somente após confirmação envie `confirmActiveCoverage: true` no `POST /pmoc`.

O frontend também deve tratar `409 PMOC_ACTIVE_COVERAGE_CONFIRMATION_REQUIRED`, pois uma cobertura pode ser criada entre a consulta e o envio. Nesse caso, deve atualizar o aviso e pedir nova confirmação. Não aplicar essa verificação durante edição ou revisão de um PMOC existente.

## ORBIT_SECURITY_FIX01 — integração de ownership

- O frontend não deve filtrar operações, documentos, fotos, histórico ou execuções por operador.
  A API já devolve somente o conjunto autorizado pelo `Assignment` vigente.
- Não use `operation.operatorId` para inferir permissão, nem trate conhecer um ID como autorização.
- Em resposta `403 FORBIDDEN`, descarte qualquer estado local do recurso, não tente abrir preview,
  imagem ou download e apresente a mensagem padrão de acesso indisponível.
- Assignments cancelados/rejeitados revogam imediatamente o acesso; atualize lista/detalhe após uma
  transição. `COMPLETED` permanece consultável pelo operador originalmente atribuído.
- URLs de foto e download continuam autenticadas e privadas. Não persistir URL, token, Base64,
  `storageKey` ou path no cliente.
- Nenhum componente, rota ou payload frontend mudou nesta correção.

## DC-05 — fluxo do Recibo / Garantia

Escolha origem manual ou OS concluída; preencha snapshots editáveis; envie garantia nula ou 1–3650
dias; salve o Handoff e selecione uma assinatura institucional ativa. Não envie assinatura do
cliente, fotos ou relacionados. Finalize a revisão e reutilize `DocumentViewer` em Preview → Render
→ Download. Somente OWNER/MANAGER devem visualizar o fluxo.


## PMOC — fotos, assinatura técnica e assinatura do cliente

- Em cadastro sem OS, fotos e assinatura ficam somente em memória. Ao concluir, a primeira OS é
  criada pelo fluxo oficial e os dados são persistidos em `Operation`/Handoff.
- Em edição, usar a execução PMOC mais recente que possua Operation; listar as fotos autenticadas e
  permitir novas imagens sem criar galeria do plano.
- Exibir separadamente `responsibleTechnician` e `technicalSignature`: operador de campo não é o
  responsável técnico por inferência.
- Mostrar o coletor por `customerSignature.collectedBy`, com fallback visual para `collectedBy` e
  `operation.operator`; nunca inferir pelo usuário atualmente autenticado.
- Substituição da assinatura usa o mesmo PATCH oficial e mantém revisão/auditoria append-only.

## PMOC UX-02.1

- Antes de exibir assinatura, consultar `GET /documents/configuration/types/PMOC`. Tratar loading e
  erro separadamente; nunca assumir `NONE` enquanto a consulta estiver pendente ou falhar.
- FIXED/HYBRID exibem a assinatura institucional readonly e o override usa o `signatureOverrideId`
  do PMOC, sem alterar o Template. COLLECTED/HYBRID informam a coleta durante a execução.
- O detalhe PMOC abre o `DocumentViewer` com `{ operationId, type: "PMOC", documentId? }`. Preview,
  render, rerender stale e download usam somente o Document Engine.
- Execution Requests retornam `operation.signedAt`, `operation._count.photos`, documentos e todos os
  equipamentos. O drawer de OS deve enviar `inspectedEquipments[]`; `equipmentId` permanece apenas
  como equipamento principal compatível.
- Platform e Operator salvam fotos pela atualização oficial da Operation. Exibir progresso `x/4`,
  permitir salvamento parcial e bloquear somente concluir/renderizar enquanto `x < 4`.
- Downloads usam `api.blob()`. Criar object URL temporária, acionar o download e revogá-la; não
  decodificar Base64.

## PMOC UX-02

- Consultar `GET /pmoc/name-suggestion` ao selecionar cliente. Atualizar o campo apenas enquanto
  não houver edição manual; se continuar automático, omitir `name` no `POST /pmoc`.
- Carregar escopos com `GET /technical-catalogs?type=PLAN_SCOPE&workflow=PMOC&includeGeneral=true&active=true`
  e enviar IDs em `scopeCatalogIds`; títulos nunca são fonte de verdade do frontend.
- Novos escopos usam exclusivamente o CRUD do Catálogo Técnico. Reconsultar para reutilização
  imediata no Wizard.
- Exibir `plan.scopes[].technicalCatalog.title`, com `coverage` apenas como fallback histórico.
- Reagendar pelo endpoint oficial da request; nunca recalcular a agenda no browser.

## PMOC Foundation — Bloco 3

- Dashboard: consuma somente `GET /pmoc/stats`. Não conte requests nem classifique atrasos no
  frontend; `indicator` já representa a situação operacional oficial.
- Calendário: envie `from/to` ISO do intervalo visível e agrupe visualmente `calendar.items` por
  dia. Nunca crie eventos de agenda.
- Cards e detalhe: use `plan.overview` para progresso, restantes, saúde, atraso, última OS e último
  documento. `expectedExecutions` já considera a recorrência e a cobertura.
- Cliente: `GET /pmoc?customerId=...&active=true`; Equipamento:
  `GET /equipments/:id/pmoc` ou `GET /pmoc?equipmentId=...`. Os itens já contêm `overview`.
- Timeline: renderize a ordem devolvida por `GET /pmoc/:id/history`; `source`, `action`, `execution`,
  `operationId` e `document.id` permitem navegação sem interpretar metadata.
- Pausar/retomar usa o PATCH PMOC existente com `generationMode: PAUSED` ou o modo operacional
  escolhido. Gerar, reagendar e cancelar continuam usando os endpoints do Bloco 2.

## PMOC Foundation — Bloco 2

- Use `/pmoc` para listar/criar planos e `/pmoc/:id` para resumo, execuções e histórico.
- O wizard possui quatro passos: plano/cobertura, defaults da OS, automação/primeira execução e
  política de assinatura. As projeções exibidas no formulário são informativas; datas oficiais,
  sequência e recorrência continuam no backend.
- Para “Gerar primeira OS agora”, crie o PMOC, obtenha sua primeira Execution Request e abra o
  `OperationCreationDrawer` com o prefill oficial. A confirmação usa `generate-work-order`.
- O modo de assinatura vem de `GET /documents/configuration`; FIXED/HYBRID podem receber somente
  um override institucional cadastrado, e COLLECTED apenas explica a coleta em campo.
- Reagendar chama `PATCH /pmoc/execution-requests/:id/reschedule`; cancelar e gerar continuam nos
  endpoints oficiais. Nunca crie outra request para substituir a atual.
- Ao editar operador/técnico padrão, envie `applyDefaultsToPendingExecutions: true` somente após
  confirmação explícita. O backend nunca altera execuções já geradas/concluídas.
- `OperationDetail.maintenanceExecution.pmocExecutionRequest` e Assignment trazem contexto PMOC
  pronto para a Platform e o Operator; não derive autorização ou status localmente.

## PMOC Foundation — identidade das execuções

- Exiba `executionNumber` com três dígitos; não derive identidade do número da OS.
- Nunca envie número, datas projetadas ou metadata do scheduler em create/update.
- Retry e geração manual usam o mesmo `executionRequest.id`; não crie outra solicitação.
- Para histórico, consuma `event.execution`. OS e data executada podem ser nulas.
- `generatedOperationId` serve para navegação; a OS continua no workflow oficial.

## PMOC Foundation — fluxo operacional

O PMOC deve ser criado/selecionado antes da OS. Nunca crie PMOC a partir de Operation.

1. obtenha a solicitação PENDING/FAILED em `GET /pmoc/:id/execution-requests`;
2. se necessário, crie por `POST /pmoc/:id/execution-requests`;
3. carregue `GET /pmoc/execution-requests/:id/prefill`;
4. abra o `OperationCreationDrawer` oficial;
5. envie a revisão em `POST /pmoc/execution-requests/:id/generate-work-order`;
6. use `response.operationId` para abrir a Operation/OS normal.

Não chame `POST /operations` separadamente. `FAILED` pode ser revisada novamente; `GENERATED`
nunca gera segunda OS. `signatureOverrideId` não altera o template e o frontend nunca resolve sua
imagem.

## DC-03.1 — responsabilidade técnica e detalhamento dos equipamentos

No passo Conteúdo do Laudo, colete `technicalOpinionResponsible` e `technicalOpinionCrea`. Para
cada item de `inspectedEquipments`, além do UUID, envie `sector` como local de instalação,
`systemType` e `currentSituation`. O wizard bloqueia o avanço quando esses campos estão vazios; o
backend permanece a autoridade de validação relacional e limites.

Não monte dados do solicitante no frontend. Razão social, CNPJ/CPF, contato principal e endereço
são resolvidos pelo DocumentContext a partir do cliente selecionado e aparecem no mesmo Blueprint
consumido por Preview e PDF.

## DC-03 — fluxo do Laudo Técnico

Na Central de Relatórios, crie/atualize uma Operation `DRAFT` com os quatro campos
`technicalOpinion*` e `inspectedEquipments[]`. O equipamento principal pode ser o primeiro item
selecionado; a tabela autoritativa é `inspectedEquipments`.

Use somente `DocumentViewer` com `{ operationId, type: "TECHNICAL_OPINION" }`. O frontend não
monta introdução, tabela, assinatura ou seção. A origem seleciona cliente, endereço e
responsável; os equipamentos múltiplos e o conteúdo ficam na etapa Conteúdo; a terceira etapa
coleta somente assinatura quando exigida.

Não envie checklist ou fotos para compor o Laudo. Preview, Render, Download e catálogo usam os
endpoints documentais existentes.

## Wizard de Ordem de Serviço

No primeiro passo, ofereça duas origens mutuamente exclusivas:

- Operation existente: selecione uma Operation concluída e não duplique seus dados/assets;
- criar do zero: colete cliente, endereço e responsável, depois crie uma Operation `DRAFT` pela API.

No modo novo, envie todos os equipamentos selecionados em `inspectedEquipments` e use o primeiro
também como `equipmentId` primário. Serviços e checklist são apresentados em uma única área
semântica, mas continuam enviados em `serviceDescription` e `checklist`. Fotos são opcionais e só
devem ser enviadas quando selecionadas. O Viewer deve renderizar `imageGallery` diretamente e nunca
montar galeria ou PDF fora do Blueprint.

## Work Order — QR textual

No `WORK_ORDER`, mostre o item `Código QR` recebido no metadata de Equipamento. Não espere imagem
ou componente `qrCode`, não gere QR local e não reserve espaço visual para ele. O scanner de
equipamentos continua usando o lookup oficial fora do documento.

## Refinamento TECHNICAL_REPORT — 14/07/2026

O frontend deve renderizar `sections` na ordem recebida. `technical-report-inspected-equipments`
tem o título `Equipamentos` e pode conter uma ou várias linhas. Não criar QR, materiais, fotos ou
documentos relacionados como fallback neste relatório. O cabeçalho do `DocumentViewer` espelha o
PDF em duas linhas, mantendo o número já prefixado devolvido em `header.documentNumber`; o Renderer
PDF usa o mesmo alinhamento superior entre título e empresa.

## DC-02 — Relatório de Visita Técnica

Na Central, persista os cinco campos textuais da Operation separadamente: `reportedIssue`
(objetivo), `technicalDiagnosis`, `serviceDescription` (atividades), `technicalRecommendations` e
`observations`. Checklist é complementar e não substitui a narrativa técnica.

Fluxo obrigatório:

1. criar/atualizar a Operation;
2. abrir `DocumentViewer` com `{ operationId, type: "TECHNICAL_REPORT" }`;
3. preview oficial;
4. render oficial;
5. download pelo `documentId`;
6. atualizar o catálogo por `GET /documents`.

Não montar seções, QR, fotos ou assinaturas no frontend. `pageBreakAfter` e os componentes do
Blueprint são a única fonte de composição. A quantidade de páginas depende do conteúdo e da tabela
de equipamentos.

A propriedade técnica raiz `version` não deve ser exibida no documento. O rodapé público consome
somente `footer.content`; o alinhamento da logo é responsabilidade do `DocumentViewer`.

## Product Backlog Closure 07 — Central de Relatórios

Use `/reports` como orquestrador dos workflows e `/report-templates` somente para modelos. Antes do preview, consulte a configuração por tipo; o backend continua sendo a autoridade para template, branding e assinatura. Após render, atualize `GET /documents`: o `OperationDocument` já estará no repositório. Para PMOC, vincule a Operation a uma MaintenanceExecution. RECEIPT mantém acesso exclusivo de OWNER.

## DC-01.2 — QR e paridade da Work Order

Em modo `FIXED`, não espere itens `collected`: apenas as assinaturas institucionais configuradas são
retornadas. `pageBreakAfter` é uma orientação de paginação do Blueprint, não uma nova regra de
negócio.

Para documentos históricos que ainda possuam `qrCode`, o Viewer preserva compatibilidade. Novos
Blueprints de `WORK_ORDER` usam exclusivamente o metadata `Código QR`. Para navegação/scanner, envie
o identificador persistido ao lookup oficial.

Em template `HYBRID`, `signature.signatures` pode conter simultaneamente itens `institutional` e
`collected`. Exiba na ordem entregue; não procure assinaturas, não reconstrua políticas e não leia
`storageKey`.

## DC-01 — Work Order

Ao criar/encerrar uma Operation, envie separadamente `reportedIssue`, `serviceDescription` e
`observations`. Use uma linha por serviço quando quiser apresentação em lista. A OS continua em
`GET /documents/operations/:operationId/WORK_ORDER/preview`, render oficial e download por
`documentId`. Não monte seções no frontend.

## Document Engine D1

Use `GET /documents` como única fonte da Central de Documentos. Não derive o catálogo de Operations.
Envie filtros/paginação ao backend e use o `id` em `GET /documents/:id/preview`,
`POST /documents/:id/render` e `GET /documents/:id/download` pelo `DocumentViewer`.

`institutionalSignatureIds` é uma lista ordenada sem limite artificial. As flags
`executionSignatureClient`, `executionSignatureTechnician` e `executionSignatureOperator` definem
os papéis. O frontend nunca resolve imagens ou combina assinaturas.

## Product Backlog Closure 05 — assinatura em preview real e PDF

O frontend não precisa mudar contratos para exibir assinatura executada.

Regras de consumo:

- Preview de modelo continua usando `GET /documents/templates/:templateId/preview`; ele é estrutural
  e não deve exibir assinatura de Operation.
- Preview com dados reais deve usar `GET /documents/operations/:operationId/:type/preview`.
- Render/download devem usar o fluxo oficial do `DocumentViewer`.
- Para documentos `WORK_ORDER`, `TECHNICAL_REPORT`, `REPORT` e `RECEIPT`, uma Operation assinada em
  campo retorna a assinatura coletada dentro de `SignatureComponent.signatures[].image`.
- O PDF renderizado usa o mesmo blueprint; se a assinatura aparece no preview real, ela deve aparecer
  no PDF emitido.

Semântica:

- Assinatura fixa: cadastro reutilizável do domínio Signature, configurada no template.
- Assinatura coletada: artifact da execução da Operation, normalmente capturada no Operator PWA.
- Assinatura híbrida: combina assinatura fixa e área/assinatura coletada quando configurado.

O frontend não deve converter assinatura coletada em assinatura fixa nem armazenar nova imagem de
assinatura fora da Operation.

Achado de integração: a rota Platform `/reports/visita` permanece visual-only e não persiste a
assinatura. Para aparecer em preview/PDF real, a assinatura precisa chegar ao backend em
`Operation.signatureData`.

## Product Backlog Closure 05.1 — Platform Visit Report consolidated

O achado acima foi resolvido: `/reports/visita` agora é Operation-bound.

Fluxo frontend oficial:

1. selecionar uma Operation real;
2. editar checklist/observações;
3. anexar fotos PNG/JPEG;
4. coletar assinatura;
5. salvar via `PATCH /operations/:id`;
6. abrir `DocumentViewer` com:

```tsx
<DocumentViewer source={{ operationId, type: 'TECHNICAL_REPORT' }} />
```

Após salvar, fotos e assinatura entram no `DocumentContext` e aparecem no preview real e no PDF
renderizado pelo Document Engine.

O backend aceita o payload de evidências da Operation dentro do contrato oficial (até 16 fotos de
5 MiB cada). Se o tamanho agregado ultrapassar o limite HTTP configurado, retorna `413` com código
`UPLOAD_FILE_TOO_LARGE`; a UI deve preservar o formulário e orientar a remoção ou compressão de
fotos. Esse erro não deve ser apresentado como falha interna nem disparar retry automático.

## Sprint 21 — Performance and observability integration

Novos endpoints operacionais disponíveis para health/observabilidade:

- `GET /health/live`: liveness leve; use em checks de processo.
- `GET /health/ready`: readiness com PostgreSQL e storage; use em deploy/health de infraestrutura.
- `GET /metrics`: formato Prometheus text/plain, sem envelope JSON. Não deve ser consumido pela UI
  comum.

O frontend continua consumindo apenas contratos de negócio existentes. Nenhum contrato funcional foi
alterado na Sprint 21.

### Performance budgets relevantes para UI

| Fluxo                              |            Budget V1 |
| ---------------------------------- | -------------------: |
| Listagens paginadas                | p95 backend ≤ 300 ms |
| Mutations críticas                 | p95 backend ≤ 500 ms |
| Preview simples do Document Engine | p95 backend ≤ 800 ms |
| Dashboard atual em fan-out         | p95 local ≤ 1.200 ms |

### Orientações de integração

- Não remover paginação: toda listagem deve manter `page`/`limit`.
- Preservar filtros ao paginar; isso evita refetches amplos e mantém o backend em queries indexáveis.
- Evitar chamadas duplicadas no dashboard. A Sprint 21 mediu o dashboard atual com 17 chamadas por
  iteração e manteve p95 local em 181.06 ms; endpoint agregado só será necessário se staging indicar
  gargalo real.
- Usar abort/cancelamento em filtros digitáveis e drawers para evitar requisições concorrentes
  obsoletas.
- `DocumentViewer` deve continuar usando preview/render/download oficiais. Não reintroduzir preview
  local.

## Base URL

Desenvolvimento padrão:

```text
http://localhost:3000/api/v1
```

Cada instalação white label fornece sua própria origem. O path permanece `/api/v1`.

## Response model

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};
```

Toda resposta possui header `X-Request-Id`. Guarde esse valor em logs de suporte quando uma chamada
falhar.

## Paginação padronizada

Sprint 14.5 padronizou metadados de paginação no backend.

```ts
type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number; // mínimo 1, mesmo quando total=0
};

type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};
```

Regras para UI:

- não assumir `totalPages=0` em listas vazias;
- preservar filtros ao trocar `page`/`limit`;
- usar `pagination.total` para empty states;
- payloads enriquecidos podem trazer campos adicionais além de `items` e `pagination`.

## Auth recap

Papéis oficiais:

```ts
export type Role = 'OWNER' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
```

Fluxo preservado:

1. `POST /auth/login`
2. guardar `accessToken`, `refreshToken`, `expiresIn`;
3. chamar `GET /auth/me`;
4. renovar com `POST /auth/refresh` usando estratégia single-flight;
5. limpar sessão em `AUTH_SESSION_REVOKED`, `AUTH_USER_INACTIVE` ou falha de refresh.

Operadores não podem ver telas financeiras nem configurações administrativas. Para a Sprint 2:

- `OWNER`: tela de configurações completa;
- `MANAGER`: tela de configurações em modo leitura;
- `OPERATOR` e `VIEWER`: não mostrar rota/tela de organização.

O backend é a autoridade final. Trate HTTP 403 como bloqueio definitivo.

## Types for organization foundation

```ts
export type BrandAssetType = 'LOGO' | 'HEADER' | 'FOOTER';

export type DocumentTemplateType =
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'PMOC';

export type SignatureMode = 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';

export type Organization = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  segment: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSettings = {
  id: string;
  organizationId: string;
  language: string;
  timezone: string;
  currency: string;
  documentPrefix: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentTemplate = {
  id: string;
  organizationId: string;
  type: DocumentTemplateType;
  name: string;
  headerContent: string;
  footerContent: string;
  observations: string;
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
  requiresSignature: boolean;
  signatureMode: SignatureMode;
  signatureId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Signature = {
  id: string;
  name: string;
  title: string;
  hasImage: boolean;
  mimeType: string | null;
  originalFileName: string | null;
  fileSize: number | null;
  active: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandAsset = {
  id: string;
  organizationId: string;
  type: BrandAssetType;
  storageKey: string;
  mimeType: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
};

export type BrandAssetWithContent = BrandAsset & {
  contentBase64: string;
};
```

## Initial app bootstrap for white label

Após autenticação:

1. Chamar `GET /organization`.
2. Aplicar `primaryColor` e `secondaryColor` no tema da aplicação.
3. Chamar `GET /organization/settings` para idioma, timezone, moeda e prefixo documental.
4. Chamar `GET /organization/templates` ao abrir a tela de templates/documentos.
5. Buscar assets salvos individualmente com `GET /organization/assets/:id` quando a UI tiver IDs
   persistidos/listados por uma tela administrativa futura.

Nesta sprint não há endpoint de “asset atual por tipo”. A tela administrativa deve manter os IDs
retornados em upload/listagem futura quando essa UX for definida, ou exibir os uploads recentes na
própria tela após o POST.

## Organization screen

### Read

```ts
const organization = await api.get<ApiSuccess<Organization>>('/organization');
```

### Update

Somente `OWNER`.

```ts
type UpdateOrganizationPayload = Partial<{
  legalName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
}>;
```

```http
PATCH /organization
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Campos extras são rejeitados. Normalize cores em hexadecimal `#RRGGBB`.

## Settings screen

```ts
type UpdateOrganizationSettingsPayload = Partial<{
  language: string; // exemplo: pt-BR
  timezone: string; // exemplo: America/Recife
  currency: string; // exemplo: BRL
  documentPrefix: string; // A-Z, 0-9, _ e -
}>;
```

`MANAGER` pode visualizar; somente `OWNER` pode salvar.

## Templates screen

Use `GET /organization/templates` para carregar todos os templates.

Criar:

```ts
type CreateDocumentTemplatePayload = {
  type: DocumentTemplateType;
  name: string;
  headerContent: string;
  footerContent: string;
  observations: string;
  isDefault?: boolean;
  isActive?: boolean;
  requiresSignature?: boolean;
  signatureMode?: SignatureMode;
  signatureId?: string | null;
};
```

Atualizar:

```ts
type UpdateDocumentTemplatePayload = Partial<CreateDocumentTemplatePayload>;
```

Excluir:

```http
DELETE /organization/templates/:id
```

Se `isDefault=true`, o backend remove o default anterior do mesmo `type`.

Assinatura por template:

- `signatureMode='NONE'`: sem assinatura; envie `requiresSignature=false` e `signatureId=null`;
- `FIXED`: usa uma assinatura cadastrada; exige `signatureId`;
- `COLLECTED`: indica assinatura coletada no futuro; não usa `signatureId`;
- `HYBRID`: aceita assinatura cadastrada e futura coleta; exige `signatureId`.

Conteúdo de `headerContent`, `footerContent` e `observations` é texto livre controlado pelo
frontend. Se o frontend permitir HTML, sanitize no cliente antes de renderizar. O backend apenas
valida tamanho e tipo.

## Document configuration and signatures

Sprint 7 adiciona configuração documental. Não há mudança no fluxo de render/download ainda; o
builder continuará usando o placeholder de assinatura até sprint posterior.

Endpoints para tela de configuração:

```http
GET /documents/configuration
GET /documents/configuration/types/:type
GET /documents/configuration/templates/:templateId
```

Use esses endpoints para exibir organização, settings, template default, templates ativos e a
assinatura associada. `OPERATOR` recebe 403.

CRUD de assinaturas:

```http
GET    /signatures?page=1&limit=20&search=&active=true
GET    /signatures/:id
POST   /signatures
PATCH  /signatures/:id
DELETE /signatures/:id
POST   /signatures/:id/upload
GET    /signatures/:id/download
```

Permissões de UX:

- `OWNER`: mostrar criação/edição/upload/exclusão;
- `MANAGER` e `VIEWER`: mostrar leitura/download;
- `OPERATOR`: ocultar tela/ações.

Upload de assinatura:

```ts
const form = new FormData();
form.append('file', file); // png, jpg ou jpeg; máximo 2 MiB
await api.post(`/signatures/${id}/upload`, form);
```

Download retorna `contentBase64`; crie um `Blob` com `mimeType` para preview. Erros importantes:
`SIGNATURE_IMAGE_REQUIRED`, `UPLOAD_INVALID_MIME_TYPE`, `UPLOAD_INVALID_EXTENSION`,
`UPLOAD_FILE_TOO_LARGE`.

## Assets and branding uploads

Endpoint:

```http
POST /organization/assets
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Campos:

- `type`: `LOGO`, `HEADER` ou `FOOTER`;
- `file`: arquivo.

Regras:

- extensões: `png`, `jpg`, `jpeg`, `svg`, `pdf`;
- MIME types: `image/png`, `image/jpeg`, `image/svg+xml`, `application/pdf`;
- tamanho máximo: 5 MiB.

Exemplo:

```ts
async function uploadBrandAsset(type: BrandAssetType, file: File, accessToken: string) {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);

  const response = await fetch(`${API_BASE_URL}/organization/assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Request-Id': crypto.randomUUID(),
    },
    body: form,
  });

  return response.json() as Promise<ApiSuccess<BrandAsset> | ApiError>;
}
```

Não defina manualmente `Content-Type` em `fetch` com `FormData`; o browser define o boundary.

### Reading an asset

```ts
const response = await api.get<ApiSuccess<BrandAssetWithContent>>(
  `/organization/assets/${assetId}`,
);

const dataUrl = `data:${response.data.mimeType};base64,${response.data.contentBase64}`;
```

Para PDF, abra como download/visualização controlada. Para SVG, renderize com cuidado e evite
injetar conteúdo como HTML arbitrário.

## Error handling for organization UI

| Code                       | Frontend behavior                                    |
| -------------------------- | ---------------------------------------------------- |
| `FORBIDDEN`                | Mostrar sem permissão; esconder ação para esse papel |
| `ORGANIZATION_NOT_FOUND`   | Instalação sem seed; acionar suporte/admin           |
| `VALIDATION_ERROR`         | Marcar campos inválidos usando `details.violations`  |
| `UPLOAD_FILE_REQUIRED`     | Solicitar seleção de arquivo                         |
| `UPLOAD_FILE_TOO_LARGE`    | Informar limite de 5 MiB                             |
| `UPLOAD_INVALID_MIME_TYPE` | Informar formatos permitidos                         |
| `UPLOAD_INVALID_EXTENSION` | Informar extensões permitidas                        |
| `STORAGE_FILE_NOT_FOUND`   | Informar asset indisponível e sugerir novo upload    |

## Recommended frontend route behavior

- `/settings/organization`: OWNER edita, MANAGER lê.
- `/settings/templates`: OWNER edita, MANAGER lê.
- `/settings/branding`: OWNER edita, MANAGER lê.
- OPERATOR/VIEWER: redirecionar ou esconder rotas de settings.

Não use regras de UI como segurança. Sempre trate 401/403 vindos do backend.

## Sprint 3: team foundation

### Types

```ts
export type UserTheme = 'SYSTEM' | 'LIGHT' | 'DARK';

export type UserPermissions = {
  canFinancial: boolean;
  canUsers: boolean;
  canReports: boolean;
  canSchedules: boolean;
  canTemplates: boolean;
};

export type UserPreferences = {
  id: string;
  userId: string;
  theme: UserTheme;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TeamUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  avatarAssetId: string | null;
  phone: string | null;
  jobTitle: string | null;
  notes: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  permission: UserPermissions;
  preferences: UserPreferences | null;
};
```

V1 is exclusively `pt-BR`. Do not send or expect `language`, `locale` or i18n fields in user
payloads.

### Session bootstrap

After login:

1. call `GET /users/me`;
2. if `user.mustChangePassword` is `true`, navigate to the mandatory password screen;
3. do not load normal application modules before the password is changed;
4. after `PATCH /users/change-password`, clear both tokens;
5. require a new login because all sessions were revoked.

The backend also enforces this. Normal calls return HTTP 403 with
`PASSWORD_CHANGE_REQUIRED` until the change is complete. `/auth/me`, `/users/me` and
`/users/change-password` remain available for bootstrap.

### Team list

```http
GET /users?page=1&limit=20&search=manager
Authorization: Bearer <accessToken>
```

Expected data:

```ts
type PaginatedUsers = {
  items: TeamUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

Access:

- OWNER: full team screen and actions;
- MANAGER: read-only team screen;
- VIEWER: read-only team screen;
- OPERATOR: do not show the team route.

### User creation

Only OWNER:

```ts
type CreateUserPayload = {
  email: string;
  username: string;
  name: string;
  role: Role;
  phone?: string;
  jobTitle?: string;
  notes?: string;
  permissions?: Partial<UserPermissions>;
};
```

The response contains:

```ts
type CreateUserResult = {
  user: TeamUser;
  temporaryPassword: string;
};
```

Show the temporary password exactly once in a copyable confirmation dialog. Do not put it in
analytics, console logs, persistent frontend state or URLs.

Email and username conflict returns `USER_CONFLICT`.

### Update, status and soft delete

- `PATCH /users/:id`: update profile, role and permission flags;
- `PATCH /users/:id/disable`: disable and revoke sessions;
- `PATCH /users/:id/enable`: reactivate;
- `DELETE /users/:id`: soft delete.

Disabled/deleted users remain in list results. Render status from `isActive` and `disabledAt`.

For `USER_LAST_OWNER`, show that another active OWNER is required first. For
`USER_SELF_ACTION_FORBIDDEN`, prevent self-disable/delete in the UI and still handle the backend
error.

### Password reset

Only OWNER:

```http
PATCH /users/:id/reset-password
```

The response contains a new one-time `temporaryPassword`. Display it using the same protected UX as
creation. The target user's sessions are immediately revoked and their next login is restricted to
the mandatory password flow.

### Own password change

```ts
type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string; // 12 to 128 characters
};
```

On success:

```json
{
  "changed": true,
  "reauthenticationRequired": true
}
```

Clear tokens before redirecting to login. Field errors to handle:

- `PASSWORD_CURRENT_INVALID`;
- `PASSWORD_REUSE_NOT_ALLOWED`;
- `VALIDATION_ERROR`.

### Preferences

Read and update:

```http
GET /users/me/preferences
PATCH /users/me/preferences
```

Payload:

```ts
type UpdatePreferencesPayload = Partial<{
  theme: UserTheme;
  notificationsEnabled: boolean;
}>;
```

`notificationsEnabled` is only a stored preference in this sprint; there is no notification
delivery module yet.

### Avatar

Upload:

```http
POST /users/avatar
Content-Type: multipart/form-data
```

Form field: `file`.

Client validation:

- PNG/JPG/JPEG;
- max 2 MiB.

Do not set `Content-Type` manually when using `FormData`.

Read:

```ts
const response = await api.get<ApiSuccess<UserAvatarWithContent>>(`/users/avatar/${avatarAssetId}`);
const src = `data:${response.data.mimeType};base64,${response.data.contentBase64}`;
```

Delete the current user's avatar with `DELETE /users/avatar`.

### Permission rendering

The `role` remains the coarse access model. `permissions` are complementary feature flags:

- OWNER effective flags are always true;
- MANAGER flags are configured by OWNER;
- OPERATOR and VIEWER administrative flags are false.

Use flags to render future module actions, but always honor 403 from the backend. In Sprint 3, team
endpoint access is determined by the role matrix above.

### Team error handling

| Code                         | UI behavior                            |
| ---------------------------- | -------------------------------------- |
| `PASSWORD_CHANGE_REQUIRED`   | Redirect to mandatory password change  |
| `USER_CONFLICT`              | Mark email/username as already used    |
| `USER_NOT_FOUND`             | Refresh list and show unavailable user |
| `USER_LAST_OWNER`            | Explain last OWNER protection          |
| `USER_SELF_ACTION_FORBIDDEN` | Disable self-destructive action        |
| `UPLOAD_FILE_TOO_LARGE`      | Show 2 MiB avatar limit                |
| `UPLOAD_INVALID_MIME_TYPE`   | Reject invalid/forged image            |
| `UPLOAD_INVALID_EXTENSION`   | Accept only PNG/JPG/JPEG               |
| `AUTH_SESSION_REVOKED`       | Clear tokens and return to login       |

## Health

`GET /health` continua público:

- HTTP 200: aplicação e banco disponíveis;
- HTTP 503: processo disponível, banco indisponível.

## Production bootstrap

The application has no demo datasets, demo endpoints, example credentials or fallback snapshots.
After migrations, an operator runs the one-time OWNER bootstrap. The frontend authenticates with
that OWNER and uses the official team endpoints to create every additional user.

Empty installations must render the normal empty states returned by production APIs. There is no
frontend demo flag and no `/internal/demo/*` contract.

## Customer Domain

Production endpoints are ready and must be consumed without local fallback records.

```ts
type CustomerType = 'PERSON' | 'COMPANY';
type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  tradeName: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  notes: string | null;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

List:

```http
GET /customers?page=1&limit=20&search=Hospital
```

Response data has `items` and `pagination`. List items include `_count` for addresses, contacts and
attachments. Detail `GET /customers/:id` includes complete arrays.

OWNER/MANAGER can create and edit. OPERATOR/VIEWER are read-only. Only OWNER can soft-delete.

Create payload uses `type` and `name` as required fields; CPF/CNPJ and all communication fields are
optional. Use `/customers/stats` for dashboard counters.

Addresses and contacts are managed through nested endpoints. When `isPrimary=true`, the backend
automatically clears the previous primary record.

Attachment upload:

```http
POST /customers/:id/attachments
Content-Type: multipart/form-data
```

Fields: `category`, `file`. Formats PDF/PNG/JPG/JPEG, maximum 5 MiB. Read returns `contentBase64`.

Important UX states:

- distinguish PERSON and COMPANY forms;
- mask CPF/CNPJ/CEP/phone without changing backend string values;
- keep inactive customers visible with a status badge;
- debounce search;
- use `CUSTOMER_CONFLICT` for CPF/CNPJ field feedback;
- confirm soft delete and attachment deletion;
- show honest empty states when no customers exist.

## Equipment Domain

Production API is ready and must be consumed without local fallback records.

```ts
type EquipmentType =
  | 'SPLIT'
  | 'CHILLER'
  | 'CONDENSER'
  | 'EVAPORATOR'
  | 'AIR_HANDLER'
  | 'SOLAR_INVERTER'
  | 'ELECTRICAL_PANEL'
  | 'GENERATOR'
  | 'OTHER';
type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'RETIRED';
```

List:

```http
GET /equipments?page=1&limit=20&search=Samsung&customerId=<uuid>&addressId=<uuid>&status=ACTIVE&type=SPLIT
```

All filters combine with AND. Search is debounced and partial. Items include customer/address and
counts for children, metrics and attachments.

Create/update fields are documented in API_CONTRACTS. `customerId`, `type`, `name` are required on
create. Address and parent selectors must be restricted to the selected customer.

Detail includes:

- customer and address;
- parent summary and direct children;
- attachment metadata;
- latest 20 metrics;
- `qrToken` and `qrCode`.

QR UX: render a client-side visual QR from `qrCode`; do not interpret it as authentication. Image
generation and public scan resolution are not implemented.

Metrics: OWNER/MANAGER/OPERATOR may POST key/value/unit; all roles read. Use complete metric history
endpoint when opening charts.

Attachments: multipart category `PHOTO|MANUAL|WARRANTY|DOCUMENT` plus file. PDF/PNG/JPG/JPEG,
5 MiB. GET returns base64.

Status cards use `/equipments/stats`; `byType` always contains every official type. Inactive records
remain visible after soft delete.

Errors to map: `EQUIPMENT_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `EQUIPMENT_ADDRESS_MISMATCH`,
`EQUIPMENT_HIERARCHY_INVALID`, validation and upload codes.

## Agenda (calendário mensal)

A Agenda da Platform deve usar exclusivamente os contratos reais de Operations, Assignments,
Maintenance e PMOC. Não existe snapshot ou fallback local de agenda. Eventos exibem cliente,
equipamento, operador, tipo, data/horário e status conforme o domínio oficial de origem.

## QR Code operacional

O QR é o identificador oficial do equipamento. No fluxo do Operador
(Novo Atendimento → Buscar Equipamento) há o botão "Escanear QR Code" que abre
a câmera real (PWA, `@zxing/browser` — apenas QR), lê o código e chama
`GET /equipments/lookup/:qrCode`. O equipamento retornado é pré-selecionado no
wizard (mostrando nome, cliente, endereço, patrimônio, série, status e foto)
e o fluxo avança sem nova busca. A página `/operator/qr` usa o mesmo scanner +
lookup. Tratamentos: permissão negada, câmera indisponível, QR inválido (400),
equipamento inexistente (404). O formato do QR não muda.

## Relatórios (modelos) × Documentos (central)

Responsabilidades separadas:

- **Relatórios** (`/reports`): gestão de **modelos** de documento. Consome `GET /organization/templates`; OWNER cria/edita/exclui (`POST/PATCH/DELETE /organization/templates/:id`), define padrão (`isDefault`), ativa/desativa (`isActive`) e importa modelo do cliente (`POST /organization/assets`). Modelos profissionais (OS, Relatório Técnico, Visita Técnica, PMOC, Laudo, Orçamento, Recibo) compartilham identidade/cabeçalho/rodapé/tipografia e são pré-visualizados no `DocumentPaper` (preparado para a renderização dinâmica do backend).
- **Documentos** (`/documentos`): **central** de documentos emitidos. Lista exclusivamente documentos reais do Document Engine, com filtros cumulativos (cliente, equipamento, operador, tipo, status, período), preview oficial e render/download PDF pelo backend.

## Operations (atendimentos)

Domínio operacional central. O **Operator** finaliza o wizard chamando
`POST /operations` (cliente, endereço, equipamento, tipo, checklist, observações,
fotos como data URL, assinatura) — o backend cria a Operation e gera a **OS em
rascunho** automaticamente; a tela de sucesso mostra `OS #000001 criada`.

Delegação de operador: a Platform pode enviar `operatorId` opcional no
`POST /operations`. `OWNER` e `MANAGER` delegam a execução para o usuário
informado; se omitirem, a operação fica no próprio usuário autenticado.
`OPERATOR` não delega: caso o frontend envie `operatorId`, o backend valida o UUID,
mas atribui silenciosamente ao próprio operador autenticado. `VIEWER` não cria
Operation. Erros de delegação retornam `OPERATION_OPERATOR_INVALID` quando o
usuário informado não existe, está inativo/desativado ou não possui perfil
operacional permitido.

A **Platform** lista em `/operacoes` (`GET /operations`) e abre um drawer com
Timeline + Checklist + Fotos (`GET /operations/photos/:id`) + Observações +
Assinatura + Documentos relacionados (preview via `DocumentPaper`). O histórico de
cada equipamento/cliente é derivado de `GET /operations?equipmentId=` /
`?customerId=` (sem duplicação de dados). API no frontend: `operationApi` (`@erp/api`).

## Document Engine (produção)

A Sprint 6 expõe o motor oficial de documentos. O frontend não deve montar PDF no cliente para
documentos oficiais; use o backend.

Fluxo recomendado na central de documentos:

1. Listar operações com `GET /operations` e usar `documents[]` para descobrir `documentId`, `type`,
   `number` e `status`;
2. Preview: `GET /documents/:documentId/preview`;
3. Render PDF: `POST /documents/:documentId/render`;
4. Download: `GET /documents/:documentId/download` e criar `Blob` a partir de `contentBase64`.

Fluxo sem `documentId` ainda conhecido:

```http
GET  /documents/operations/:operationId/:type/preview
POST /documents/operations/:operationId/:type/render
```

Fluxo de preview de modelo, sem Operation e sem documento emitido:

```http
GET /documents/templates/:templateId/preview
```

Use este endpoint na tela de Modelos de Documentos/Relatórios. Ele retorna o mesmo
`DocumentBlueprint` do preview oficial e deve ser aberto pelo `DocumentViewer`. Não criar Operation
fictícia, não usar Demo Dataset e não montar preview local no frontend.

Tipos:

```ts
type DocumentTemplateType =
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'PMOC';
```

Preview retorna `DocumentBlueprint`:

- `header`;
- `footer`;
- `metadata`;
- `sections[]`;
- componentes: `metadata`, `paragraph`, `table`, `list`, `image`, `qrCode`, `checklist`,
  `signature`, `signaturePlaceholder`, `observation`.

Sprint 8: quando o template exige assinatura, o backend envia componente `signature` no Blueprint.
O frontend não deve decidir regra de assinatura; apenas renderizar o componente recebido.

```ts
type SignatureBlueprintComponent = {
  id: string;
  kind: 'signature';
  mode: 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';
  keepTogether?: boolean;
  signatures: Array<{
    role: 'fixed' | 'collected';
    label: string;
    name: string | null;
    title: string | null;
    signedAt: string | null;
    caption: string | null;
    image?: { mimeType: string; fileSize: number; contentBase64: string } | null;
  }>;
};
```

PDF oficial já contém a assinatura conforme configuração do template:

- `NONE`: sem assinatura;
- `FIXED`: assinatura cadastrada;
- `COLLECTED`: área manual;
- `HYBRID`: assinatura cadastrada + área manual.

Use esse Blueprint para preview visual no frontend, mas trate o PDF oficial como produto do backend.

Download:

```ts
type DocumentDownload = {
  id: string;
  operationId: string;
  type: DocumentTemplateType;
  number: string;
  status: 'DRAFT' | 'READY' | 'VALIDATED' | 'SENT';
  mimeType: 'application/pdf';
  fileSize: number;
  renderedAt: string;
  renderMetadata: { engine: string; pageCount: number; blueprintVersion?: string };
  downloadReady: boolean;
  contentBase64: string;
};
```

Erros de UX:

- `DOCUMENT_DOWNLOAD_NOT_READY` (409): mostrar botão "Gerar PDF" antes do download;
- `DOCUMENT_FORBIDDEN_TYPE` (403): ocultar orçamento/recibo para não-OWNER;
- `DOCUMENT_SIZE_LIMIT_EXCEEDED` (400): orientar reduzir fotos/checklist/tabelas;
- `DOCUMENT_RENDER_FAILED` (500): exibir retry e registrar `X-Request-Id`.

Limitação consciente atual: fotos de operação ainda aparecem como componentes/metadados seguros no
PDF; assinatura fixa já é embutida no PDF pela Sprint 8.

## Asset Lifecycle / Timeline de Equipamento (Sprint 9)

O histórico oficial do equipamento agora vem de `AssetLifecycleEvent`. Não monte timeline juntando
Operations, documentos e anexos no frontend; use a API de ciclo de vida.

Endpoints principais:

```http
GET  /asset-lifecycle?page=1&limit=20&equipmentId=&operationId=&type=&performedBy=&from=&to=
GET  /asset-lifecycle/:id
POST /asset-lifecycle

GET  /equipments/:id/lifecycle?page=1&limit=20&type=&performedBy=&from=&to=
GET  /equipments/:id/lifecycle/stats

GET    /asset-lifecycle/:id/attachments
POST   /asset-lifecycle/:id/attachments
DELETE /asset-lifecycle/:id/attachments/:attachmentId
```

Sprint 9.5 adiciona também `customerId` em `GET /asset-lifecycle` para telas agregadas por cliente:

```http
GET /asset-lifecycle?customerId=<uuid>&page=1&limit=20
```

Roles:

- OWNER/MANAGER/OPERATOR/VIEWER: leitura da timeline;
- OWNER/MANAGER/OPERATOR: criação de evento e upload de anexo;
- OWNER/MANAGER: remoção de anexo;
- eventos não são editáveis nem removíveis.

Eventos oficiais:

```ts
type AssetLifecycleEventType =
  | 'INSTALLATION'
  | 'INSPECTION'
  | 'PREVENTIVE'
  | 'CORRECTIVE'
  | 'MAINTENANCE'
  | 'PART_REPLACEMENT'
  | 'WARRANTY'
  | 'DOCUMENT'
  | 'NOTE'
  | 'CUSTOM';
```

UX recomendada para a página/drawer de equipamento:

1. Abrir detalhes do equipamento com `GET /equipments/:id`.
2. Carregar timeline oficial com `GET /equipments/:id/lifecycle?page=1&limit=20`.
3. Carregar cards de indicadores com `GET /equipments/:id/lifecycle/stats`.
4. Para filtros, enviar cumulativamente `type`, `performedBy`, `from` e `to`.
5. Para anexos de um evento, usar `GET /asset-lifecycle/:eventId/attachments`.

O backend cria automaticamente:

- evento de manutenção/instalação quando uma Operation é concluída;
- evento `DOCUMENT` quando um PDF oficial é renderizado.

Portanto, após concluir atendimento ou gerar documento, basta invalidar/refazer a query da timeline
do equipamento.

Payload pronto para UI:

Cada item inclui campos públicos sanitizados e `timeline`. Use `timeline` para renderizar cards,
badges, cor, ícone, navegação e agrupamento. Não interprete enum no frontend e não dependa de
`metadata` bruto: ele não faz parte do contrato público.

```ts
type AssetLifecycleTimelineItem = {
  id: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  date: string;
  groupKey: string;
  sortKey: string;
  user: { id: string; name: string; username: string } | null;
  type: AssetLifecycleEventType;
  operationId: string | null;
  documentId: string | null;
  equipmentId: string;
  references: {
    equipment: { id: string; name: string; tag: string; type: string; status: string } | null;
    customer: { id: string; name: string; tradeName: string | null } | null;
    operation: { id: string; number: number; type: string; status: string } | null;
    document: {
      id: string;
      number: string;
      type: string;
      status: string;
      renderedAt: string | null;
      fileSize: number | null;
    } | null;
  };
  attachments: Array<{
    id: string;
    category: string;
    mimeType: string;
    fileSize: number;
    originalFileName: string;
    createdAt: string;
  }>;
  badges: string[];
};
```

Campos internos removidos do contrato público na Sprint 20.5:

- `metadata`;
- `storageKey`;
- `eventId`/`deletedAt` em anexos;
- e-mail do performer.

Downloads e ações sobre anexos devem usar exclusivamente os endpoints autorizados; nunca persista ou
reutilize chaves de storage no frontend.

Listagens incluem `timelineGroups`, preparado para infinite scroll/agrupamento por dia. O frontend
pode usar `items` para lista plana ou `timelineGroups` para seções por data.

Navegação direta:

- se `timeline.operationId` existir, abrir drawer/página da operação;
- se `timeline.documentId` existir, abrir preview/download do documento;
- usar `timeline.references.customer` para link de cliente;
- usar `timeline.references.equipment` para link do ativo.

Payload de criação manual:

```ts
type CreateLifecycleEventRequest = {
  equipmentId: string;
  operationId?: string;
  documentId?: string;
  type: AssetLifecycleEventType;
  occurredAt?: string;
  performedBy?: string;
  description: string;
  metadata?: Record<string, unknown>;
};
```

Anexos:

- `multipart/form-data`;
- campo `file`;
- campo opcional `category`;
- PDF/PNG/JPG/JPEG;
- máximo 5 MiB;
- o cliente deve validar para UX, mas o backend é autoridade.

Estados vazios:

- sem eventos: mostrar "Nenhum evento registrado para este equipamento";
- sem estatísticas: os contadores retornam zero e datas retornam `null`;
- sem anexos: mostrar lista vazia.

Erros de UX:

- `ASSET_LIFECYCLE_EVENT_NOT_FOUND`: evento removido/inexistente; atualizar timeline;
- `ASSET_LIFECYCLE_ATTACHMENT_NOT_FOUND`: anexo já removido; atualizar lista;
- `UPLOAD_INVALID_MIME_TYPE` / `UPLOAD_INVALID_EXTENSION`: rejeitar arquivo e orientar formatos;
- `UPLOAD_FILE_TOO_LARGE`: orientar limite de 5 MiB;
- `VALIDATION_ERROR`: revisar filtros/payload.

## Maintenance Planning (Sprint 10)

O backend agora expõe planejamento de manutenção. Importante: planejamento não é execução. Execuções
reais continuam sendo `Operation`; uma execução planejada pode ser vinculada a uma Operation.

Endpoints:

```http
GET    /maintenance-plans/stats
GET    /maintenance-plans?page=1&limit=20&equipmentId=&type=&priority=&active=
GET    /maintenance-plans/:id
POST   /maintenance-plans
PATCH  /maintenance-plans/:id
DELETE /maintenance-plans/:id

GET   /maintenance-plans/:id/executions?page=1&limit=20&status=&from=&to=
POST  /maintenance-plans/:id/executions
PATCH /maintenance-executions/:id

GET /equipments/:id/maintenance?page=1&limit=20
GET /equipments/:id/maintenance/upcoming?page=1&limit=20&status=&from=&to=
```

Roles para UI:

- OWNER/MANAGER: podem criar, editar e desativar planos;
- OWNER/MANAGER/OPERATOR: podem criar/atualizar execuções planejadas;
- OWNER/MANAGER/OPERATOR/VIEWER: podem visualizar planos, execuções e estatísticas.

Tipos:

```ts
type MaintenancePlanType = 'PREVENTIVE' | 'INSPECTION' | 'WARRANTY' | 'CUSTOM';
type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type MaintenanceExecutionStatus = 'PLANNED' | 'LINKED' | 'COMPLETED' | 'CANCELED';
type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'INTERVAL_DAYS'
  | 'INTERVAL_MONTHS';
```

Criação de plano:

```ts
await api.post('/maintenance-plans', {
  equipmentId,
  name: 'Preventiva mensal',
  description: 'Limpeza, inspeção e medição.',
  type: 'PREVENTIVE',
  priority: 'MEDIUM',
  recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
  firstExecution: '2026-07-10T12:00:00.000Z',
  active: true,
});
```

Criação de execução:

```ts
await api.post(`/maintenance-plans/${planId}/executions`, {
  scheduledAt: '2026-08-10T12:00:00.000Z',
  notes: 'Execução planejada manualmente.',
});
```

Vincular/concluir execução:

```ts
await api.patch(`/maintenance-executions/${executionId}`, {
  operationId,
  status: 'COMPLETED',
  executedAt: new Date().toISOString(),
  notes: 'Executada conforme checklist operacional.',
});
```

Após concluir uma execução, invalide/refaça:

- plano (`GET /maintenance-plans/:id`);
- lista de execuções;
- timeline do equipamento (`GET /equipments/:id/lifecycle`);
- estatísticas de manutenção (`GET /maintenance-plans/stats`).

Estados de UX:

- sem planos: mostrar CTA conforme papel (`OWNER/MANAGER`);
- plano vencido: compare `nextExecution` com relógio do cliente apenas para destaque visual; o
  backend é autoridade;
- `VIEWER`: ocultar ações de escrita, mas ainda tratar 403;
- `OPERATOR`: pode atualizar execução, mas não criar/editar plano.

Erros principais:

- `MAINTENANCE_RECURRENCE_INVALID`: revisar frequência/intervalo;
- `MAINTENANCE_OPERATION_MISMATCH`: Operation não pertence ao equipamento do plano;
- `MAINTENANCE_PLAN_NOT_FOUND`: plano inexistente/desativado para a ação;
- `MAINTENANCE_EXECUTION_NOT_FOUND`: execução inexistente;
- `VALIDATION_ERROR`: datas ISO, UUIDs ou enums inválidos.

## PMOC Compliance (Sprint 11)

PMOC é uma especialização de Maintenance Planning. O frontend não deve criar calendário, execução ou
timeline paralelos.

Endpoints:

```http
GET    /pmoc/stats
GET    /pmoc?page=1&limit=20&customerId=&equipmentId=&active=
GET    /pmoc/:id
POST   /pmoc
PATCH  /pmoc/:id
DELETE /pmoc/:id

GET    /pmoc/:id/environments
POST   /pmoc/:id/environments
PATCH  /pmoc/environments/:id
DELETE /pmoc/environments/:id

GET /pmoc/:id/compliance
GET /equipments/:id/pmoc?page=1&limit=20
```

Roles para UI:

- OWNER/MANAGER: criam, editam e desativam PMOC/ambientes;
- OWNER/MANAGER/OPERATOR/VIEWER: visualizam PMOCs, ambientes, compliance e stats.

Status:

```ts
type PmocComplianceStatus = 'COMPLIANT' | 'WARNING' | 'OVERDUE' | 'NON_COMPLIANT' | 'IN_PROGRESS';
```

Criação:

```ts
await api.post('/pmoc', {
  customerId,
  equipmentId,
  equipmentIds: [equipmentId],
  responsibleTechnician: 'Ricardo Almeida',
  artNumber: 'ART-PE-2026-00091',
  contractNumber: 'HSC-PMOC-2026',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  priority: 'HIGH',
  recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
});
```

O backend cria o `MaintenancePlan` e a primeira `MaintenanceExecution`. Para mostrar agenda, use os
campos de `maintenancePlan.executions` ou os endpoints de Maintenance Planning.

Ambiente:

```ts
await api.post(`/pmoc/${pmocId}/environments`, {
  name: 'Central de água gelada',
  area: '85 m²',
  occupancy: 4,
  equipmentIds: [equipmentId],
});
```

Documentos:

`GET /pmoc/:id/compliance` retorna `document.type = 'PMOC'`, `engine = 'DocumentEngine'` e o
template padrão. A renderização/preview/download do documento continua usando os endpoints oficiais
do Document Engine. Não montar PDF PMOC no frontend.

Após concluir uma execução PMOC:

- invalidar `GET /pmoc/:id`;
- invalidar `GET /pmoc/:id/compliance`;
- invalidar `GET /equipments/:id/lifecycle`;
- invalidar Maintenance Planning relacionado.

Erros principais:

- `PMOC_INVALID_RELATIONSHIP`: equipamento não pertence ao cliente ou ambiente referencia ativo fora
  do PMOC;
- `PMOC_PLAN_NOT_FOUND`: PMOC inexistente;
- `PMOC_ENVIRONMENT_NOT_FOUND`: ambiente inexistente;
- `VALIDATION_ERROR`: datas, enum, paginação ou payload inválido.

## Inventory & Materials (Sprint 12)

O backend expõe a fundação de estoque e materiais. O frontend deve tratar `Product` como catálogo e
`InventoryItem` como saldo físico. Não calcular saldo localmente; sempre usar `currentQuantity`,
`reservedQuantity` e `availableQuantity` retornados pela API.

Endpoints disponíveis:

```http
GET    /products?page=1&limit=20&search=&category=&brand=&active=
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id

GET    /inventory?page=1&limit=20&search=&productId=&location=&critical=&active=
GET    /inventory/:id
PATCH  /inventory/:id
GET    /inventory/stats
POST   /inventory/movements
GET    /inventory/movements?page=1&limit=20&inventoryItemId=&productId=&operationId=&type=&from=&to=

GET    /suppliers?page=1&limit=20&search=&active=
POST   /suppliers
PATCH  /suppliers/:id
DELETE /suppliers/:id

GET    /operations/:id/materials
POST   /operations/:id/materials
DELETE /operations/:id/materials/:id
```

Roles para UI:

- OWNER/MANAGER: gerenciam produtos, fornecedores, parâmetros de estoque e materiais de Operation;
- OPERATOR: consulta produtos/estoque e pode registrar consumo/movimentação operacional;
- VIEWER: somente leitura em produtos, estoque e materiais;
- fornecedores ficam restritos a OWNER/MANAGER.

Payload de produto:

```ts
type ProductPayload = {
  sku: string;
  internalCode?: string;
  manufacturerCode?: string;
  name: string;
  unit: string;
  brand?: string;
  model?: string;
  category?: string;
  technicalDescription?: string;
  weight?: number;
  dimensions?: string;
  primarySupplierId?: string | null;
  isActive?: boolean;
};
```

Product Backlog Closure 01.1:

- o formulário de produto deve carregar fornecedores reais com `GET /suppliers?page=1&limit=100&active=true`;
- erro de API de fornecedores deve aparecer como erro, não como lista vazia;
- se o usuário criar um fornecedor pelo fluxo oficial `POST /suppliers`, atualize a lista e selecione
  o fornecedor criado no produto quando o formulário estiver aberto;
- envie `primarySupplierId` em `POST/PATCH /products` para persistir fornecedor principal;
- envie `primarySupplierId: null` para remover o vínculo;
- `Product.suppliers[]` retorna as relações persistidas, com a relação primária marcada por
  `isPrimary=true`;
- categoria deve ser UX de select controlado no frontend e persistida no campo string `category`; a
  opção `Outros` deve enviar o texto customizado, nunca o literal `Outros`.

Payload de consumo em Operation:

```ts
await api.post(`/operations/${operationId}/materials`, {
  productId,
  inventoryItemId,
  quantity: 1,
  notes: 'Substituição de filtro saturado',
});
```

Após consumo:

- invalidar `GET /operations/:id/materials`;
- invalidar `GET /inventory/:id`;
- invalidar `GET /inventory/stats`;
- invalidar `GET /equipments/:id/lifecycle` quando a Operation possuir equipamento.

UX recomendada:

- Produtos: tabela paginada com filtros por busca, categoria, marca e ativo;
- Estoque: destacar `availableQuantity <= minimumQuantity` e itens sem saldo;
- Movimentos: linha do tempo/auditoria paginada, sem edição;
- Operation: seletor de produto + item de estoque, mostrando saldo disponível antes de consumir;
- nunca permitir no cliente uma experiência que dependa de saldo calculado em memória.

Erros principais:

- `PRODUCT_CONFLICT`: SKU/código duplicado;
- `PRODUCT_NOT_FOUND`: produto inexistente;
- `SUPPLIER_CONFLICT`: documento duplicado;
- `SUPPLIER_NOT_FOUND`: fornecedor inexistente;
- `INVENTORY_ITEM_NOT_FOUND`: item de estoque inexistente;
- `INVENTORY_NEGATIVE_STOCK`: consumo/saída deixaria saldo negativo;
- `INVENTORY_PRODUCT_MISMATCH`: item de estoque não pertence ao produto selecionado;
- `OPERATION_NOT_FOUND`: Operation inexistente.

## Pricing (Sprint 13)

Pricing é a única fonte de dados comerciais dos produtos. O frontend não deve procurar preço em
`Product` nem custo em `InventoryItem`.

Endpoints disponíveis:

```http
GET   /pricing/stats?at=
GET   /pricing?page=1&limit=20&productId=&active=&at=&expired=&search=
GET   /pricing/:id
GET   /products/:id/pricing
POST  /products/:id/pricing
PATCH /pricing/:id
GET   /pricing/history/:productId?page=1&limit=20
```

Roles para UI:

- OWNER: cria e revisa preços;
- MANAGER: visualiza preços, custos, margens, histórico e estatísticas;
- OPERATOR/VIEWER: não devem exibir menus ou telas de Pricing.

Payload de criação:

```ts
type ProductPricingPayload = {
  costPrice: number;
  replacementCost: number;
  averageCost: number;
  salePrice: number;
  minimumSalePrice: number;
  suggestedSalePrice: number;
  marginPercentage?: number;
  validFrom: string;
  validUntil?: string | null;
  active?: boolean;
};
```

Revisão de preço:

```ts
await api.patch(`/pricing/${pricingId}`, {
  salePrice: 84,
  minimumSalePrice: 72,
  suggestedSalePrice: 88,
  validFrom: '2026-08-01T00:00:00.000Z',
});
```

O `PATCH` retorna um novo `ProductPricing`. Não atualizar a linha antiga em memória como se fosse o
mesmo registro; invalidar:

- `GET /pricing`;
- `GET /pricing/:id`;
- `GET /products/:id/pricing`;
- `GET /pricing/history/:productId`;
- `GET /pricing/stats`.

UX recomendada:

- mostrar o preço vigente usando `GET /products/:id/pricing`;
- mostrar evolução usando `GET /pricing/history/:productId`;
- destacar preços vencidos com `validUntil < now`;
- ao criar/revisar, prevenir datas óbvias inválidas no formulário, mas manter o backend como fonte
  final de validação;
- não exibir Pricing para operadores.

Erros principais:

- `PRICING_NOT_FOUND`: produto sem preço vigente ou registro inexistente;
- `PRICING_OVERLAP`: vigência sobreposta;
- `PRICING_INVALID_PERIOD`: `validUntil` menor/igual a `validFrom`;
- `PRICING_INVALID_MARGIN`: preço abaixo do mínimo, margem negativa ou sugestão menor que mínimo;
- `PRODUCT_NOT_FOUND`: produto inexistente ou inativo.

## Assignments e Operator Workflow

O frontend deve tratar Assignment como camada de execução da Operation. Não criar agenda, serviço ou
OS paralelos.

Fluxos:

- Platform cria Operation com `operatorId`; o backend cria Assignment automaticamente;
- Agenda Platform é uma visão de calendário sobre `/assignments`;
- Operation Drawer consulta `/assignments?operationId=...` e `/assignments/history/:operationId`;
- OWNER/MANAGER reatribuem com `PATCH /assignments/:id/reassign`;
- Operator Home/Agenda/Minhas Ordens usam `GET /assignments/my`;
- detalhe Operator usa `GET /assignments/:id` e controla `accept`, `start`, `complete`, `reject`.

Statuses para UI:

- `ASSIGNED`: Agendado / botão Aceitar;
- `ACCEPTED`: Aceito / botão Iniciar;
- `STARTED`: Em execução / botão Continuar ou Concluir;
- `COMPLETED`: Concluído;
- `REJECTED`: Recusado;
- `CANCELED`: Cancelado;
- `PAUSED`: Preparado para futuro.

Erros esperados:

- `ASSIGNMENT_OPERATOR_FORBIDDEN`: operador tentou agir em ordem que não é dele;
- `ASSIGNMENT_INVALID_TRANSITION`: tentou iniciar sem aceitar ou concluir sem iniciar;
- `ASSIGNMENT_NOT_FOUND`: Assignment inexistente;
- `OPERATION_OPERATOR_INVALID`: usuário delegado inválido.

## Budget Domain

Budget é o domínio comercial oficial. Não calcular preço, custo ou margem no frontend como fonte de
verdade; o backend cria snapshots usando `PricingService`.

Endpoints:

```http
GET    /budgets?page=1&limit=20&search=&status=&customerId=&equipmentId=&operationId=&from=&to=&expired=
GET    /budgets/:id
GET    /operations/:id/budgets?page=1&limit=20
POST   /budgets
PATCH  /budgets/:id
PATCH  /budgets/:id/approve
PATCH  /budgets/:id/reject
DELETE /budgets/:id
GET    /budgets/stats
GET    /budgets/history/:id?page=1&limit=20
```

Roles para UI:

- OWNER/MANAGER: mostrar menu de orçamentos, criar, editar, aprovar, rejeitar e cancelar;
- OPERATOR/VIEWER: não mostrar telas/ações de Budget.

Payload de criação:

```ts
type CreateBudgetPayload = {
  operationId?: string;
  customerId: string;
  customerAddressId?: string;
  equipmentId?: string;
  title: string;
  description?: string;
  discount?: number;
  additional?: number;
  expirationDate: string;
  observations?: string;
  status?: 'DRAFT' | 'PENDING';
  items: Array<{
    productId: string;
    description?: string;
    quantity: number;
  }>;
};
```

Item retornado:

```ts
type BudgetItem = {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  unit: string;
  snapshotCost: string;
  snapshotSalePrice: string;
  snapshotMargin: string;
  total: string;
};
```

Fluxo recomendado:

1. Selecionar cliente/equipamento/operação.
2. Selecionar produtos do catálogo.
3. Enviar apenas `productId`, `quantity` e descrição opcional.
4. Renderizar os snapshots retornados pelo backend.
5. Para revisão de itens, enviar novamente a lista completa em `PATCH /budgets/:id`.

Estados:

- `DRAFT`: rascunho editável;
- `PENDING`: enviado/aguardando decisão, ainda editável;
- `APPROVED`: final, somente leitura;
- `REJECTED`: final, somente leitura;
- `EXPIRED`: final, somente leitura;
- `CANCELED`: final, somente leitura.

Regras de UX:

- bloquear edição local quando `status` for final;
- mostrar aviso quando `expirationDate < now`;
- em `BUDGET_MULTIPLE_APPROVAL`, atualizar a lista da Operation e mostrar que já existe orçamento aprovado;
- em `PRICING_NOT_FOUND`, orientar cadastro de preço vigente para o produto;
- em `BUDGET_APPROVED`, invalidar cache da Operation, Budget, Timeline e stats.

Integrações:

- Operation Drawer pode consumir `GET /operations/:id/budgets`;
- DocumentViewer deve usar o documento oficial retornado por `POST /budgets/:id/render`;
- Timeline do equipamento receberá eventos `BUDGET_APPROVED` e `BUDGET_REJECTED` pelo Asset Lifecycle.

## Budget Document Emission

Fluxo de UI recomendado no `BudgetDetailDrawer`:

1. Exibir dados comerciais do Budget.
2. Em "Documento", se `budget.document?.id` existir, abrir `DocumentViewer` com `{ documentId }`.
3. Se não existir documento, exibir CTA "Emitir Documento".
4. Ao clicar, chamar `POST /api/v1/budgets/:id/render`.
5. Usar `response.documentId` no `DocumentViewer`.
6. Para download direto, chamar `GET /api/v1/budgets/:id/download`.

Render:

```ts
const emitted = await api.post(`/budgets/${budgetId}/render`);
// emitted.documentId
// emitted.preview
// emitted.download
// emitted.document.status === 'READY'
```

Download:

```ts
const file = await api.get(`/budgets/${budgetId}/download`);
// file.contentBase64 deve ser convertido para Blob application/pdf no frontend.
```

Estados de UX:

- `CANCELED` e `REJECTED`: esconder/desabilitar emissão e mostrar aviso;
- documento ainda não emitido: empty state com CTA de emissão;
- `DOCUMENT_DOWNLOAD_NOT_READY`: orientar o usuário a emitir novamente;
- `DOCUMENT_RENDER_FAILED`: mostrar retry; não criar fallback local;
- `BUDGET_INVALID_STATUS`: atualizar o Budget e refletir estado final.

O frontend nunca deve:

- montar PDF de Budget;
- recalcular preços/margens para documento;
- consultar `ProductPricing` para render;
- acessar storage diretamente;
- usar preview de template como documento emitido.

## Financial Core integration

Financial é o único domínio autorizado a representar dinheiro no Orbit.

Rotas disponíveis:

- `/financial/accounts`;
- `/financial/categories`;
- `/financial/entries`;
- `/financial/stats`;
- `/financial/history/:entryId`.

RBAC para UI:

- `OWNER` e `MANAGER`: exibir módulo financeiro;
- `OPERATOR` e `VIEWER`: esconder navegação e tratar 403 como bloqueio definitivo.

Fluxo recomendado:

1. Carregar contas e categorias.
2. Criar lançamentos com `accountId`, `categoryId`, `type`, `amount`, `dueDate`.
3. Usar `origin='BUDGET'` + `originId=budget.id` somente quando o usuário converter manualmente um orçamento.
4. Para liquidar, chamar `PATCH /financial/entries/:id/pay`.
5. Para cancelar pendente, chamar `PATCH /financial/entries/:id/cancel`.
6. Usar `/financial/stats` para cards do dashboard financeiro.

Não fazer no frontend:

- calcular saldo como fonte da verdade;
- alterar saldo de conta diretamente;
- cancelar lançamento pago;
- gerar financeiro automaticamente ao aprovar Budget;
- criar PIX, boleto, fiscal ou conciliação na V1.

## Procurement integration

Fluxo recomendado:

1. Criar pedido com `POST /purchase-orders`.
2. Adicionar itens com `POST /purchase-orders/:id/items`.
3. Enviar pedido com `PATCH /purchase-orders/:id/send`.
4. Registrar recebimentos com `POST /purchase-orders/:id/receipts`.
5. Mostrar histórico com `GET /purchase-orders/history/:id`.

Estados:

- `DRAFT`: editável;
- `SENT`: permite recebimento;
- `PARTIALLY_RECEIVED`: permite novos recebimentos;
- `RECEIVED`: final;
- `CANCELED`: final.

UX:

- bloquear edição de itens já recebidos;
- permitir recebimento parcial;
- mostrar `receivedQuantity` versus `quantity`;
- em `PURCHASE_INVALID_RECEIPT`, avisar que a quantidade excede o pedido;
- não criar lançamento financeiro automaticamente;
- se houver conversão financeira futura, usar `FinancialOrigin.PURCHASE`.

Regra crítica:

- Inventory continua sendo a única fonte de saldo físico.
- Procurement nunca deve calcular saldo localmente.

## Sprint 19 — integração após hardening de integridade

Não houve mudança de rotas nem de payloads. Houve endurecimento de conflitos `409` em comandos
sensíveis. O frontend deve tratar `409` nesses fluxos como “estado mudou no servidor”; a UX correta
é recarregar o recurso e pedir nova ação do usuário quando necessário.

Fluxos afetados:

- Financeiro: pagar/cancelar lançamento.
- Estoque: criar movimento, consumir material e remover material de Operation.
- Compras: registrar recebimento.
- Assignments: aceitar, rejeitar, iniciar, concluir e reatribuir.
- Budgets: aprovar, rejeitar, cancelar e emitir documento.
- Pricing: criar/revisar preço.

Tratamento recomendado:

1. Mostrar feedback curto: “Este registro foi atualizado por outra ação. Atualizamos os dados.”
2. Recarregar o detalhe/lista usando o endpoint oficial.
3. Não repetir automaticamente ações financeiras, de estoque, recebimento, aprovação ou render.
4. Para render de documento, permitir botão “Tentar novamente” depois de recarregar o documento.

Mensagens úteis por código:

- `FINANCIAL_ENTRY_INVALID_STATE`: lançamento já pago/cancelado ou alterado.
- `INVENTORY_NEGATIVE_STOCK`: saldo insuficiente ou reservado.
- `PURCHASE_INVALID_RECEIPT`: quantidade recebida excede o restante ou houve recebimento
  concorrente.
- `ASSIGNMENT_INVALID_TRANSITION`: atividade foi reatribuída ou mudou de status.
- `BUDGET_INVALID_STATUS`: orçamento já recebeu decisão ou virou final.
- `BUDGET_MULTIPLE_APPROVAL`: já existe orçamento aprovado para a Operation.
- `PRICING_OVERLAP`: vigência conflita com outro preço ativo.
- `DOCUMENT_RENDER_FAILED`: documento mudou durante a renderização; recarregar e tentar novamente.

Importante:

- Não implementar locks locais no frontend.
- Não confiar em saldo/quantidade cacheada para decidir; o backend continua sendo a autoridade.
- Evitar retries automáticos em comandos não idempotentes.

## Sprint 19.5 — semântica verificada para UX

Os conflitos críticos agora possuem prova em PostgreSQL real para os principais fluxos de V1:

- pagamento duplicado;
- pagamento versus cancelamento;
- consumo acima do estoque;
- retorno duplicado de material;
- recebimento acima do pedido;
- reatribuição versus aceite de Assignment;
- aprovação duplicada de Budget;
- overlap de Pricing.

Comportamento de UX recomendado permanece:

- em `409`, recarregar o recurso e mostrar estado atual;
- não repetir automaticamente ações de estoque, compras, orçamento ou Assignment;
- pagamento financeiro possui retry interno bounded apenas para conflito serializável seguro, então
  o frontend não precisa implementar retry próprio.

Para desenvolvimento local:

```bash
TEST_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/orbit_integrity_test?schema=public' npm run test:concurrency
```

## Sprint 19.6 — efeitos para UX

O backend foi certificado para integridade de concorrência V1.

Orientações finais:

- Pricing usa vigência half-open `[início, fim)`: um preço que termina em `2026-06-01T00:00Z`
  pode ser seguido por outro que começa exatamente nesse instante.
- Em `PRICING_OVERLAP`, manter o fluxo atual de refresh e edição da vigência.
- Em `DOCUMENT_RENDER_FAILED`, o usuário pode tentar novamente após refresh; o backend mantém
  metadata verdadeira e faz cleanup best-effort de binário perdedor.
- Download com binário ausente deve exibir mensagem de documento indisponível/emitir novamente.
- Assignment/Budget/Inventory/Procurement seguem com tratamento de `409` + refresh.

## Sprint 20 — impactos AppSec para frontend

Financial:

- Ao criar lançamento financeiro, não enviar `status` nem `paidAt`.
- Todo lançamento nasce `PENDING`.
- Para marcar como pago, usar exclusivamente `PATCH /api/v1/financial/entries/:id/pay`.
- Se o backend retornar `400 VALIDATION_ERROR` por campos extras, corrigir o payload; não tentar
  fallback local.

Uploads de assets da organização:

- O backend valida MIME, extensão e assinatura binária.
- Arquivos com extensão correta mas conteúdo incompatível retornam `UPLOAD_INVALID_MIME_TYPE`.
- SVG com script, inline handlers, `javascript:` ou `foreignObject` é rejeitado.
- O frontend deve mostrar erro de arquivo inválido e solicitar novo arquivo.
- Nunca persistir nem reutilizar `storageKey`; downloads continuam por endpoints autorizados.

## Sprint 20.5 — AppSec closure para frontend

Impactos confirmados:

- Asset Lifecycle não expõe mais `metadata` bruto, `storageKey`, `eventId`, `deletedAt` nem e-mail
  do performer.
- A timeline deve ser renderizada por `event.timeline` e `event.timeline.references`.
- Anexos devem ser tratados como recursos opacos; qualquer ação deve usar endpoints autorizados.
- Object URLs locais usados no fluxo de visita técnica agora são revogados ao remover fotos e no
  unmount do componente.
- Nenhum contrato de endpoint foi adicionado ou removido.

Autorização:

- OPERATOR/VIEWER continuam sem acesso a Financial, Pricing, Budget e Procurement.
- O frontend pode ocultar botões por UX, mas o backend permanece autoridade.

Testes disponíveis:

- `npm run test:security` cobre autenticação, RBAC, mass assignment, upload spoofing, workflow de
  Assignment, paginação/filtros e vazamento de erros.

## Sprint 22 — production readiness para integração frontend

Builds de produção do frontend devem usar:

```bash
NEXT_PUBLIC_API_BASE_URL=/api/v1
```

Quando frontend e backend estiverem atrás do mesmo proxy, `/api/v1` é a base browser-facing
preferencial. O cliente HTTP do frontend suporta base relativa e resolve contra `window.location`.

Endpoints operacionais:

- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `GET /api/v1/metrics`

Smoke oficial:

```bash
ORBIT_RELEASE_API_URL=http://127.0.0.1:3001/api/v1 \
ORBIT_RELEASE_FRONTEND_URL=http://127.0.0.1:4000 \
ORBIT_RELEASE_OWNER_EMAIL=<owner-email> \
ORBIT_RELEASE_OWNER_PASSWORD=<owner-password> \
npm run release:smoke:frontend
```

O smoke valida autenticação real, readiness, métricas e as principais rotas Platform/Operator.

## Sprint 22.5 — external closure notes

Frontend dependency audit was closed with `postcss@8.5.16` override. No API contract changed.

Production integration assumptions:

- frontend should continue to use `/api/v1` behind same-origin proxy deployments;
- no demo bridge or demo build flag exists;
- each white-label customer deployment must point to its own isolated API/database/storage scope.

External HTTPS smoke remains required before RC promotion.

## Product Backlog Closure 02 — Reports and Documents

Responsabilidade de produto:

- Reports é ponto de entrada para escolher um tipo documental e pré-visualizar/emitir a partir de uma `Operation` real.
- Documents é o repositório/histórico oficial de `OperationDocument` já criados/renderizados.

Fluxo oficial para documentos operacionais:

1. Frontend seleciona `operationId` e `DocumentTemplateType`.
2. Preview: `GET /documents/operations/:operationId/:type/preview`.
3. Emissão: `POST /documents/operations/:operationId/:type/render`.
4. Download: `GET /documents/:documentId/download`.

O frontend não deve:

- montar conteúdo documental localmente;
- gerar PDF no browser;
- acessar `storageKey`;
- recalcular materiais, valores ou histórico;
- criar registros paralelos de documento.

## Document Semantics Closure — preview modes

O frontend deve separar explicitamente:

### Model Preview

- Fonte: `DocumentTemplate`.
- Endpoint: `GET /documents/templates/:templateId/preview`.
- Não exige Operation.
- Não pode renderizar PDF oficial.
- Não pode baixar PDF oficial.
- Não cria `OperationDocument`.

### Real Data Preview

- Fonte: domínio real (`Operation` para documentos operacionais; `Budget` para orçamento).
- Endpoint operacional: `GET /documents/operations/:operationId/:type/preview`.
- Pode renderizar via ação explícita quando autorizado.
- Download ocorre apenas depois do render oficial.

Taxonomia:

- `TECHNICAL_REPORT`: relatório técnico factual.
- `TECHNICAL_OPINION`: laudo técnico analítico.
- `REPORT`: legado/histórico.

## Product Backlog Closure 03 — PDF Exports and Signatures

PDF exports:

- `GET /operations/export?...`;
- `GET /documents/export?...`;
- `GET /equipments/export?...`.

Esses endpoints retornam PDF binário raw (`application/pdf`), fora do envelope `{ success, data }`.
O frontend deve baixar como `Blob`, usar `Content-Disposition` quando presente e mostrar erro real
quando a API retornar JSON de erro.

Semântica:

- PDF exporta todos os registros que correspondem aos filtros ativos;
- limite V1: 500 registros;
- se ultrapassar o limite, orientar o usuário a restringir filtros;
- export de lista não é documento oficial emitido e não deve aparecer na Central de Documentos.

Assinaturas:

- `GET /signatures` não retorna soft-deleted;
- inativas continuam visíveis com badge claro;
- resposta usa `hasImage`;
- `imageStorageKey` não deve ser consumido nem exibido;
- criação/edição envia metadados via `POST/PATCH /signatures` e imagem/desenho via
  `POST /signatures/:id/upload`.

Assinatura desenhada:

- canvas gera PNG transparente;
- o PNG deve ser convertido para `File`;
- o upload deve convergir no endpoint oficial de assinatura.

## Product Backlog Closure 04 — Avatar e Notification Center

Avatar:

- selecionar arquivo;
- recortar/reposicionar no cliente;
- gerar PNG 512×512;
- enviar por `POST /users/avatar`;
- chamar refresh oficial da sessão (`GET /users/me`);
- renderizar avatar usando `avatarAssetId` + `GET /users/avatar/:id`.

Notifications:

- contador do sino: `GET /notifications/unread-count`;
- painel: `GET /notifications?limit=8`;
- uma lida: `PATCH /notifications/:id/read`;
- todas lidas: `PATCH /notifications/read-all`;
- `actionUrl` deve ser tratado como rota interna e usado apenas se iniciar com `/`;
- refresh V1: load no shell, focus/visibility e polling moderado de 60s quando visível.

# Closure 06 — OS real, stale render e datas

- Modelo: `DocumentViewer source={{ templateId }}`; ação “Visualizar modelo”; nunca é documento real.
- OS real: `DocumentViewer source={{ operationId, type: "WORK_ORDER" }}`; ação “Pré-visualizar com
  dados reais”.
- Após salvar assinatura/evidências, aguarde `PATCH /operations/:id`, use a resposta autoritativa ou
  refaça o GET, atualize o preview e solicite novo render.
- `DOCUMENT_STALE` (409) exige re-render explícito; não ofereça o binário antigo como atual.
- Exiba `createdAt` como “Criado” e `scheduledFor` como “Data do agendamento”. Não use `assignedAt`
  como data de serviço. Para `scheduledFor: null`, exiba “Não agendado”.

# Closure 06.1 — evidência runtime

Contrato observado: `createdAt` e `scheduledFor`. Use `scheduledFor` diretamente para agendamento.
O preview real `operationId + WORK_ORDER` e o PDF atual compartilham a ordem semântica dos
componentes. Em `DOCUMENT_STALE`, mostre “Documento desatualizado — gerar novamente”, execute render
explícito e só então habilite o download atual.

## DC02B — Relatório de Visita Técnica

No workflow `/reports`: carregue equipamentos por `GET /equipments?customerId=...`; persista
`referenceMonth`, `referenceYear`, `maintenanceType`, `maintenanceChecklist[]` e
`inspectedEquipments[]` na Operation; depois solicite o Preview oficial. Envie somente `equipmentId` e
`sector`: os snapshots da tabela são responsabilidade do backend.

O `DocumentViewer` deve consumir `header.corporate`; não monte cabeçalho ou tabela no browser. Campos
novos podem ser nulos/vazios em operações antigas. Os modos suportados são `WEEKLY`, `MONTHLY`,
`QUARTERLY`, `SEMIANNUAL`, `ANNUAL` e `CORRECTIVE`.

# Technical Report checklist integration

Load reusable activities with `GET /api/v1/maintenance-checklist-templates?maintenanceType=SEMIANNUAL&active=true&page=1&limit=100`. The catalog ID is a selection aid only: when saving the report, send snapshots through the existing Operation `maintenanceChecklist` payload (`maintenanceType`, `description`, `executed`, `observations`). This guarantees that later catalog changes do not alter historical reports.

Technical Reports may send multiple entries through `inspectedEquipments`. Their top-level `equipmentId` may be null. The Central de Relatórios does not send `photos` for `TECHNICAL_REPORT`; image evidence is currently enabled there only for `PMOC`.

## Technical Catalogs e Laudo Técnico

- Carregue as abas/labels com `GET /technical-catalogs/types`.
- Carregue seletores com `GET /technical-catalogs?type=<TYPE>&active=true&page=1&limit=100`.
- O valor `Outros` é somente um comando de UI: abra um campo, adicione o texto digitado e nunca
  envie a palavra `Outros` como dado.
- Usuários podem remover/reordenar escolhas e editar somente itens personalizados no fluxo.
- Ao salvar uma Operation, envie os textos finais em `technicalOpinionObjective`,
  `technicalOpinionConditions`, `technicalOpinionRecommendations` e
  `technicalOpinionConclusion`. Não envie IDs do catálogo.
- Selecione o responsável técnico em `GET /signatures?active=true`; copie nome e conselho para os
  snapshots da Operation. O registro profissional permanece editável e o fallback visual é
  `Não consta`.
- Platform mantém textareas para edição avançada depois dos seletores. Operator usa a mesma família
  de seletores em layout compacto e suporta múltiplos equipamentos.
- O documento continua seguindo Operation → DocumentContext → Builder → Blueprint → Viewer/PDF.
  Nenhum catálogo deve ser consultado durante Preview ou Render.

Compatibilidade: `/maintenance-checklist-templates` continua disponível e é atendido pelo catálogo
unificado de tipo `CHECKLIST`.

### Seleção contextual (Closure 08.1)

- Consulte `/technical-catalogs/taxonomy` para labels oficiais.
- Envie `areas`, `workflow`, `includeGeneral=true`, `active=true`, página 1 e limite 100.
- A busca deve ir ao backend e cobre título, descrição e tags.
- `GENERAL` é fallback; itens específicos vêm primeiro.
- Valores já persistidos continuam editáveis mesmo se o item for desativado ou reclassificado.
- Platform usa composição detalhada e Operator compacta; PMOC pode usar `workflow=PMOC`.

## DC-04 — integração PMOC

Selecione `PmocPlan`, use `pmoc.equipments`, vincule a Operation por `MaintenanceExecution` e
persista procedimentos com snapshot/equipamento/resultado. Fotos são opcionais. Assinatura do
cliente envia nome e função. Preview → Render → Download usa exclusivamente `DocumentViewer` no
tipo `PMOC`.

Estados de UX: `EM PREENCHIMENTO` antes da conclusão; `NÃO ASSINADO` após conclusão sem coleta;
`ASSINADO` quando `signatureCaptured=true`.

## Laudo Técnico — composição de Objetivo e Conclusão

- Use `technicalOpinionObjective` e `technicalOpinionConclusion` para o texto livre principal do
  responsável técnico.
- Envie as escolhas do catálogo separadamente em `technicalOpinionObjectiveItems[]` e
  `technicalOpinionConclusionItems[]`.
- Não concatene seleções e texto livre. Preview e PDF exibem o parágrafo primeiro e a lista depois.
- Ao editar uma Operation antiga, as coleções podem estar vazias; preserve o texto existente.

## PMOC e Ordem de Serviço

O wizard possui dois caminhos:

1. `Criar novo PMOC`: coleta cliente, equipamentos, responsável, vigência e recorrência; chama
   `POST /pmoc`.
2. `Selecionar PMOC existente`: carrega o plano e permite `PATCH /pmoc/:id` ou remoção lógica por
   `DELETE /pmoc/:id`.

Após escolher/criar o PMOC, a emissão cria uma Operation oficial. O backend gera o documento
`WORK_ORDER` padrão e o frontend vincula a Operation à execução `PLANNED` do MaintenancePlan. Essa
OS deve ser tratada como qualquer outra em Agenda, Operações, Ordens e Operator. Somente
OWNER/MANAGER administram o plano.

## PMOC UX-01

- Use `equipmentIds[]` como seleção múltipla oficial e `serviceTypes[]` com `OperationType`.
- Mantenha `defaultOperationType` como o primeiro tipo para compatibilidade.
- O prefill já entrega `inspectedEquipments[]` e `serviceTypes[]`; não reconstrua o escopo.
- Consulte `GET /documents/configuration/types/PMOC`: `NONE` oculta assinatura; `FIXED` mostra a
  institucional em leitura; `COLLECTED` mostra coleta; `HYBRID` mostra ambas.
- `signatureOverrideId` pertence ao PMOC e nunca deve causar PATCH no Template.
- Não apresente nomes de entidades, estados ou serviços internos ao usuário.

## Field Report Handoff 01

### Fluxo Operator

Na Operation atribuída, use `POST /documents/handoffs` para salvar o documento oficial, PATCH da
Operation para conteúdo/equipamentos/evidências e o endpoint de assinatura do cliente quando a
matriz exigir. `submit` envia para revisão; não mostre Render/Download/finalização no Operator.

Matriz: OS, Visita, Orçamento e PMOC exigem cliente+técnica; Laudo exige só técnica; Recibo não é
oferecido no Operator. PMOC continua usando o wizard/evidências existentes e exige quatro imagens.

### Fluxo Platform

`GET /documents/handoffs` alimenta a caixa de entrada. Ao abrir, carregue a Operation existente,
mantenha campos editáveis, mostre evidências por `GET /operations/photos/:id`, assinatura do cliente
pelo endpoint binário dedicado e assinatura técnica pelo endpoint autenticado de Signatures.
Sequência: `review → editar Operation → selecionar assinatura técnica → finalize → preview → render
→ download`.

Estados de UI: `DRAFT=Rascunho`, `PENDING=Pendente`, `READY=Pronto`, `STALE=Desatualizado`. READY não
significa que já existe PDF. STALE exige nova revisão/finalização/render e preserva o PDF anterior.

### Segurança de integração

Não persista Base64 recebido em estado global, não monte URL de Storage e não renderize metadata
como HTML. Use exclusivamente os clients oficiais, cancelamento por `AbortSignal`, retry explícito e
tratamento dos códigos de pendência retornados em `details.issues`.

## PMOC FIX-01 — Preview, geração e download

Na tela do plano, selecione a execução com `operation` e o primeiro documento do array já filtrado
como `PMOC`. Passe `documentId`, `operationId`, tipo `PMOC` e os metadados do artefato ao
`DocumentViewer`. Estados: sem `renderedAt` = **Sem PDF**; fingerprint atual diferente do
`renderMetadata.sourceFingerprint` = **PDF desatualizado**; caso contrário = **PDF disponível**.

Nunca mantenha uma cópia isolada da execução aberta: após renderizar, resolva-a novamente pela ID na
lista atualizada. Isso preserva o `documentId` recém-criado e libera o download oficial no mesmo
Drawer. OWNER/MANAGER podem renderizar; o backend permanece a autoridade.
# PMOC FIX-02A — integração de revisão de assinaturas

- A revisão usa exclusivamente o handoff oficial do documento PMOC.
- `customerSignature.collectedBy` é a fonte para “Coletada por”; `collectedAt` fornece data e hora.
- Coleta/substituição: `PATCH /documents/:documentId/handoff/customer-signature`.
- Seleção técnica da execução corrente: `PATCH /documents/:documentId/handoff/technical-signature`.
- Override das futuras emissões daquele PMOC: `PATCH /pmoc/:id` com `signatureOverrideId`.
- Alterar o override não modifica a assinatura global nem documentos já emitidos; o preview oficial deve ser recarregado após a resposta.

## PMOC FIX-02B — integração de evidências

- Use `operation.photos[].createdBy/createdAt` para autor/data; esses metadados são somente leitura.
- Miniaturas vêm exclusivamente de `GET /operations/photos/:photoId`; não persista Base64.
- Adição múltipla reutiliza PATCH da Operation; legenda usa PATCH e remoção usa DELETE da foto.
- Após qualquer mutação, recarregue Operation e `DocumentViewer`. A ordem do array é a ordem documental.

## Operator — atendimento autônomo e delegado

1. O seletor inicial define o `documentType`; envie-o ao criar a Operation.
2. Para atividade autônoma, percorra as APIs oficiais de Assignment (`accept`, `start`, `complete`), salve o handoff e submeta.
3. Exiba `workflowStatus`, não derive o estado comparando roles: `DRAFT` significa aguardando aprovação e `REVIEW` significa atividade delegada devolvida à gestão.
4. Para PMOC, liste planos/execuções existentes e use `prefill → generate-work-order`; nunca crie uma Operation PMOC avulsa.
5. Em atividade delegada, bloqueie a troca do tipo documental no campo e use `operation.requestedDocumentType`.
## DC-06 — Wizard e documento de Orçamento

1. Origem manual não envia operationId; origem OS lista status=COMPLETED e usa a Operation apenas como preenchimento inicial editável.
2. Envie serviços e materiais diretamente em items, diferenciados por type. Não consulte Product, Pricing ou Inventory para compor o orçamento nesta versão.
3. Somas no cliente são feedback de UX; a resposta da API é a autoridade dos totais.
4. Após criar, use budget.document.id para escolher assinatura técnica e coletar assinatura do cliente pelo handoff oficial.
5. Preview usa GET /budgets/:id/preview; emissão usa POST /budgets/:id/render; download usa GET /budgets/:id/download.
6. document.editorialStatus=STALE exige nova emissão. DocumentViewer permanece o único visualizador.
# Integração Customer Workspace e Vendas

- A lista de clientes navega para `/clientes/:id`; o drawer é reservado a criar/editar.
- Equipamentos: consumir `GET /equipments?customerId=:id` com paginação.
- Serviços: consumir `GET /operations?customerId=:id` com paginação; o detalhe continua no `OperationDetailDrawer` oficial.
- Vendas: consumir `GET /sales?customerId=:id`; nunca calcular preço, custo, total ou fim da garantia como autoridade no frontend.
- Para Recibo vindo de venda, selecionar uma venda concluída, chamar `GET /sales/:id/receipt-prefill` e criar a operação documental com `sourceSaleId`. Preview, render e download continuam no Document Engine.
- Estados esperados: loading, erro/retry, vazio, `DRAFT`, `COMPLETED`, `CANCELED`.
# Primeiro acesso do Operator

1. Validar senha temporária, nova senha e confirmação localmente.
2. Capturar e confirmar a assinatura com `SignaturePad`.
3. Enviar um único multipart para `POST /users/complete-first-access`.
4. Limpar tokens e redirecionar ao login; todas as sessões foram revogadas.

A assinatura retornada pertence ao mesmo catálogo de `GET /signatures`. Nenhum frontend deve copiá-la para estado persistente, base64 pública ou cadastro paralelo.
# Integração da classificação comercial de produtos

- Produtos comprados: `GET /products?purchasable=true`.
- Produtos vendidos: `GET /products?sellable=true`.
- Um mesmo produto pode aparecer nas duas abas quando ambas as classificações estiverem ativas.
- O formulário envia `isPurchasable` e `isSellable` e deve manter ao menos uma opção selecionada.
- Cliente > Vendas deve carregar seu seletor com `sellable=true`; não reutilizar catálogo sem filtro.
- Compras e materiais operacionais devem carregar produtos com `purchasable=true`.
- O backend continua sendo a autoridade e retorna `PRODUCT_NOT_SELLABLE` ou `PRODUCT_NOT_PURCHASABLE` para classificações incompatíveis.
