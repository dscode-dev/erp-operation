# Product Backlog Closure 05.1 — Platform Visit Report Workflow Consolidation

Data: 2026-07-10

## Stage 0 architectural conclusion

`/reports/visita` não é um domínio de negócio independente. Ele representava uma implementação
legada/paralela de coleta de evidências de uma execução operacional.

Decisão: consolidar a rota como interface Operation-bound.

## Workflow matrix

| Workflow | Domain source | Photos persisted? | Signature persisted? | Real preview? | PDF render? | Status |
|---|---|---:|---:|---:|---:|---|
| Operator execution | Operation | Sim, quando enviadas | Sim | Sim | Sim | Oficial |
| Platform Operation workflow | Operation | Sim via `PATCH /operations/:id` | Sim via `PATCH /operations/:id` | Sim | Sim | Oficial |
| `/reports/visita` antes | Estado React local | Não | Não | Não real | Não real | Removido |
| `/reports/visita` agora | Operation | Sim | Sim | Sim | Sim | Consolidado |
| `/reports` real preview | Operation | Sim | Sim | Sim | Sim | Oficial |

## Evidence ownership matrix

| Artifact | Current owner before | Correct owner | Persistence |
|---|---|---|---|
| execution notes | React state | Operation | `Operation.observations` |
| activities/checklist | React state/Operation | Operation | `Operation.checklist` |
| visit photos | React object URLs | OperationPhoto + StorageProvider | `OperationPhoto.storageKey` privado |
| equipment evidence | local preview | OperationPhoto | DocumentContext resolves safely |
| collected signature | React state | Operation | `Operation.signatureData` + `signedAt` |
| signedAt | React state | Operation | ISO date validated by DTO |

## Implementation

- `PATCH /operations/:id` passou a aceitar `signatureData`, `signedAt` e `photos[]`.
- Fotos novas usam a mesma validação e persistência do create: data URL PNG/JPEG → StorageProvider →
  `OperationPhoto`.
- Assinatura usa a validação já consolidada: PNG/JPEG, magic bytes e limite de 2 MiB.
- `DocumentContextService` resolve `OperationPhoto` por `DocumentAssetResolver`.
- `DocumentBuilderService` inclui imagem resolvida nos componentes `image`.
- `DocumentRendererService`, PDF Engine e `DocumentViewer` passam a renderizar evidências reais
  quando o blueprint traz `image.contentBase64`.
- `/reports/visita` agora seleciona uma Operation real, salva evidências e usa `DocumentViewer` com
  `TECHNICAL_REPORT`.

## Preview/render parity

Preview real e PDF usam:

```text
Operation
↓
DocumentContext
↓
DocumentBuilder
↓
DocumentBlueprint
├── DocumentViewer
└── DocumentRenderer/PdfEngine
```

## Historical document behavior

- Downloads continuam retornando o PDF renderizado armazenado.
- Preview reconstrói o blueprint com o estado atual da Operation.
- Novo render substitui o binário anterior com `renderMetadata` de proveniência.
- Nenhum histórico foi migrado ou destruído.

## AppSec

- Sem storageKey público.
- Sem object URL persistido.
- Sem PDF local.
- Sem base64 em audit/lifecycle/renderMetadata.
- Backend permanece autoridade de RBAC e validação.

## Tests and validation

- Testes adicionados para assinatura de execução, fotos persistidas no contexto/blueprint e payload
  de assinatura inválido.
- `backend npm test -- --silent`: 16 suites / 44 testes passaram.
- `backend npm run lint`: passou.
- `backend npm run build`: passou.
- `frontend npm run lint`: passou com 2 warnings pré-existentes.
- `frontend npm run build`: passou.
- `npx prisma generate`: passou.
- `DATABASE_URL=... npx prisma validate`: passou.
- `git diff --check`: passou.

## Remaining risks

- A V1 ainda não possui captura de nome/cargo do signatário de campo; documentos exibem o rótulo
  correto sem inventar identidade.
- Testes PostgreSQL dedicados de integração/concurrency/security não foram executados nesta rodada
  por ausência de banco dedicado informado.
