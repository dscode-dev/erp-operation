# Certificação de Segurança das Migrations — 2026-07-28

## Escopo

- `20260728180000_pmoc_execution_completion_reconciliation`
- `20260728181000_budget_item_source`
- `20260728190000_customer_address_reference_point`

## Método

1. Clone integral do PostgreSQL local com dados existentes.
2. Reconstrução, somente no clone, do schema anterior às três migrations.
3. Inclusão de casos legados:
   - Operation concluída com `MaintenanceExecution` ainda aberta;
   - material com título igual ao catálogo e preço histórico;
   - material de catálogo com snapshot integralmente zerado;
   - material manual comum.
4. Registro de contagens e hashes dos agregados não afetados.
5. Aplicação por `prisma migrate deploy`.
6. Comparação pós-migration e validação das constraints.

## Resultado do ensaio

- Tempo total observado: 2.939 ms.
- Customers: 3 antes / 3 depois; hash idêntico.
- Endereços: 3 antes / 3 depois; todos os campos legados com hash idêntico.
- Operations: 6 antes / 6 depois; hash idêntico.
- Documentos: 8 antes / 8 depois; hash idêntico.
- Budgets: 1 antes / 1 depois.
- BudgetItems: 3 antes / 3 depois.
- Constraints não validadas: 0.
- Migrations finalizadas e sem rollback: 3/3.

## Preservação monetária

| Caso legado | Resultado |
| --- | --- |
| Título igual ao catálogo, preço R$ 100 e total R$ 200 | Permaneceu `MANUAL`; valores intactos |
| Título igual ao catálogo, snapshot totalmente zerado | Classificado como `CATALOG`; valores continuaram zerados |
| Material manual, preço R$ 75 | Permaneceu `MANUAL`; valores intactos |

O backfill não zera custo, preço, margem ou total. A proteção que força zero continua existindo
somente no serviço de produção para novos itens enviados explicitamente como `CATALOG`.

## Análise por migration

### Reconciliação PMOC

- Não altera schema, IDs ou relacionamentos.
- Atualiza somente execução vinculada a Operation `COMPLETED`.
- Preenche `executedAt` por valor existente, conclusão da Operation ou horário da migration.
- Atualiza projeções do plano apenas quando ausentes ou anteriores.
- As três atualizações estão em transação explícita.

### Origem dos materiais

- Enum e coluna aditivos.
- Default `MANUAL` preserva registros anteriores.
- Backfill para `CATALOG` exige organização, tipo, descrição exata e todos os valores comerciais
  previamente zerados.
- Índice é criado pelo Prisma dentro da transação da migration.

### Ponto de referência

- Coluna nullable de 180 caracteres.
- Nenhuma linha é reescrita semanticamente.
- Endereços antigos recebem `NULL`.

## Locks e janela operacional

- `ALTER TABLE` requer lock exclusivo curto.
- A criação convencional do índice bloqueia escritas em `budget_items` durante sua construção.
- O PostgreSQL/Prisma atual executa a migration em transação e rejeita
  `CREATE INDEX CONCURRENTLY`; isso foi comprovado em ensaio de falha com rollback integral.
- Recomendação: aplicar com API parada ou em modo somente leitura.

## Runbook obrigatório para produção

1. Gerar backup consistente e validar que ele pode ser restaurado.
2. Registrar contagens de `customer_addresses`, `operations`, `operation_documents`,
   `maintenance_executions`, `budgets` e `budget_items`.
3. Interromper escritas da API.
4. Executar `npx prisma migrate status`.
5. Executar `npx prisma migrate deploy`.
6. Confirmar que não existem execuções de manutenção abertas vinculadas a Operations concluídas.
7. Confirmar que nenhum `BudgetItem` manual teve valores alterados.
8. Executar healthcheck e smoke de login, PMOC, orçamento e endereço.
9. Liberar escritas.

## Rollback

- A imagem anterior da API tolera as colunas aditivas.
- Não remover colunas nem tentar desfazer o backfill em produção.
- Em falha de integridade, manter a API parada e restaurar o backup validado.

## Veredito

`APPROVED_WITH_MAINTENANCE_WINDOW`

As migrations estão certificadas para dados existentes no clone ensaiado. A aprovação para o banco
de produção real permanece condicionada a backup restaurável e repetição do dry-run sobre snapshot
atual da produção quando o volume real for diferente do ambiente certificado.
