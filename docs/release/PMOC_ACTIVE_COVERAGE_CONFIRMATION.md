# PMOC — Active Coverage Confirmation

## Resultado

A criação de PMOC agora identifica previamente coberturas ativas do cliente, informa o usuário e exige confirmação explícita para continuar. A regra não bloqueia a criação autorizada e é revalidada no backend.

## Decisões

- Cobertura ativa: PMOC e Maintenance Plan ativos, dentro do período vigente.
- Planos pausados continuam representando cobertura contratual ativa.
- A confirmação é um override por requisição, não uma alteração no PMOC existente.
- A API é a autoridade; a consulta preventiva existe para UX e o `409` protege contra bypass e corrida.
- A confirmação é auditada de forma append-only.

## Alterações

- Endpoint de consulta `GET /api/v1/pmoc/active-coverage`.
- Campo aditivo `confirmActiveCoverage` no contrato de criação.
- Erro `PMOC_ACTIVE_COVERAGE_CONFIRMATION_REQUIRED` (`409`).
- Confirmação no Wizard PMOC e na criação pela Central de Relatórios.
- Teste PostgreSQL cobrindo consulta, bloqueio sem confirmação, criação confirmada e auditoria.

## Persistência

Nenhuma entidade ou migration foi criada.

## Validação

- Backend build: aprovado.
- Backend lint: aprovado.
- Backend unit tests: 17 suites e 80 testes aprovados.
- Frontend lint: aprovado.
- Frontend build: aprovado.
- Teste PostgreSQL focado da cobertura ativa: aprovado.

Na execução da suíte PostgreSQL completa de PMOC, 15 cenários passaram e um cenário preexistente falhou por esperar `lastExecutionDate` após conclusão. Essa falha não pertence ao fluxo de confirmação e foi preservada para investigação específica.
