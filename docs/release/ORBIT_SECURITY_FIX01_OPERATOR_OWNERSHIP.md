# ORBIT_SECURITY_FIX01 — Certificação do Ownership do Operator

Data: 2026-07-18  
Escopo: backend, autorização e isolamento operacional  
Verdict: `ORBIT_SECURITY_FIX01_READY`

## 1. Inspeção

Foram rastreados controllers, serviços e consultas que expõem Operation, MaintenanceExecution,
evidências, fotos, checklists, assinatura coletada, documentos, preview, download, Handoff,
histórico, Asset Lifecycle, materiais e exports. A inspeção encontrou três causas estruturais:

1. uso de `operation.operatorId` em consultas operacionais;
2. assertions locais baseadas em `assignment.assignedTo`, repetidas por domínio;
3. endpoints por ID e listagens sem uma única política reutilizável.

O frontend não foi alterado. Não foram criados novos fluxos, endpoints, entidades, renderers ou
contratos documentais.

## 2. Decisão arquitetural

Foi criado `OperationAccessService`, exportado pelo módulo compartilhado `OperationAccessModule` e
importado explicitamente pelos domínios protegidos. Ele fornece:

- escopos Prisma para Operation, OperationDocument, MaintenanceExecution, AssetLifecycleEvent,
  StockMovement e OperationPart;
- assertions para Operation, recurso respaldado por Operation, foto, MaintenanceExecution e evento
  de lifecycle;
- uma única rotina de negação e auditoria.

O `Assignment` atual é a autoridade exclusiva. Estados com acesso: `ASSIGNED`, `ACCEPTED`,
`STARTED`, `PAUSED`, `COMPLETED`. Estados sem acesso: `REJECTED`, `CANCELED`. Números cancelados e
histórico permanecem intactos; somente o acesso do Operator é revogado.

## 3. Endpoints auditados

| Área | Contratos protegidos | Comportamento do Operator |
|---|---|---|
| Operations | `GET /operations`, `GET /operations/stats`, `GET/PATCH /operations/:id` | lista/conta somente Assignments próprios; ID estrangeiro = 403 |
| Fotos/evidências | `GET /operations/photos/:id`, upload por `PATCH /operations/:id` | valida Assignment antes de Storage ou mutação |
| Maintenance | executions por plano, upcoming/stats, `PATCH /maintenance-executions/:id` | exige execution → Operation → Assignment |
| Documentos | repositório, preview por Operation/documento, download | documento estrangeiro ou sem Operation = 403 |
| Handoff | detalhe, draft, submit, assinatura do cliente, imagem e histórico | mesma autoridade da Operation, sem regra paralela |
| Lifecycle | listagem, detalhe, timeline/stats, anexos e criação manual | somente eventos ligados a Operations atribuídas |
| Materiais | materiais da Operation, movimentações relacionadas e stats | leitura/mutação vinculada exige Assignment |
| Exports | operações e documentos | filtro aplicado no banco antes da exportação |

Os controllers apenas propagam actor/request context. A decisão permanece nos serviços de domínio
por meio do resolvedor central.

## 4. Auditoria e AppSec

Tentativas negadas criam `OPERATOR_ACCESS_DENIED` com tenant da instalação, user ID, role, recurso,
resource ID, operation ID quando conhecido, motivo e request ID. `createdAt` registra o timestamp.
Nenhum token, segredo, path, `storageKey`, Base64 ou conteúdo binário é persistido.

As consultas de lista aplicam ownership no SQL e calculam a paginação sobre o conjunto autorizado.
Os acessos diretos falham com 403 antes da leitura/mutação do recurso. Fotos e downloads continuam
passando por endpoints autenticados; não há URL pública ou assinada exposta.

## 5. Arquivos criados

- `backend/src/modules/operation-access/operation-access.module.ts`
- `backend/src/modules/operation-access/operation-access.service.ts`
- `backend/test/security/operator-ownership.security.spec.ts`
- `docs/release/ORBIT_SECURITY_FIX01_OPERATOR_OWNERSHIP.md`

## 6. Arquivos modificados

- Operations: controller, module e service.
- Maintenance Planning: controller, module e service.
- Document Engine/Handoff: controller, module e services.
- Asset Lifecycle: controller, module e service.
- Inventory/materials: controllers, module e service.
- List exports: controller, module e service.
- Notifications: destinatário e filtro passam pelo Assignment.
- Fixtures/testes unitários, integração, segurança e concorrência afetados pelas dependências.
- Documentação backend obrigatória.

## 7. Migrations

Nenhuma. A correção utiliza os relacionamentos e índices de Assignment já existentes.

## 8. Testes adicionados

`operator-ownership.security.spec.ts` cobre:

1. isolamento da listagem e estatísticas de Operations;
2. operação/foto própria permitida e IDOR estrangeiro negado/auditado;
3. isolamento do Repositório Documental;
4. preview, download, Handoff e histórico estrangeiros negados;
5. documento sem Operation negado sem erro de UUID;
6. leitura e mutação de MaintenanceExecution estrangeira negadas;
7. revogação após Assignment `CANCELED` ou `REJECTED`.

## 9. Validações executadas

| Validação | Resultado |
|---|---|
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| Backend lint | PASS |
| Backend build | PASS |
| Unit tests | PASS — 17 suites, 80 testes |
| Security PostgreSQL | PASS — 13 suites, 55 testes |
| Integration PostgreSQL | PASS — 3 suites, 12 testes |
| Concurrency PostgreSQL | PASS — 2 suites, 24 testes |
| Frontend lint | PASS |
| Frontend build | PASS |
| PostgreSQL/Docker | saudável durante a certificação |
| `git diff --check` | PASS |

Os logs de erro observados nas suítes são respostas negativas deliberadamente exercitadas pelos
testes de segurança e falhas controladas de rollback/concorrência.

## 10. Riscos residuais

- A instalação continua single-company por decisão arquitetural; `tenant` na auditoria identifica a
  Organization local, não um tenant compartilhado.
- Novos endpoints operacionais futuros devem importar o módulo central e aplicar scope/assertion
  antes de acessar recursos por ID.
- Não houve mudança na máquina de estados de Assignment; uma futura evolução dessa máquina deverá
  revisar explicitamente a allowlist de estados do resolvedor.

## 11. Veredito

O Assignment é a fonte única de ownership do Operator, os principais caminhos diretos e indiretos
estão isolados no backend, tentativas indevidas são auditadas e a cobertura PostgreSQL confirma 403
sem vazamento ou mutação parcial.

`ORBIT_SECURITY_FIX01_READY`
