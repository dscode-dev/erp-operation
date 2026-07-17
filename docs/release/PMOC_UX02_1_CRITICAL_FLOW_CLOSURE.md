# PMOC UX-02.1 — Critical Flow Closure

Data: 2026-07-17

## 1. Inspeção e causas raiz

A inspeção percorreu Wizard PMOC, Execution Request, geração da OS, `OperationInspectedEquipment`,
Assignment, tela Platform, Operator, configuração de Templates, assinaturas, DocumentContext,
Builder, Renderer, PdfEngine, Storage e repositório `/documentos`.

As quatro causas confirmadas foram:

1. o Wizard inicializava `signatureMode` como `NONE`, confundindo carregamento/erro com política real;
2. o detalhe PMOC expunha links históricos, mas não instanciava o `DocumentViewer` para a execução;
3. `OperationPhoto` já era a fonte oficial, porém não havia UX completa nem precondição server-side
   para evidências PMOC;
4. o backend e o prefill já suportavam múltiplos equipamentos, mas o drawer reduzia a edição ao
   `equipmentId` principal.

A validação visual ainda encontrou um quinto ponto: OPERATOR não conseguia ler a projeção sanitizada
da política PMOC. O RBAC foi ajustado de forma restrita somente para esse tipo documental.

## 2. Decisões arquiteturais

- Nenhum domínio, entidade, Wizard, Renderer, PDF ou Storage paralelo foi criado.
- `OperationPhoto` continua sendo a evidência oficial da execução.
- `OperationInspectedEquipment` continua sendo a relação oficial de múltiplos equipamentos.
- `DocumentTemplate` e `DocumentConfigurationService` continuam sendo a autoridade de assinatura.
- A quantidade mínima adotada é quatro imagens porque o domínio não possuía regra persistida; a
  constante única `PMOC_MIN_PROCEDURE_IMAGES` evita números divergentes no backend.
- Salvamento parcial é permitido; apenas conclusão e emissão final são bloqueadas.
- Download oficial mudou de JSON/Base64 para PDF binário autenticado, sem acesso direto ao Storage.

## 3. Implementação backend

- `AssignmentsService`, `OperationsService` e `DocumentEngineService` aplicam
  `PMOC_EVIDENCE_REQUIRED` antes das transições finais.
- Upload de fotos valida MIME, tamanho e magic bytes PNG/JPEG.
- `DocumentBuilderService` diferencia os estados NONE/FIXED/COLLECTED/HYBRID e adiciona aviso
  explícito quando a coleta obrigatória ainda não ocorreu.
- `DocumentConfigurationService` possui projeção pública sem chaves ou binários; a rota por tipo
  permite OPERATOR somente para PMOC.
- Execution Requests retornam `signedAt` e `_count.photos` sem consultas extras por item.
- Controllers de Documento e Orçamento entregam bytes PDF com headers seguros.

## 4. Implementação frontend

- O Wizard mantém `signatureMode = null` durante carregamento e mostra erro real sem fallback falso.
- O detalhe PMOC abre `DocumentViewer` com Preview, Render, Rerender e Download.
- `PhotoInput` cobre múltiplos arquivos, legenda, preview, progresso, erro, ordem, remoção e cleanup.
- Platform e Operator persistem no mesmo endpoint oficial da Operation.
- O drawer da OS usa MultiSelect e envia todos os itens por `inspectedEquipments`.
- `documentsApi` e `budgetsApi` usam `api.blob()`; viewers revogam object URLs.

## 5. Arquivos criados

- `backend/test/runtime/verify-pmoc-ux02-1-runtime.mjs`
- `frontend/test/runtime/verify-pmoc-ux02-1-ui.mjs`
- `docs/release/PMOC_UX02_1_CRITICAL_FLOW_CLOSURE.md`

## 6. Arquivos modificados

Backend:

- `src/modules/assignments/assignments.service.ts`
- `src/modules/operations/operations.service.ts`
- `src/modules/pmoc-compliance/pmoc-execution-requests.service.ts`
- `src/modules/document-engine/{document-engine.controller,document-engine.service}.ts`
- `src/modules/document-engine/builder/document-builder.service.ts`
- `src/modules/document-engine/configuration/{document-configuration.controller,document-configuration.service}.ts`
- `src/modules/budgets/budgets.controller.ts`
- `src/shared/constants/{error-codes.constants,pmoc.constants}.ts`
- testes de Document Engine, segurança PMOC e scripts runtime documentais.

