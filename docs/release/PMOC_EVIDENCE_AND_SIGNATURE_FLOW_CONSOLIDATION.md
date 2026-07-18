# PMOC Evidence and Signature Flow Consolidation

Data: 2026-07-18

## Resultado

Os fluxos de criação, edição e revisão na Platform e de execução no Operator passaram a apresentar
evidências, responsável técnico, assinatura institucional, assinatura do cliente e identidade do
operador coletor sem introduzir armazenamento ou domínio paralelo.

## Decisões

- Fotos pertencem à Operation da execução PMOC.
- Assinatura do cliente pertence ao Handoff oficial e preserva `collectedBy`/`collectedAt`.
- Responsável técnico e operador de campo são exibidos como papéis distintos.
- O override técnico do PMOC precede a assinatura padrão ao criar o Handoff.
- Novo cadastro mantém arquivos apenas em memória até gerar a primeira OS oficial.

## Validação

- Frontend lint: aprovado.
- Frontend build Next.js: aprovado, 41 páginas.
- Backend lint e build NestJS: aprovados.
- Backend unit: 19 suites, 84 testes aprovados.
- PostgreSQL integration `document-handoff.integration.spec.ts`: 4 testes aprovados.
- Nenhuma migration criada.
