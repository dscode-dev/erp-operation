# FIELD REPORT HANDOFF 01

Data de certificação: 17/07/2026.

## 1. Executive Summary

O Orbit passa a usar o Operator como origem da coleta de campo e a Platform como autoridade de
revisão e emissão. O fluxo completo reutiliza Operation, Assignment, MaintenanceExecution e o
Document Engine oficial. Não foi criado renderer, PDF, Storage, OS ou PMOC paralelo.

## 2. Architecture Inspection

Foram inspecionados Operations, Assignments, PMOC, evidências, assinatura operacional,
DocumentContext, Builder, Blueprint, Renderer, PdfEngine, repositório, Central de Relatórios,
Operator e notificações. `OperationDocument` já era a menor extensão correta para hospedar o estado
editorial; apenas recebeu campos aditivos e histórico próprio.

## 3. Root Causes

O estado anterior misturava documento renderizado com relatório em preparação, deixava a escolha de
assinaturas dependente de política variável do Template e não possuía autoria/origem/revisão
persistidas. O Operator também não tinha um contrato de submissão sem emissão final.

## 4. Existing Flow Preservation

Preview, Render, Download, PDFs históricos, criação manual da Platform, PMOC, Operation,
MaintenanceExecution, Assignment, StorageProvider e versionamento foram preservados.

## 5. Domain Decisions

`OperationDocument` representa o documento oficial e seu estado editorial. `DocumentRevision`
registra alterações append-only. Dados operacionais continuam na Operation; não foram duplicados em
payload documental paralelo.

## 6. Report Lifecycle

`DRAFT → PENDING → READY`; alteração relevante pós-render produz `STALE`; revisão/finalização e nova
renderização restauram READY. O estado do PDF continua independente.

## 7. Operator Collection Flow

Na Operation atribuída, o Operator seleciona tipo, equipamentos, conteúdo, evidências e assinatura,
salva parcialmente e envia. Chamadas diretas de finalização/render retornaram 403 no runtime.

## 8. Platform Review Flow

A Central de Relatórios oferece inbox e drawer pré-preenchido. Conteúdo permanece editável; imagens
e assinatura do cliente são visíveis; assinatura técnica pode ser escolhida; finalização explícita
habilita o DocumentViewer oficial.

## 9. Signature Model

OS, Visita, Orçamento e PMOC usam cliente+técnica. Laudo e Recibo usam apenas técnica. Campos
`SignatureMode` legados permanecem compatíveis com históricos, mas não governam novos handoffs.

## 10. Technical Signature Selection

OWNER/MANAGER escolhem assinatura ativa com imagem. A escolha vale somente para o documento e é
auditada. O Builder recebe a assinatura pelo DocumentContext; não pesquisa banco.

## 11. Default Signature Configuration

Signature recebeu `organizationId`, `profession`, `registrationNumber`, `isDefault` e `position`.
Índice parcial garante no máximo uma assinatura ativa padrão por organização.

## 12. Customer Signature Collection

A imagem PNG/JPEG é validada binariamente, limitada a 2 MiB, armazenada com UUID e acompanhada de
nome, função, instante, timezone, ator, origem e SHA-256. A leitura usa endpoint binário autorizado e
sem cache.

## 13. Work Order Results

Runtime: DRAFT Operator, revisão, duas assinaturas no mesmo Blueprint, READY, Preview, PDF válido,
repositório, STALE após edição e segunda emissão aprovados.

## 14. Technical Visit Results

Runtime real do handoff `TECHNICAL_REPORT`: assinatura cliente+técnica, Preview, Render e PDF válido
de 22.469 bytes.

## 15. Technical Opinion Results

Runtime real: submissão sem cliente aceita; finalização exigiu assinatura técnica; Preview contém
exatamente uma assinatura e Render foi aprovado.

## 16. Budget Results

Runtime real do handoff operacional inicial: assinatura cliente+técnica, Preview, Render e PDF válido
de 27.465 bytes. Regras financeiras continuam restritas no backend.

## 17. PMOC Results

O cenário oficial criou PmocPlan, ExecutionRequest, Operation, Assignment e MaintenanceExecution.
O handoff preservou dois equipamentos, quatro evidências, assinatura do cliente, assinatura técnica,
READY e PDF válido de 23.947 bytes.

