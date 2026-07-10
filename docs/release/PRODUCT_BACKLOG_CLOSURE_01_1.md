# Product Backlog Closure 01.1 — Product Form, Supplier Resolution and Pricing Flow Fix

Status: concluído em 10 de julho de 2026.

## Root cause

- O formulário de produto não consultava fornecedores; ele exibia apenas texto explicativo.
- A API de fornecedores já retornava `{ items, pagination }`, mas essa lista só era consumida na aba
  Fornecedores, não no drawer de produto.
- `Product` não possuía relação persistida com `Supplier`, então qualquer seletor seria falso sem
  alteração backend.
- A CTA “Novo preço” na aba Pricing dependia da lista paginada/filtrada da aba Produtos
  (`products.length`), podendo ficar desabilitada mesmo com produtos válidos.

## Supplier API response shape

`GET /api/v1/suppliers?page=1&limit=100&active=true` retorna:

```ts
type Paginated<Supplier> = {
  items: Supplier[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
```

Falha de API deve ser tratada como erro com retry, não como lista vazia.

## Category selector strategy

O frontend usa select visível com categorias oficiais:

- Peças e Componentes;
- Materiais de Consumo;
- Ferramentas;
- Equipamentos;
- Elétrica;
- Eletrônica;
- Refrigeração;
- Climatização;
- Hidráulica;
- EPIs;
- Limpeza e Higienização;
- Outros.

O backend continua persistindo `Product.category` como string.

## Custom category behavior

Quando a opção `Outros` é selecionada, o drawer exige texto customizado, faz `trim()` e envia esse
texto em `category`. O literal `Outros` não é persistido quando há categoria customizada.

Na edição:

- categoria conhecida restaura a opção correspondente;
- categoria desconhecida restaura `Outros` e preenche o campo customizado.

## SKU/internal code assisted-entry strategy

SKU e código interno continuam sendo campos únicos no backend. A UX agora usa entrada assistida com:

- prefixos técnicos;
- referências existentes para contexto;
- campo livre editável.

A unicidade permanece autoridade do backend via constraints e `PRODUCT_CONFLICT`.

## Product-Supplier persistence decision

Foi adicionada a relação `ProductSupplier` como junction:

- permite fornecedor principal na V1;
- não impede múltiplos fornecedores por produto no futuro;
- mantém `Product` sem preço, custo ou saldo;
- preserva `Supplier` como domínio de Inventory/Procurement.

Contrato:

- `POST/PATCH /products` aceita `primarySupplierId?: uuid | null`;
- `primarySupplierId: null` remove o vínculo;
- respostas de produto retornam `suppliers[]` com `supplier` incluído.

## Pricing CTA root cause and fix

A CTA dependia da página atual de produtos e podia ficar permanentemente desabilitada por filtros,
paginação ou busca. A ação agora abre o `PricingDrawer` oficial para OWNER e o drawer carrega produtos
ativos por conta própria.

## Pricing drawer fix

O drawer agora:

- trata loading/erro/empty state de produtos ativos;
- valida campos obrigatórios antes do submit;
- exibe erro de mutação;
- chama `pricingApi.createProductPricing` ou `pricingApi.revisePricing`;
- fecha e aciona refresh após sucesso.

## Files changed

Backend:

- `backend/prisma/schema.prisma`;
- `backend/prisma/migrations/20260710130000_product_supplier_relationship/migration.sql`;
- `backend/src/modules/inventory/dto/inventory.dto.ts`;
- `backend/src/modules/inventory/inventory.service.ts`;
- `backend/test/product-supplier.unit.spec.ts`;
- `backend/test/integration/helpers.ts`.

Frontend:

- `frontend/apps/platform/components/product-form-drawer.tsx`;
- `frontend/app/(platform)/produtos/page.tsx`;
- `frontend/packages/types/index.ts`.

Docs:

- `docs/backend/STATE.md`;
- `docs/backend/API_CONTRACTS.md`;
- `docs/backend/FRONTEND_INTEGRATION.md`;
- `docs/backend/OPUS_INTEGRATION.md`;
- `docs/backend/SECURITY.md`;
- `docs/frontend/STATE.md`;
- `docs/frontend/COMPONENTS.md`;
- `docs/frontend/ROUTES.md`;
- `docs/frontend/ARCHITECTURE.md`;
- `docs/release/PRODUCT_BACKLOG_CLOSURE_01_1.md`.

## Migrations

- `20260710130000_product_supplier_relationship`.

## Tests

Adicionado:

- `backend/test/product-supplier.unit.spec.ts`
  - persiste fornecedor principal ao criar produto;
  - rejeita fornecedor inativo sem criar relação.

## Validation

Executado:

- Backend `DATABASE_URL=... npx prisma validate`;
- Backend `DATABASE_URL=... npx prisma generate`;
- Backend `npm run lint`;
- Backend `npm run build`;
- Backend `npm test` — 11 suites / 30 testes;
- Frontend `npm run lint` — passou com 2 warnings preexistentes;
- Frontend `npm run build`.

Tentado e bloqueado pelo ambiente:

- `DATABASE_URL=... npx prisma migrate deploy` contra `localhost:5432/orbit` retornou erro do schema
  engine porque o Postgres local não estava utilizável;
- `docker compose ps` confirmou que o Docker daemon não estava em execução, impedindo subir o banco
  local do projeto nesta rodada.

Não executado nesta rodada:

- suítes externas de concorrência/AppSec além da suíte padrão `npm test`.

## Deferred findings

- O `SupplierDrawer` ainda está definido dentro de `/produtos/page.tsx`; foi reutilizado sem duplicar
  formulário, mas pode ser extraído futuramente para componente próprio se outras telas precisarem do
  mesmo fluxo.
- A UX de SKU/código interno é assistida e segura; uma combobox headless dedicada pode ser adotada
  futuramente para navegação avançada.
