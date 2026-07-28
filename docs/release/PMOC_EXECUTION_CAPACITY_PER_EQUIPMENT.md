# PMOC — Capacidade de Execuções por Equipamento

## Resultado

Uma cobertura mensal anual continua apresentando 12 ciclos no PMOC. Cada equipamento possui,
independentemente, execuções `001` a `012`. Quatro equipamentos representam 48 execuções
operacionais.

## Arquitetura

- `plannedExecutionCount`: quantidade oficial de ciclos;
- contador atômico em `PmocPlanEquipment`;
- `equipmentExecutionNumber`: sequência pública por equipamento;
- `executionNumber`: identidade global histórica preservada;
- lock por equipamento, limite transacional e constraint única;
- `RecurringEngine` como origem das datas e quantidades.

## Encerramento

- cobertura encerrada com pendências: `OVERDUE`, plano aberto e aviso por equipamento;
- todos os equipamentos concluídos: `COMPLETED`, plano finalizado automaticamente.

A reconciliação ocorre no scheduler e nas consultas oficiais.

## Migration

`20260728113000_pmoc_execution_capacity_per_equipment`

Migration aditiva com backfill determinístico, sem alterar os identificadores globais históricos.

## Validações

- Prisma validate/generate: aprovado;
- 75 migrations aplicadas em PostgreSQL limpo;
- backend lint/build: aprovado;
- frontend lint/build: aprovado, com avisos preexistentes;
- unitários: 23 suites, 96 testes;
- integração PostgreSQL: 3 suites, 14 testes;
- concorrência: 2 suites, 24 testes;
- segurança PMOC focada: 17 testes;
- segurança completa: 13 suites, 59 testes;
- Docker API/PostgreSQL: saudável.
