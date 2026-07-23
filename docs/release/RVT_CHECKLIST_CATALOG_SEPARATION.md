# RVT Checklist Catalog Separation

Data: 2026-07-23

## Resultado

O checklist Semanal/Semestral do RVT foi separado do checklist operacional de OS/PMOC sem criar
novo domínio. A classificação usa o workflow oficial do `TechnicalCatalog`.

## Migration

- `20260723123000_rvt_checklist_catalog_defaults`
- 11 itens `WEEKLY`.
- 7 itens `SEMIANNUAL`.
- Workflow exclusivo `TECHNICAL_REPORT`.
- Migration aditiva e idempotente para organizações existentes.
- Bootstrap idempotente cobre instalações limpas cuja Organization é criada após as migrations.

## Integrações

- Catálogos Técnicos: nova aba `Checklist do RVT`.
- Central de Relatórios: RVT consulta somente itens `TECHNICAL_REPORT`.
- Operator autônomo e atribuído: mesma consulta exclusiva.
- OS/PMOC: consulta por `WORK_ORDER`/`PMOC`, sem itens do RVT.

## Validação

- Prisma validate: aprovado.
- Backend lint/build: aprovado.
- Frontend lint/build: aprovado.
- Testes unitários do catálogo: 12 aprovados.
- PostgreSQL 17: 63 migrations aplicadas.
- Bootstrap limpo: 11 Semanais, 7 Semestrais.
- Reexecução do bootstrap: total permaneceu 18.
- Vazamento para workflows OS/PMOC: zero.
