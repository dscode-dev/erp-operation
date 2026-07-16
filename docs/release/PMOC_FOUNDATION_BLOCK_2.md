# ORBIT — PMOC Foundation — Bloco 2

## Objetivo e decisão arquitetural

O PMOC passou a possuir uma experiência operacional dedicada sem criar calendário, Operation,
Assignment, MaintenanceExecution, assinatura ou documento paralelo. O fluxo oficial permanece:

`PMOC → Execution Request → OperationCreationDrawer → Operation → Assignment → Document Engine`.

A Central de Relatórios deixa de ser ponto de criação de planos e encaminha essa ação para `/pmoc`.
Documentos PMOC emitidos e históricos continuam consumindo o Document Engine.

## Persistência e migration

Migration aditiva `20260716190000_pmoc_professional_operational_defaults`:

- defaults de endereço, tipo da Operation, duração e observações em `PmocPlan`;
- snapshots de operador e técnico em `PmocExecutionRequest`;
- índices e FKs de integridade;
- backfill dos snapshots a partir dos defaults existentes;
- constraint de duração entre 15 e 10.080 minutos.

Não houve remoção ou reescrita de dados.

## Wizard profissional

1. Plano: cliente, endereço, equipamentos múltiplos, nome, cobertura, periodicidade e projeções.
2. Operação: técnico, operador, prioridade, tipo, período, duração e orientações.
3. Automação: AUTO, MANUAL ou PAUSED e primeira execução agora ou na próxima competência.
4. Assinatura: UX derivada de NONE, FIXED, COLLECTED ou HYBRID; override apenas institucional e
   restrito ao PMOC.

“Gerar agora” utiliza a Execution Request reservada e abre o `OperationCreationDrawer` oficial.

## Fluxo operacional e integridade

- Reagendamento altera `scheduledFor` da mesma request e da MaintenanceExecution relacionada.
- Cancelamento preserva request, número, auditoria e histórico.
- Defaults novos não reescrevem execuções existentes.
- Propagação opcional alcança somente `PENDING/FAILED` e gera `DEFAULTS_PROPAGATED`.
- Responsáveis são snapshots por execução; histórico não depende dos defaults atuais.
- Operation e Assignment retornam contexto PMOC aditivo para navegação e Operator PWA.

## API e RBAC

Novo endpoint: `PATCH /api/v1/pmoc/execution-requests/:id/reschedule`.

OWNER/MANAGER administram plano e requests. VIEWER mantém leitura conforme matriz existente.
OPERATOR não administra PMOC e visualiza somente o contexto disponibilizado por suas Assignments.
Endereço, cliente, equipamentos, usuários, estados e datas são revalidados no backend.

## Arquivos principais

Criados:

- `frontend/apps/platform/components/pmoc-plan-wizard.tsx`;
- `frontend/app/(platform)/pmoc/page.tsx`;
- `frontend/app/(platform)/pmoc/[id]/page.tsx`;
- migration `20260716190000_pmoc_professional_operational_defaults`.

Alterados: schema Prisma; serviços/controller/DTOs PMOC; projeções de Operations e Assignments;
client/tipos PMOC; Sidebar, Central de Relatórios e Operator; teste de segurança e documentação.

## Testes e validação

- Prisma validate/generate: aprovados.
- Unitários: 19 suites, 81 testes aprovados.
- PostgreSQL integration: 2 suites, 8 testes aprovados.
- Concurrency: 2 suites, 24 testes aprovados.
- Security: 12 suites, 46 testes aprovados.
- Cenário PMOC focado: 12 testes aprovados, incluindo reagendamento e propagação seletiva.
- Frontend lint: aprovado sem erros; um warning preexistente fora do escopo.
- Frontend build: aprovado com as rotas `/pmoc` e `/pmoc/[id]`.
- Runtime Docker: imagens API/Platform reconstruídas; 45 migrations sincronizadas; API, banco e
  storage saudáveis; `/pmoc` e `/operator` responderam HTTP 200; nenhum endereço PMOC cruzado.

## Riscos residuais e itens deferidos

- O adapter externo que agenda `PmocSchedulerService.run()` continua dependente da operação do
  ambiente; o serviço e sua telemetria já existem.
- Notificações push, offline sync, múltiplos operadores e aprovação permanecem fora do escopo.
- Projeções exibidas no wizard são orientação de UX; a persistência autoritativa é do backend.

## Veredito

`ORBIT_PMOC_FOUNDATION_BLOCK_2_READY`
