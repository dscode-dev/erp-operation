# ORBIT — Product Backlog Closure 07

Data: 12 de julho de 2026

## 1. Menu Reorganization Results

- Modelos de Relatórios: Cadastros → `/report-templates`.
- Central de Relatórios: Gestão → `/reports`.
- Financeiro: movido visualmente para Gestão, sem mudança funcional.
- Documentos: preservado em Operação.
- Configurações: removidas as seções duplicadas de modelos/configuração documental.

## 2. Navigation Matrix

| Rota | Responsabilidade |
|---|---|
| `/reports` | emissão e histórico operacional |
| `/report-templates` | CRUD/configuração de modelos |
| `/documentos` | repositório oficial |
| `/budgets` | fluxo comercial do orçamento |
| `/settings` | organização, branding, parâmetros e assinaturas |

`/reports/visita` redireciona para a Central.

## 3. Report Center Architecture

```text
Wizard → Operation/MaintenanceExecution → DocumentContext → Builder → Blueprint
       → DocumentViewer / LayoutEngine → Renderer → PdfEngine → Storage → /documents
```

Nenhum engine, viewer, renderer ou repositório paralelo foi criado.

## 4. Workflow Matrix

| Tipo | Origem | Conteúdo | Preview/Render/PDF |
|---|---|---|---|
| WORK_ORDER | Operation existente | dados operacionais | confirmado |
| TECHNICAL_REPORT | nova Operation | objetivo, atividades, observações, fotos | confirmado |
| TECHNICAL_OPINION | nova Operation | diagnóstico, análise, conclusão, fotos | confirmado |
| PMOC | PmocPlan + MaintenanceExecution + Operation | ambientes, checklist, medições, pendências | confirmado |
| RECEIPT | nova Operation | referência, valor, recebido de, observações | confirmado; OWNER |

## 5. Order Service Results

Continua originada exclusivamente da Operation. A Central apenas seleciona a origem e abre o fluxo oficial.

## 6. Technical Visit Results

Builder passou a apresentar objetivo da visita, tempos, checklist, atividades, materiais, observações, fotos e assinaturas.

## 7. Technical Opinion Results

Diagnóstico usa `reportedIssue`, análise usa `serviceDescription` e conclusão usa `observations`, sem texto decisório fixo quando há conteúdo persistido.

## 8. PMOC Results

O wizard seleciona PmocPlan ativo, cria Operation, cria MaintenanceExecution e vincula ambos. O Builder continua lendo o contexto PMOC oficial.

## 9. Receipt Results

Referência e dados do recebimento são persistidos na Operation e exibidos no componente oficial. A restrição financeira de OWNER foi preservada.

## 10. Template Integration

Cada wizard consulta `GET /documents/configuration/types/:type`. O backend resolve template ativo, cabeçalho, rodapé e branding.

## 11. Signature Integration

`NONE`, `FIXED`, `COLLECTED` e `HYBRID` continuam resolvidos pelo DocumentContext. O wizard reutiliza o SignaturePad apenas para artifact coletado.

## 12. Document Repository Integration

Runtime confirmou os cinco `OperationDocument` após render em `GET /documents`. `/documentos` não foi movido nem duplicado.

## 13. AppSec Regression

JWT, RBAC, validação relacional, uploads, assinatura, Storage e stale detection foram preservados. RECEIPT não é exibido para não-OWNER. A dependência de ordem da fixture AppSec de Assignment foi corrigida.

## 14. Tests

- backend unit: 16 suítes, 57 testes;
- integration PostgreSQL: 2 suítes, 7 testes;
- concurrency PostgreSQL: 2 suítes, 24 testes;
- AppSec agregada: aprovada;
- AppSec focada Document Engine/Signatures: 2 suítes, 7 testes;
- teste parametrizado dos cinco Builders/PDFs adicionado.

## 15. Validation

- Prisma validate/generate: aprovado na base da certificação;
- backend lint/build/test: aprovado;
- frontend lint/build: aprovado (um warning preexistente no Operator);
- Docker API/frontend: imagens construídas;
- Chrome real: menus, cinco cards, wizard, Modelos e Settings aprovados;
- runtime API: cinco PDFs válidos, entre 25 KB e 28 KB, presentes no repositório;
- `git diff --check`: aprovado no fechamento.

## 16. Documentation Updated

Backend STATE, API_CONTRACTS, FRONTEND_INTEGRATION, OPUS_INTEGRATION e SECURITY; frontend STATE, COMPONENTS, ROUTES e ARCHITECTURE.

## 17. Remaining Blockers

Nenhum bloqueador funcional para o escopo. Documentos com origem Operation podem reabrir o wizard,
salvar alterações e exigir novo render pelo stale detection oficial.

## 18. Final Verdict

`ORBIT_PRODUCT_BACKLOG_CLOSURE_07_READY`
