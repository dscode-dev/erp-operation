# PMOC → Ordem de Serviço — Correção do fluxo operacional

Data: 23/07/2026

## Causa raiz

A origem PMOC do drawer gerava a OS imediatamente após selecionar uma Execution Request. O usuário
não revisava os dados do plano nem a atribuição no wizard oficial. Além disso, o prefill copiava os
procedimentos apenas para o checklist simples da Operation; o atendimento PMOC e o documento usam
o checklist estruturado por equipamento.

## Solução

- A seleção do PMOC passou a carregar somente o prefill.
- O wizard oficial revisa cliente, cobertura, operador, agenda, procedimentos e textos.
- Cliente e equipamentos são protegidos porque pertencem ao plano.
- A geração final continua em `generate-work-order`, preservando Request, Operation, Assignment e
  MaintenanceExecution.
- O backend materializa cada procedimento para cada equipamento em
  `OperationMaintenanceChecklistItem`.
- O checklist simples foi mantido por compatibilidade.

## Segurança e integridade

A cobertura é reconstruída a partir do PMOC no servidor. O payload não consegue trocar cliente,
retirar equipamentos ou gerar uma segunda OS para a mesma execução. A atribuição continua validada
pela `OperationsService` e todas as relações são persistidas na transação existente.

## Migrações

Nenhuma. O schema atual já representa os snapshots necessários.

## Validação

- teste unitário focado do checklist PMOC;
- lint backend;
- lint frontend;
- build backend;
- build frontend;
- `git diff --check`.

