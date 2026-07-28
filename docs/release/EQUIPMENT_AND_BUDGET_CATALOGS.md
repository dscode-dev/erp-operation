# Equipment & Budget Catalogs

## Resultado

- CRUD oficial para tipos de equipamento.
- CRUD oficial para descrições de materiais de orçamento.
- Cadastro de equipamento integrado ao catálogo.
- Multi-select de materiais integrado ao Wizard de orçamento.

## Compatibilidade

O enum `EquipmentType` não foi removido. A migration cria registros equivalentes, vincula os
equipamentos existentes e mantém o enum como fallback. Tipos personalizados utilizam `OTHER` no
campo legado, mas são exibidos pelo título do catálogo.

Soft delete não remove a relação histórica. Equipamentos antigos mantêm sua classificação.

## Orçamentos

O catálogo é somente uma fonte de entrada. Ao selecionar uma descrição, o Wizard cria um
`BudgetItem` editável. O backend recebe descrição, quantidade, unidade e valor como snapshots, sem
relação persistente com o catálogo.

## Migrations

- `20260728170000_equipment_and_budget_catalogs`: adiciona os valores do enum em transação própria.
- `20260728171000_equipment_type_catalog_relation`: cria a relação, os defaults e o backfill
  idempotente.

## AppSec

- Mutação dos catálogos limitada a OWNER/MANAGER.
- UUID e tipo do catálogo validados no backend.
- Apenas registros ativos entram em novos equipamentos.
- FK restritiva e soft delete preservam referências.
- Nenhum contrato financeiro ou documental foi ampliado.

## Validação

- Prisma format/validate/generate: aprovado.
- Migration completa em PostgreSQL isolado: aprovada.
- Teste PostgreSQL de integridade, incluindo preservação após arquivamento: 7/7.
- Testes unitários direcionados: 17/17; suíte backend completa: 100/100.
- Lint backend/frontend: aprovado (somente dois avisos frontend preexistentes).
- Build backend/frontend: aprovado.
- Runtime Docker: API saudável, 78 migrations reconhecidas; 9 tipos padrão criados e 16/16
  equipamentos existentes vinculados ao catálogo.
- `git diff --check`: aprovado.
