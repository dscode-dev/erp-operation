# PMOC Management UX Consolidation — 2026-07-18

## Objetivo

Reduzir a densidade da página PMOC e tornar agenda, acompanhamento e administração do plano mais diretos, sem alterar contratos ou criar estruturas paralelas.

## Entrega

- Tab **Visão geral**: indicadores, catálogo paginado, status e criação de PMOC.
- Tab **Agenda dos PMOCs**: calendário oficial preservado, próximas e últimas execuções, busca e filtro de status.
- Cards de plano apresentam explicitamente planos finalizados.
- Detalhe ganhou edição completa pelo Wizard oficial e ação de finalização confirmada para OWNER.
- Edição preserva o cliente, mas permite ajustar nome, endereço, equipamentos, escopos, periodicidade, período, geração, responsáveis, serviços, duração, orientações e assinatura do plano.

## Integridade

- Nenhum endpoint ou migration.
- Recorrência e status continuam calculados pelo backend.
- Finalização reutiliza `DELETE /pmoc/:id`, que desativa o plano e preserva histórico/documentos/OS.
- Calendário e listas continuam usando `GET /pmoc/stats`.

## Validação

- Frontend lint: aprovado.
- Frontend build de produção: aprovado, 41 rotas geradas.
- `git diff --check`: executado no fechamento.

## Veredito

`ORBIT_PMOC_MANAGEMENT_UX_READY`
