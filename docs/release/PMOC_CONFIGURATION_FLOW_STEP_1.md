# PMOC — Configuration Flow Step 1

## Resultado

O cadastro de PMOC na Platform foi separado da execução operacional.

## Decisão arquitetural

`POST /api/v1/pmoc` recebeu o campo aditivo `configurationOnly`. Nenhum domínio, Wizard, Scheduler,
renderer ou fluxo documental foi duplicado.

Com o campo ativo, a transação cria somente MaintenancePlan, PmocPlan, equipamentos, escopos,
checklist e responsável técnico. Não cria MaintenanceExecution, ExecutionRequest, Operation,
Assignment, Handoff, Preview ou PDF.

## Wizard

1. Identificação e cobertura.
2. Planejamento.
3. Execuções.
4. Confirmação.

O checklist inicia selecionado. Evidências ficam para a execução. A assinatura é resolvida pelo
OWNER técnico selecionado.

## AppSec

- OWNER técnico ativo obrigatório;
- assinatura ativa vinculada ao mesmo usuário;
- endereço e equipamentos validados no cliente;
- escopos validados na instalação;
- nenhuma auditoria falsa de execução.

## Migrations

Nenhuma.

## Validação

- Prisma validate: aprovado.
- Backend build: aprovado.
- Frontend build: aprovado.
- ESLint direcionado: aprovado.
- Frontend lint global: aprovado com dois warnings preexistentes.
- Unitários: 93/94; uma asserção preexistente espera a antiga relação singular de Assignment.
- Backend lint global: bloqueado por quatro parâmetros preexistentes não usados em
  `maintenance-reminders.service.ts`.
- Segurança PostgreSQL: cenário adicionado; execução bloqueada porque as credenciais de teste
  documentadas não autenticam no PostgreSQL local atual.

## Veredito

Passo 1 concluído em código. A evidência PostgreSQL dedicada depende da correção das credenciais do
ambiente de teste.
