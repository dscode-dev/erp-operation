# Product Backlog Closure 05 — Reports Preview/PDF and Signature Consistency

Data: 2026-07-10

## Reports visual findings

- Cards de `/reports` estavam com sombra forte, faixa decorativa, ícone grande e múltiplas ações
  saturadas.
- A hierarquia visual fazia as ações competirem com a identidade do modelo documental.
- O drawer não explicava com clareza suficiente a diferença entre preview estrutural de modelo e
  preview com dados reais.

## Visual changes

- Cards ficaram mais compactos, com borda fina, superfície neutra, hover discreto e ações pequenas.
- Ações foram renomeadas visualmente para `Modelo`, `Dados reais` e `Configurar`, com menor peso.
- O drawer agora informa explicitamente a semântica do preview estrutural e do preview real.

## Document pipeline matrix

| Path | Source | Context | Builder | Blueprint | Renderer | Storage |
|---|---|---|---|---|---|---|
| Model Preview | `DocumentTemplate` | `TemplatePreviewContext` | `DocumentBuilderService.buildFromTemplate` | `DocumentBlueprint` | Browser `DocumentViewer` | Não grava |
| Real Preview | `Operation` | `DocumentContext` | `DocumentBuilderService.buildFromOperation` | `DocumentBlueprint` | Browser `DocumentViewer` | Não grava |
| PDF Render | `OperationDocument`/`Operation` | `DocumentContext` | `DocumentBuilderService.buildFromOperation` | `DocumentBlueprint` | `DocumentRendererService` + `PdfEngineService` | `DocumentAssetResolver.saveDocumentPdf` |
| Download | `OperationDocument` | PDF renderizado | Não reconstrói | PDF persistido | Browser download | `DocumentAssetResolver.getDocumentPdf` |

## Root cause

`Operation.signatureData` era persistida, mas `DocumentContextService.resolveSignature()` só
transportava `signedAt` para a assinatura coletada. A imagem da assinatura nunca entrava no
`SignatureComponent`, então preview real e PDF ficavam semanticamente coerentes entre si, porém sem
a assinatura executada.

## Signature semantics

- Assinatura fixa: entidade `Signature`, reutilizável, vinculada a template.
- Assinatura coletada: artifact da execução da `Operation`, capturado como data URL pelo fluxo de
  campo.
- O sistema não inventa nome de signatário quando o fluxo não coleta esse dado.

## Mobile/platform persistence matrix

| Flow | Capture UI | Endpoint | Persistence | Owner entity | Document Context |
|---|---|---|---|---|---|
| Operator PWA | `SignaturePad` canvas PNG | `POST /operations` via draft | `Operation.signatureData`/`signedAt` | Operation | Sim |
| Platform Operation drawer | Não captura assinatura | `POST /operations` | Não envia assinatura | Operation | Não aplicável |
| Platform `/reports/visita` legado | `SignaturePad` visual | Nenhum submit oficial | Não persiste | Nenhuma entidade | Não |

## Context and builder changes

- `DocumentContextService` normaliza assinatura executada como `collectedSignature.image`.
- `DocumentBuilderService` emite a imagem no `SignatureComponent`.
- Se houver assinatura fixa e assinatura executada, o modo efetivo passa a `HYBRID`.
- Se o template não exigir assinatura, mas uma OS/relatório/recibo executado possuir assinatura, o
  modo efetivo passa a `COLLECTED`.

## Applicability matrix

| Tipo | Assinatura de execução | Assinatura de template |
|---|---|---|
| `WORK_ORDER` | Sim | Sim |
| `TECHNICAL_REPORT` | Sim | Sim |
| `REPORT` | Sim, compatibilidade legado | Sim |
| `RECEIPT` | Sim | Sim |
| `TECHNICAL_OPINION` | Não automática | Sim, por política |
| `PMOC` | Não automática | Sim, por política |
| `QUOTE` | Não | Sim, por política |
| `BUDGET` | Não | Sim, por política |

## Provenance

`renderMetadata` recebeu `sourceKind`, `sourceId`, `templateId`, `templateUpdatedAt`,
`documentType`, `documentNumber`, além de `blueprintVersion`, `pageCount` e `generatedAt`.

## AppSec verification

- Assinatura executada aceita apenas PNG/JPEG data URL.
- Magic bytes binários são verificados.
- Limite: 2 MiB.
- `storageKey` não é exposto ao frontend.
- Base64 não é gravado em audit/lifecycle/renderMetadata.
- PDF continua acessando storage apenas via `DocumentAssetResolver`.

## Tests and validation

- Teste adicionado em `backend/test/document-engine.spec.ts` para assinatura coletada em
  `DocumentContext` e `SignatureComponent`.
- `backend npm run build`: passou.
- `backend npm run lint`: passou.
- `backend npm test -- --runInBand backend/test/document-engine.spec.ts`: passou.
- `frontend npm run build`: passou.
- `frontend npm run lint`: passou com 2 warnings pré-existentes.
- `git diff --check`: passou.

## Deferred findings

- O fluxo atual não captura nome/cargo do signatário de campo; por isso o documento não inventa essa
  identidade.
- A rota Platform `/reports/visita` ainda é visual-only e não persiste assinatura/fotos. A correção
  do Document Engine funciona para qualquer Operation que possua `signatureData`, mas essa rota
  precisa ser substituída por um fluxo real de execução se continuar no produto.
- Testes completos com PostgreSQL real não foram executados neste fechamento focado.
