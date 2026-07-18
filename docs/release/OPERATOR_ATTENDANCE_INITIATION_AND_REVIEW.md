# Operator Attendance Initiation & Review — 2026-07-18

## Inspeção e causa raiz

O PWA possuía um Wizard limitado semanticamente à OS e criava a Operation diretamente como concluída. Esse caminho não atravessava as transições do Assignment nem submetia o documento ao handoff. No backend, toda submissão recebia `DRAFT`, portanto não havia como diferenciar uma atividade autônoma de uma atividade delegada e devolvida à gestão.

## Decisão arquitetural

Não foi criado domínio paralelo. O fluxo permanece:

`Operation → Assignment → OperationDocument/Document Handoff → Document Engine`.

PMOC permanece:

`PmocPlan → ExecutionRequest → Operation → Assignment → MaintenanceExecution → Document Engine`.

`Operation.requestedDocumentType` é apenas a intenção documental da atividade. A origem é inferida pelo Assignment: igualdade entre atribuidor e responsável representa início autônomo; IDs diferentes representam delegação da gestão.

## Regras entregues

- OPERATOR autônomo: completa o Assignment oficial, submete e permanece `DRAFT` até aprovação.
- OWNER/MANAGER delega: atividade fica pendente no Assignment; após execução/submissão entra em `REVIEW`.
- OWNER/MANAGER inicia revisão e finaliza como `APPROVED`/`READY`.
- PMOC pode ser iniciado pelo operador somente assumindo execução pendente sem reserva ou reservada para ele.
- Documento delegado não pode ter o tipo trocado no campo.

## Arquivos e migration

- Migration: `backend/prisma/migrations/20260718110000_operator_attendance_workflow/migration.sql`.
- Backend: schema Prisma, DTO/serviço de Operations, handoff documental e serviços/controller PMOC.
- Frontend: tipos/API, OperationCreationDrawer, AtendimentoWizard, home, lista de atendimentos e FieldReportHandoff.
- Documentação: STATE, contratos, integração, segurança, componentes, rotas e arquitetura.

## AppSec e integridade

- Tipo validado pelo enum oficial.
- Origem do workflow calculada no servidor.
- PMOC reservado a outro operador retorna 403.
- Revisão/finalização continuam exclusivas de OWNER/MANAGER.
- Eventos de conclusão só são publicados na transição real para COMPLETED.

## Validação

- Prisma validate: aprovado.
- Prisma generate: aprovado.
- Backend lint/build/unit: aprovados.
- Frontend lint/build: aprovados.
- PostgreSQL integration `document-handoff.integration.spec.ts`: 3/3 aprovados, cobrindo delegação → REVIEW e início próprio → DRAFT.
- Docker runtime: API e frontend reconstruídos; migration aplicada; PostgreSQL/API saudáveis e healthcheck 200.
- `git diff --check`: aprovado antes da documentação; repetido no fechamento.

## Risco residual

O runtime visual autenticado completo depende de credenciais de usuário para automação de browser. A regra crítica foi executada contra PostgreSQL isolado e está coberta por integração real.

## Veredito

`ORBIT_OPERATOR_ATTENDANCE_WORKFLOW_READY`
