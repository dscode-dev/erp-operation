# PMOC Execution Flow — Passo 2

Data: 2026-07-27

## Resultado

O detalhe do PMOC passou a executar cada equipamento coberto de forma independente.

## Decisões

- O plano agrega a cobertura; cada solicitação possui um equipamento.
- A sequência permanece monotônica por PMOC.
- O wizard de execução é dedicado e não altera fluxos genéricos.
- Fotos pertencem à Operation individual e chegam ao documento pelo DocumentContext.
- Preview, render e download continuam exclusivos do Document Engine.

## Migration

`20260727190000_pmoc_execution_per_equipment` adiciona/preenche `equipment_id`, substitui a
unicidade por data pela composição plano/equipamento/data e cria FK/índice.

## Validações

- Prisma validate: aprovado.
- Prisma generate: aprovado.
- Backend build: aprovado.
- Frontend build: aprovado.
- Unit test `pmoc-checklist-inheritance`: 3/3 aprovado.
- PostgreSQL migration deploy: aprovado no banco local (`equipment_id` obrigatório confirmado).
- Suíte unitária global: 93/94; permanece uma falha preexistente em
  `operator-executions.unit.spec.ts`, cuja expectativa usa a relação singular antiga
  `assignment` enquanto o serviço consulta `assignments.some`.
- Lint dos arquivos alterados: aprovado. O lint global do backend permanece bloqueado por quatro
  parâmetros `_actor` não usados em `maintenance-reminders.service.ts`, fora deste escopo.

## Risco residual

Execuções legadas são associadas ao equipamento primário porque o modelo anterior não armazenava
o ativo individual. Nenhum documento ou histórico é removido.