## 18. Receipt Compatibility

Recibo não aparece no Operator. Preview manual da Platform permaneceu funcional e usa o pipeline
oficial, sem assinatura do cliente.

## 19. Document Engine Integration

Todo resultado segue `DocumentContext → Builder → Blueprint → LayoutEngine → Renderer → PdfEngine
→ Storage`. Assets são resolvidos pelo `DocumentAssetResolver`.

## 20. Preview/PDF Parity

Preview e PDF são produzidos do mesmo Blueprint. Runtime verificou assinaturas nos Blueprints e
assinatura `%PDF-` nos arquivos de OS, Visita, Orçamento e PMOC.

## 21. Document Repository

`/documentos` lista os documentos emitidos com tipo, origem, cliente, equipamento, responsável,
emissão, versão/revisão e estado editorial. O runtime confirmou o registro READY.

## 22. Notifications

Submissão cria `DOCUMENT_SUBMITTED` para gestão; finalização cria `DOCUMENT_READY` para o Operator.
Mensagens não incluem conteúdo financeiro ou binários.

## 23. RBAC

Operator coleta apenas com Assignment e não finaliza/renderiza. OWNER/MANAGER revisam e emitem.
Viewer mantém leitura conforme os contratos existentes.

## 24. AppSec

UUID/DTO, MIME/binário/tamanho, autorização por Assignment, endpoints autenticados, no-store,
ausência de paths/Storage keys, snapshots e rate limiting foram preservados. AppSec: 49/49.

## 25. Audit Trail

AuditLog registra save, submit, review, assinatura técnica, finalização e render. DocumentRevision
registra revisão monotônica, origem, ator, campos alterados e snapshot; runtime confirmou 11 eventos
no ciclo OS com STALE/re-render.

## 26. Migrations

`20260717150000_field_report_handoff_01`: enums editoriais/origem/revisão, campos aditivos em
signatures/operation_documents, FKs, índices, notifications e tabela `document_revisions`.

## 27. Backfill

Assinaturas existentes são associadas à organização única. Documentos com `rendered_at` tornam-se
READY; demais ficam DRAFT. Nenhuma linha ou artefato é removido.

## 28. Files Created

- migration `20260717150000_field_report_handoff_01`;
- `document-handoff.service.ts` e DTO;
- teste de integração do handoff;
- `FieldReportHandoff` e `DocumentHandoffInbox`;
- scripts runtime API/UI;
- este relatório.

## 29. Files Modified

Prisma schema; Document Engine/controller/context/builder; Operations; Signatures; constants; seed;
API/types frontend; Reports, Settings, Operator e Documentos; documentação backend/frontend.

## 30. Automated Tests

- unit: 19 suites, 84/84;
- integration PostgreSQL: 3 suites, 10/10;
- concurrency PostgreSQL: 2 suites, 24/24;
- AppSec PostgreSQL: 12 suites, 49/49.

## 31. Runtime API Validation

Docker API saudável, PostgreSQL conectado, 49 migrations sem pendências. Evidence:
`/private/tmp/orbit-field-report-handoff-01-evidence.json`; PDFs validados por magic bytes.

## 32. Runtime Platform Validation

Inbox, documento pré-preenchido, evidência, duas assinaturas, Viewer e repositório foram inspecionados
em Chrome headless. Screenshot: `/private/tmp/orbit-field-report-handoff-01-platform-review.png`.

## 33. Runtime Operator Validation

Os cinco tipos, múltiplos equipamentos, conteúdo, fotos, assinatura, salvar/enviar foram exibidos;
Render/Download não apareceram. Screenshot: `/private/tmp/orbit-field-report-handoff-01-operator.png`.

## 34. Residual Risks

Operação offline continua limitada às capacidades atuais do PWA. Evoluções comerciais completas do
Budget e notificações push permanecem fora deste fechamento. Base64 legado de fotos/assinaturas em
endpoints dedicados pode migrar futuramente para streaming uniforme sem quebra contratual.

## 35. Remaining Blockers

Nenhum bloqueador funcional identificado para o escopo. O IP público/local definido no `.env` deve
continuar sendo ajustado por ambiente no deployment; a certificação visual utilizou origem localhost
autorizada pelo CORS.

## 36. Final Verdict

ORBIT_FIELD_REPORT_HANDOFF_01_READY
