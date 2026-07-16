# ORBIT — PMOC Foundation (Bloco 1)

## Decisão arquitetural

PMOC é especialização de `MaintenancePlan`. `PmocExecutionRequest` representa a intenção de
execução; `Operation` é a única execução de campo; `MaintenanceExecution` liga plano e Operation;
o documento PMOC permanece no Document Engine oficial.

## Fluxos

- Manual: Request → prefill → OperationCreationDrawer → OperationsService → Assignment + Work
  Order → MaintenanceExecution → documento PMOC.
- Automático: Request vencida → PmocSchedulerService → OperationsService → mesmo fluxo.
- Falha: Request `FAILED`, histórico/notificação e nenhuma Operation órfã.

## Persistência

Migration `20260716160000_pmoc_foundation_block_1`: enums, campos aditivos, tabelas de requests e
histórico, índices, FKs e backfill sem perda de dados.

## Segurança e concorrência

RBAC OWNER/MANAGER, DTO/UUID validation, claim atômico, hook transacional no workflow oficial de
Operations, relações revalidadas, histórico sem update/delete e falhas sanitizadas.

## Compatibilidade

Nenhum renderer, PDF, Preview, Storage, Assignment ou calendário novo. Payloads anteriores com
`recurrenceRule` continuam aceitos e documentos históricos permanecem válidos.

## Evidências

- Prisma schema: `validate` e `generate` aprovados.
- Backend: lint e build aprovados; 19 suítes unitárias, 81 testes aprovados.
- PostgreSQL dedicado: 2 suítes/8 testes de integração, 2 suítes/24 testes de concorrência e
  12 suítes/44 testes de segurança aprovados.
- PMOC focado: 10 testes aprovados, incluindo modo manual, automático, rollback, idempotência,
  concorrência, RBAC, notificações e histórico.
- Frontend: lint sem erros (um warning preexistente) e build de produção com 40 rotas aprovado.
- Repositório: `git diff --check` aprovado.
- Runtime Docker: migration aplicada em produção local, 42 migrations sincronizadas e healthcheck
  `ok` com PostgreSQL conectado e storage disponível; API e frontend reconstruídos.

## Resultado operacional

- PMOC cria uma solicitação persistente antes de qualquer tentativa de gerar OS.
- O modo manual abre o `OperationCreationDrawer` oficial já preenchido e só avança após a criação
  transacional da Operation, WORK_ORDER, Assignment e vínculo com MaintenanceExecution.
- O modo automático utiliza o mesmo `OperationsService`; o scheduler é um adaptador invocável e
  não depende de cron externo.
- Falha não elimina a solicitação e não deixa Operation órfã; tentativas concorrentes produzem uma
  única OS.
- O histórico é append-only e as notificações PMOC estão limitadas aos três eventos definidos.

## Veredito

`ORBIT_PMOC_FOUNDATION_BLOCK_1_READY`

---

## Consolidação — Bloco 1.1

### Decisões

- Sequência própria do PMOC, independente da OS, reservada por contador transacional.
- Cancelamento consome o número; retry e geração manual reutilizam a mesma identidade.
- Datas de execução vêm da conclusão real; datas de geração vêm do ExecutionService/Scheduler.
- Histórico original permanece compatível e recebe projeção documental aditiva.

### Persistência

- `20260716170000_pmoc_foundation_block_1_1`: campos, enum, backfill, constraints e índices.
- `20260716171000_pmoc_completion_history_integrity`: conclusão única por Execution Request.

### Compatibilidade

Document Engine, Operation, Assignment, MaintenanceExecution e Notification Center não foram
remodelados. Não houve endpoint ou funcionalidade visual nova.

### Evidências de certificação 1.1

- Prisma: `validate`, `generate` e `migrate deploy` aprovados; 44 migrations sincronizadas no
  PostgreSQL operacional local.
- Backfill operacional: 5 Execution Requests existentes, 0 número inválido, 0 sequência duplicada
  e 0 divergência entre `operationId` e `generatedOperationId`.
- Projeções: 5 PMOCs inspecionados, 0 regressão entre contador reservado e gerado e 0 erro de
  scheduler acima do limite persistente.
- Backend: lint e build aprovados; 19 suítes/81 testes unitários aprovados.
- PostgreSQL dedicado: 2 suítes/8 testes de integração, 2 suítes/24 testes de concorrência e 12
  suítes/45 testes de segurança aprovados.
- Suíte PMOC consolidada: 11/11 cenários aprovados após repetição em PostgreSQL limpo dedicado,
  incluindo cancelamento sem reutilização, reserva concorrente, retry, geração manual e metadados
  do scheduler.
- Frontend: lint sem erros (um warning preexistente) e build de produção com 40 rotas aprovado.
- Docker: imagem da API reconstruída, migrations aplicadas no startup e healthcheck `ok` com banco
  conectado e storage disponível.
- Repositório: `git diff --check` aprovado.

### Itens deferidos

- O adaptador externo que invocará o scheduler permanece fora do escopo; o serviço, seus estados e
  metadados persistentes estão prontos para essa integração.
- `operationId` permanece como alias retrocompatível de `generatedOperationId`; uma remoção exige
  versão maior de contrato. A migration impede divergência entre ambos.

### Veredito 1.1

`ORBIT_PMOC_FOUNDATION_BLOCK_1_1_READY`
