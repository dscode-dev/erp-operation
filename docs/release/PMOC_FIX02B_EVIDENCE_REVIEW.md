# ORBIT — PMOC FIX-02B — Evidence Review Runtime Report

Data: 17/07/2026

## Inspeção e causa raiz

A inspeção percorreu Wizard PMOC, OperationPhoto, PhotoInput, StorageProvider, DocumentContext,
Builder e Viewer. O fluxo oficial já persistia imagens, mas o Wizard não possuía etapa de gestão, a
foto não registrava autor individual e não existiam contratos restritos para legenda/remoção.

## Decisões arquiteturais

- `OperationPhoto` permanece a única entidade; `createdById` é enriquecimento histórico.
- Upload continua no PATCH da Operation e no StorageProvider existente.
- Legenda/remoção atuam sobre a foto oficial e invalidam documentos submetidos.
- `DocumentContext` permanece a única origem da ordem, legendas e imagens do Blueprint.
- A etapa é interna ao `PmocPlanWizard`; `PhotoInput`, `ConfirmDialog` e `DocumentViewer` foram reutilizados.

## Arquivos e migration

Criados: migration `20260717210000_pmoc_fix02b_photo_author`, verificadores runtime backend/UI e
este relatório. Alterados: schema Prisma, DTO/controller/service de Operations, auditoria, tipos e
client Operation, `PhotoInput`, Wizard, detalhe PMOC e documentação obrigatória.

A migration é aditiva: coluna nullable, backfill pelo operador, FK `ON DELETE SET NULL` e índice
`(created_by_id, created_at)`. Nenhuma imagem ou linha foi removida.

## Runtime — cenário 1 (Operator)

- PMOC `df5a77aa-5ec6-4fb6-9996-ff30df6d4c59`.
- 4 evidências com legenda, data/hora e autor `Operator PMOC UX-02.1`.
- Miniaturas lidas pelo endpoint autenticado.
- Captura: `/private/tmp/orbit-pmoc-fix02b-scenario-1-operator.png`.

## Runtime — cenário 2 (Platform)

- PMOC `16e3cabb-e262-47ee-a5c2-dedca14f8976`.
- Empty state, upload múltiplo, preview pré-envio e progresso confirmados.
- Legenda alterada e evidência removida; Operator recebeu 403 nas duas mutações.
- Auditorias `UPLOADED`, `CAPTION_UPDATED` e `DELETED` confirmadas.
- Captura: `/private/tmp/orbit-pmoc-fix02b-scenario-2-platform.png`.

## Runtime — cenário 3 (documento)

- IDs/ordem das evidências idênticos na Operation, Preview e documento emitido.
- Documento `6a3cb744-97d3-4e25-ad90-a68e965ec073`.
- PDF oficial válido `%PDF-`, 24.241 bytes.
- Captura: `/private/tmp/orbit-pmoc-fix02b-scenario-3-document.png`.
- Evidências estruturadas: `/private/tmp/orbit-pmoc-fix02b-evidence.json` e
  `/private/tmp/orbit-pmoc-fix02b-ui-evidence.json`.

## AppSec

Allowlist PNG/JPEG, assinatura binária, 5 MiB, máximo 16, nomes UUID, RBAC, acesso autenticado,
ausência de paths/chaves e auditoria append-only foram preservados. Metadados e invalidação
documental são transacionais.

## Validações

- Prisma validate/generate/migrate: PASS
- Backend lint/build: PASS
- Unit: 19 suites, 84 testes: PASS
- PostgreSQL integration: 3 suites, 10 testes: PASS
- Security PostgreSQL: 12 suites, 49 testes: PASS
- Frontend lint/build: PASS
- Runtime API/Docker: 3 cenários: PASS
- Runtime Chrome: 3 cenários e capturas: PASS

## Riscos residuais

O progresso representa preparação e transmissão pelo client Fetch; progresso byte a byte exigiria
trocar a infraestrutura HTTP compartilhada. Fotos históricas sem usuário válido conservam autoria
nula e a UI usa o responsável da Operation como fallback.

## Veredito

`ORBIT_PMOC_FIX02B_READY`
