# RVT e PMOC — Checklists Oficiais

## Decisão

O Catálogo Técnico permanece a única fonte administrativa. RVT usa snapshots estruturados da Operation. PMOC guarda referências ordenadas e cria o snapshot simples somente quando uma OS é gerada.

## RVT

- tipos V1: Semanal e Semestral;
- ambos aparecem no Blueprint;
- somente o realizado recebe marcador;
- Técnico em Campo vem de `Operation.operator`;
- recomendações e evidências são opcionais;
- Preview e PDF usam o mesmo Blueprint.

## PMOC

- o OWNER seleciona itens oficiais da OS;
- pode desativar o envio do checklist;
- geração automática e manual reutilizam `PmocExecutionRequestsService`;
- Operations antigas não mudam com alterações posteriores no catálogo.

## Persistência

Migration `20260722233000_pmoc_official_checklist`: boolean aditivo no plano e relação `PmocPlanChecklist`, sem remoção ou transformação de dados existentes.

## Validação

- Prisma format/validate/generate: aprovado;
- migration deploy em PostgreSQL 17 limpo: 62 migrations aprovadas;
- backend lint/build: aprovado;
- frontend lint/build: aprovado;
- unitários: 89 casos, incluindo os dois modos de herança PMOC;
- integração PostgreSQL: 3 suítes/14 casos;
- `git diff --check`: aprovado.
