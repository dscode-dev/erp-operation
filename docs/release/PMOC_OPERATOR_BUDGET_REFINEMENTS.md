# PMOC, Operator e Budget — Refinamentos

## Resultado

- PMOC contabiliza cada execução concluída no equipamento correto.
- Última execução não confunde a próxima solicitação reservada.
- Próxima data e status operacional são fornecidos pelo backend.
- Atendimentos mobile possuem ordenação determinística e filtros.
- Materiais do catálogo não possuem preço; itens comerciais ficam em tabela separada.

## Migrations

- `20260728180000_pmoc_execution_completion_reconciliation`
- `20260728181000_budget_item_source`

## Compatibilidade

- Operations, documentos e solicitações PMOC existentes foram preservados.
- `BudgetItem.source` usa `MANUAL` como padrão e a migration reclassifica como
  `CATALOG` somente descrições com correspondência exata no catálogo da mesma
  organização.
- Preview e PDF continuam usando o mesmo DocumentBlueprint.

## Segurança

- Conclusão PMOC e vínculo da manutenção são transacionais.
- O backend força valores de itens `CATALOG` para zero.
- Nenhuma regra de preço depende do frontend.

## Validação

- Prisma validate/generate: aprovado.
- Reset e aplicação das 80 migrations em PostgreSQL isolado: aprovado.
- Testes unitários backend: 102/102.
- Segurança PMOC: 17/17.
- Integridade PostgreSQL: 7/7.
- Backend lint/build: aprovado.
- Frontend lint/build: aprovado, com dois avisos preexistentes de imports não
  utilizados fora do escopo.
- Docker Compose: imagens reconstruídas; API, PostgreSQL e frontend ativos.
- Healthcheck: banco conectado e storage disponível.
- Integridade runtime: nenhuma Operation concluída vinculada a
  MaintenanceExecution aberta.
- `git diff --check`: aprovado.
