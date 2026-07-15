# Orbit — Product Backlog Closure 08.1

## Inspection and taxonomy

O domínio único `TechnicalCatalog` já atendia CRUD, paginação, soft delete, auditoria e adapter de
checklist. Faltavam classificação, pesquisa por tags e aplicabilidade contextual. A taxonomia mínima
usa arrays tipados no próprio registro: sete áreas e seis workflows, ambos com `GENERAL`.

## Data model and migration

Migration aditiva `20260715180000_technical_catalog_classification`:

- `tags TEXT[]`;
- `areas TechnicalCatalogArea[]`;
- `workflows TechnicalCatalogWorkflow[]`;
- índices GIN nas três coleções.

Registros customizados conservam `GENERAL`, sem perda ou sobrescrita. Defaults inequívocos recebem
classificação adicional (refrigeração, elétrica, limpeza e PMOC). Os 47 registros existentes
permaneceram disponíveis: 6 checklists, 5 objetivos, 21 condições, 7 conclusões e 8 recomendações.

## Runtime behavior

O backend combina tipo, periodicidade, status, busca, áreas e workflow. `includeGeneral=true`
adiciona fallback e prioriza correspondências específicas. Platform e Operator usam o mesmo
client/componente-base. Valores persistidos são snapshots e não dependem do catálogo atual.

Laudo Técnico usa `TECHNICAL_OPINION`; Relatório de Visita usa `TECHNICAL_REPORT`. Áreas são
inferidas dos equipamentos selecionados. PMOC está pronto para `workflow=PMOC`, sem alteração da
certificação documental.

## Security and performance

RBAC foi preservado. Enums, limites e unicidade são validados; tags são sanitizadas, normalizadas e
deduplicadas. Toda query mantém escopo organizacional/soft delete. Prisma parametriza filtros e
índices GIN atendem as coleções. Não há N+1 nem consulta de catálogo em Preview, Builder ou PDF.

## Verification

- Prisma validate/generate: aprovado;
- migration deploy PostgreSQL: aprovado, 36 migrations;
- backend lint/build/unit: aprovado, 19 suites / 80 testes;
- frontend lint: aprovado com um warning preexistente;
- frontend build: aprovado, 40 rotas;
- PostgreSQL integration: 2 suites / 8 testes;
- PostgreSQL concurrency: 2 suites / 24 testes;
- AppSec: 12 suites / 38 testes;
- runtime read-only: filtro HVAC/REFRIGERATION + TECHNICAL_OPINION retornou somente registro
  classificado; health confirmou database/storage disponíveis;
- `git diff --check`: aprovado.

Um timeout isolado do teste QR/PDF ocorreu durante build Docker concorrente; a suíte
`document-engine.spec.ts` foi repetida sem carga e aprovou seus 30 testes. Não há blocker funcional
remanescente nesta closure.
