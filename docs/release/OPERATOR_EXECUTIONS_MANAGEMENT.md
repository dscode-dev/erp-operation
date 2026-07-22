# Operator Executions Management

## Resultado

A Platform possui uma área gerencial mensal para comparar carga, conclusão e andamento dos operadores e consultar o histórico/agenda individual. Os dados são projeções das entidades oficiais `Assignment` e `Operation`.

## Decisões

- Nenhuma entidade de comissão ou métrica persistida.
- Executor resolvido por `Assignment.assignedTo`.
- Competência no timezone da organização.
- OWNER/MANAGER somente.
- Histórico e agenda paginados, com atendimento aberto no drawer oficial.

## Indicadores

Atendimentos da competência, concluídos, pendentes, em execução, atrasados, cancelados, taxa de conclusão e duração média entre início e conclusão. Esses indicadores oferecem suporte administrativo; o Orbit não define valor, percentual ou elegibilidade de comissão.

## Migration

`20260722213000_operator_execution_metrics_indexes`: índices aditivos para executor/conclusão e agenda/status.

## Validação

- Prisma validate/generate: aprovado.
- 60 migrations aplicadas integralmente em PostgreSQL 17 limpo.
- Backend lint/build: aprovado; 19 suites e 83 testes aprovados.
- Frontend lint/build: aprovado; rotas principal e detalhe incluídas no build Next.js.
- `git diff --check`: aprovado.
