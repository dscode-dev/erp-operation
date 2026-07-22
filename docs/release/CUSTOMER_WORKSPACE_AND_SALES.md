# Customer Workspace & Sales — 2026-07-22

## Resultado

A gestão de clientes, equipamentos, serviços e vendas foi consolidada na página dedicada do cliente. A rota independente de equipamentos permanece apenas como redirecionamento compatível; detalhes individuais dos ativos foram preservados.

## Sales Domain

- `Sale`: cliente, endereço, data, estado, garantia, totais e autoria.
- `SaleItem`: produto e snapshots de descrição, unidade, custo e preço.
- `SaleHistory`: eventos append-only de criação, alteração, conclusão, cancelamento e vínculo de Recibo.
- Estados: `DRAFT`, `COMPLETED`, `CANCELED`.
- `PricingService` é a única fonte de preço vigente; o frontend envia somente produto e quantidade.

## Recibo

O Wizard oficial ganhou a origem “Venda”. Somente vendas concluídas podem ser usadas. Cliente, endereço, valor, produtos e garantia são preenchidos pela API, continuam editáveis e resultam em uma `Operation` documental `RECEIPT` vinculada por `sourceSaleId`. Preview/PDF permanecem no Document Engine.

## Validação

- Prisma validate: PASS.
- Prisma generate: PASS.
- 58 migrations, incluindo `20260722143000_add_sales_domain`, aplicadas em PostgreSQL 17 descartável: PASS.
- Backend lint/build: PASS.
- Backend unit tests: 17 suites, 80 testes: PASS.
- Frontend lint/build Next.js 15: PASS.
- `git diff --check`: PASS.

## Observação de ambiente

O `docker compose up postgres` do workspace não inicia devido a uma entrada malformada no `.env` local, interpretada pelo Docker como variável sem nome. Nenhuma credencial foi alterada; a migration foi certificada em PostgreSQL isolado.