Frontend:

- detalhe PMOC, atendimento Operator e drawers oficiais de Operation/OS;
- `pmoc-plan-wizard.tsx`, `photo-input.tsx` e `document-viewer.tsx`;
- clients de Documents/Budgets e tipos compartilhados.

Documentação:

- Backend: STATE, API_CONTRACTS, FRONTEND_INTEGRATION, OPUS_INTEGRATION e SECURITY.
- Frontend: STATE, COMPONENTS, ROUTES e ARCHITECTURE.

## 7. Migrações

Nenhuma. O schema oficial já possuía fotos, múltiplos equipamentos, override de assinatura e
OperationDocument. A closure altera comportamento, projeções e UX sem mudança destrutiva.

## 8. Evidência runtime funcional

O cenário real criou PMOC HYBRID com dois equipamentos, assinatura institucional, Execution Request,
OS, Assignment e quatro fotos. Resultados:

- prefill e Operation preservaram 2 equipamentos;
- render e conclusão sem fotos retornaram `409 PMOC_EVIDENCE_REQUIRED`;
- Preview recebeu 4 imagens em 4 colunas;
- primeiro render ficou `NÃO ASSINADO`;
- assinatura posterior tornou o download anterior `DOCUMENT_STALE`;
- novo Preview/Render recebeu assinatura institucional + cliente;
- PDF baixado iniciou com `%PDF-` e possui 23.844 bytes;
- documento foi localizado em `/documentos`.

Evidências locais:

- `/private/tmp/orbit-pmoc-ux02-1-evidence.json`
- `/private/tmp/orbit-pmoc-ux02-1.pdf`

## 9. Evidência visual

Chrome headless validou o frontend Docker real:

- Wizard HYBRID: assinatura institucional readonly, override local e coleta do cliente;
- detalhe PMOC: status assinado, 4/4 evidências e ações oficiais do DocumentViewer;
- Operator: dois equipamentos, 4/16 imagens, política PMOC e fluxo de campo.

Screenshots:

- `/private/tmp/orbit-pmoc-ux02-1-wizard-signature.png`
- `/private/tmp/orbit-pmoc-ux02-1-document-drawer.png`
- `/private/tmp/orbit-pmoc-ux02-1-operator.png`

## 10. AppSec

- RBAC backend continua sendo autoridade; OPERATOR lê somente configuração do tipo PMOC.
- MIME, limite e assinatura binária são validados antes do Storage.
- Chaves UUID e proteção de path traversal permanecem no StorageProvider.
- Projeções de configuração não retornam `imageStorageKey`, paths ou binários.
- PDF é entregue como resposta binária autenticada; stale detection ocorre antes da leitura.
- Nenhum token, path ou chave foi incluído nas evidências ou logs de fechamento.

## 11. Validações

- Prisma validate: PASS.
- Prisma generate: PASS.
- Backend lint/build: PASS.
- Frontend lint/build: PASS.
- Backend unit: 19 suites / 84 testes: PASS.
- PostgreSQL integration: 2 suites / 8 testes: PASS.
- PostgreSQL concurrency: 2 suites / 24 testes: PASS.
- Segurança PMOC isolada: 1 suite / 15 testes: PASS.
- Segurança completa: 12 suites / 49 testes: PASS.
- Runtime funcional PMOC UX-02.1: PASS.
- Runtime visual PMOC UX-02.1: PASS.
- Docker build/health: PASS.
- `git diff --check`: PASS na verificação intermediária; repetido no fechamento.

## 12. Riscos residuais e itens deferidos

- O mínimo de quatro imagens é constante de domínio nesta closure. Torná-lo configurável por Template
  exigirá contrato persistido e migration aditiva em backlog futuro.
- Upload atual da Operation é transacional por requisição, mas não oferece retomada multipart; isso
  permanece fora da V1 e não impede o fluxo validado.
- Assets resolvidos no Blueprint são efêmeros e autorizados para Preview/Renderer; chaves físicas não
  são públicas. Uma futura entrega por URLs assinadas pode reduzir o tamanho do Preview sem alterar o
  Storage oficial.

## 13. Veredito

`ORBIT_PMOC_UX02_1_READY`
