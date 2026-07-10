# Product Backlog Closure 01 — Product Registration, Pricing Entry Point, Customer Address and Reports Preview

Data: 2026-07-10

Status: `ORBIT_BACKLOG_CLOSURE_01_READY`

## Escopo

Esta closure consolidou quatro ajustes de produto antes da próxima etapa de V1:

- cadastro realista de produtos;
- remoção do CTA global de preço;
- criação de cliente com endereço inicial;
- melhoria do drawer de preview de Modelos de Documentos.

## Inspeção

Backend verificado sem alteração:

- `Product` já possui `sku` único, `internalCode` único opcional e `category` como string;
- não existe relação direta Product↔Supplier;
- `Supplier` é domínio próprio usado por Procurement/Purchase Orders;
- `CustomerAddress` já possui endpoints separados;
- `Pricing` já possui endpoints oficiais por produto e histórico.

## Decisões

- Não foi criada migration.
- Não foi alterado contrato backend.
- Não foi criado ProductSupplier artificial.
- Não foi criado catálogo de categorias.
- CEP foi implementado como adapter frontend isolado e auxiliar, não como fonte de verdade.

## Validação

- `npm run lint`: passou com 2 warnings preexistentes.
- `npm run build`: passou.
- `git diff --check`: passou antes da documentação.
