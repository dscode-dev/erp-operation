# ORBIT — PMOC FIX-02A — Signature Review Runtime Report

Data: 17/07/2026

## Escopo e arquitetura

A correção evolui o `PmocPlanWizard` oficial. Não foram criados novo Wizard, entidade, renderer, PDF, storage ou fluxo PMOC. A assinatura coletada permanece no handoff de `OperationDocument`; a assinatura técnica utiliza `signatureOverrideId` no PMOC e a seleção técnica do handoff corrente.

## Causa raiz

O Wizard de criação apenas descrevia a política do template. Não havia entrada para revisar PMOC existente, visualizar o snapshot coletado, identificar o coletor ou atualizar conjuntamente o override do plano e o documento corrente. Durante a validação foi encontrada e corrigida uma condição adicional: um handoff previamente consultado era limpo na abertura do Drawer sem nova mudança de dependência para reidratá-lo.

## Implementação

- ação “Revisar assinaturas” no detalhe PMOC;
- blocos condicionais conforme `NONE/FIXED/COLLECTED/HYBRID`;
- coleta/substituição com `SignaturePad` oficial;
- metadados somente leitura de cliente, data, hora, coletor e operador;
- seletor com assinaturas ativas, imagem e dados profissionais;
- override restrito ao PMOC, sem mutação global;
- `DocumentViewer` oficial atualizado após alterações;
- coletor retornado no contrato e preservado contra simples reabertura;
- revisão e auditoria append-only na substituição.

## Runtime

1. Operator: assinatura “Cliente cenário Operator”, coletor `Operator PMOC UX-02.1`, data/hora e assinatura técnica exibidos; preview atualizado.
2. Platform: documento inicialmente sem assinatura; coleta por OWNER registrada e exibida; preview atualizado.
3. Substituição: cliente e assinatura técnica alterados; revisão 3 no retorno, 5 revisões persistidas, 6 registros de auditoria; preview e documento emitido resolveram a nova assinatura técnica.

Capturas:

- `/private/tmp/orbit-pmoc-fix02a-scenario-1-operator.png`
- `/private/tmp/orbit-pmoc-fix02a-scenario-2-platform.png`
- `/private/tmp/orbit-pmoc-fix02a-scenario-3-replacement.png`

Evidências estruturadas:

- `/private/tmp/orbit-pmoc-fix02a-evidence.json`
- `/private/tmp/orbit-pmoc-fix02a-ui-evidence.json`

## Validações

- Prisma validate: PASS
- Prisma generate: PASS
- Backend lint/build: PASS
- Backend unit: 19 suites, 84 testes PASS
- PostgreSQL integration: 3 suites, 10 testes PASS
- Security: 12 suites, 49 testes PASS
- Frontend lint/build: PASS
- Runtime API: 3 cenários PASS
- Runtime Chrome: 3 cenários e Preview oficial PASS
- Migration: não aplicável (alteração sem schema)

## Veredito

`ORBIT_PMOC_FIX02A_READY`
