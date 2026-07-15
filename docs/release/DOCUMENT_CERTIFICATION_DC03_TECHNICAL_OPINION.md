# DOCUMENT CERTIFICATION DC-03 — TECHNICAL_OPINION

Data: 14/07/2026

## Refinamento DC-03.1 — 15/07/2026

- Solicitante enriquecido com razão social, CNPJ/CPF, contato principal e endereço.
- Identificação enriquecida com tipo, emissão, vistoria, situação, responsável e CREA/registro.
- Wizard passou a persistir responsabilidade técnica própria do Laudo.
- Equipamentos passaram a registrar tipo de sistema, local e situação atual por snapshot.
- Tabela oficial: Nº, Modelo/Capacidade, Tipo de Sistema, Local de Instalação e Situação Atual.
- Migration `20260715100000_technical_opinion_requester_responsibility_equipment`.
- Runtime `LDO-000024`: dois equipamentos, assinatura HYBRID, PDF `%PDF-` com 23.423 bytes e
  presença confirmada em `/documents`. A comparação visual confirmou a nova identificação,
  solicitante e tabela na primeira página do PDF.

## 1. Document Analysis

O PDF de referência possui duas páginas A4 e uma composição técnica linear: título, identificação
com número/data/responsável/CREA, solicitante, objetivo em prosa, tabela de equipamentos,
condições observadas introduzidas pela data da vistoria, análise, conclusão e responsável técnico.
A tabela de referência contém cinco equipamentos e prioriza modelo/capacidade, sistema, local e
situação. O conteúdo é descritivo, sem cards operacionais, timeline ou checklist de execução.

Foram preservadas a riqueza, sequência e hierarquia sem copiar marca, dados institucionais ou texto
específico. O Orbit usa exclusivamente Organization, BrandAsset, Customer, Equipment, Operation e
Signature reais.

## 2. Gap Analysis

Antes da DC-03, o Laudo reutilizava identidade genérica, `reportedIssue`, `serviceDescription` e
`observations`, além de checklist, materiais, fotos, QR e documentos relacionados. A tabela era de
um equipamento e o wizard chamava o objetivo de “Diagnóstico”. Também não havia garantia de CREA
na identificação.

## 3. Files Created

- `backend/prisma/migrations/20260714153000_technical_opinion_certification/migration.sql`;
- `backend/test/runtime/verify-technical-opinion-dc03-runtime.mjs`;
- este relatório de certificação.

## 4. Files Modified

- Prisma/Operations: schema, DTO e service;
- Document Engine: Context, Builder, MeasurementService e Renderer;
- testes de Document Engine;
- Central de Relatórios, API/types e DocumentViewer;
- documentação backend e frontend obrigatória.

## 5. Migrations

`20260714153000_technical_opinion_certification` adiciona quatro colunas TEXT opcionais em
`operations`: objetivo, condições, análise e conclusão do Laudo. A alteração é aditiva e preserva
documentos históricos.

## 6. Builder Changes

`TECHNICAL_OPINION` deixou de passar por `sharedIdentitySections` e ganhou composição exclusiva:

1. Identificação do Laudo;
2. Solicitante;
3. Objetivo;
4. Descrição dos Equipamentos;
5. Condições observadas no local;
6. Análise Técnica;
7. Conclusão;
8. Assinatura, conforme template.

O Builder recebe todos os dados do `DocumentContext`. Não consulta Prisma, Storage ou assinatura.
O CREA é lido da assinatura institucional já resolvida. Prosa técnica preserva parágrafos; somente
as condições informadas por linha são convertidas em lista.

## 7. Wizard Changes

O wizard de `/reports` removeu a seleção de equipamento único da Origem do Laudo. O Conteúdo usa o
seletor múltiplo oficial e coleta objetivo, condições, análise e conclusão. A terceira etapa é
Assinatura; checklist e fotos não participam desse documento.

## 8. Preview Results

O Preview runtime de `LDO-000022` retornou exatamente as oito seções certificadas, dois
equipamentos e duas assinaturas em modo HYBRID. Não retornou material, foto, QR, Assignment,
timeline ou documento relacionado.

## 9. PDF Results

O PDF oficial possui duas páginas, header `%PDF-`, 20.296 bytes, cabeçalho institucional, conteúdo
técnico paginado e assinaturas. A tabela passou por medição de células e quebra de tokens longos no
Renderer oficial, sem lógica específica no PdfEngine.

## 10. Preview/PDF Parity

Preview e PDF utilizam a mesma instância de `DocumentBlueprint`. O Viewer recebeu o mesmo contrato
de larguras e quebra de palavras; diferenças permanecem restritas à paginação física. A inspeção
visual das duas páginas confirmou ordem, conteúdo, hierarquia, Unicode e assinaturas.

## 11. Signature Results

Responsável Técnico e CREA vêm da assinatura institucional configurada. FIXED não cria campo
coletado; COLLECTED reserva/usa somente execução; HYBRID combina ambos; NONE omite a seção. A data
institucional usa origem persistida e estável, preservando stale detection.

## 12. Tests

- Builder especializado e diferença semântica para `TECHNICAL_REPORT`;
- ordem e ausência de seções proibidas;
- tabela multi-equipamento;
- assinatura institucional + coletada;
- Preview/Renderer/PDF sobre o mesmo Blueprint;
- PDF válido, Unicode, paginação e catálogo runtime.

Resultados: unitários `18 suites / 70 testes`; Document Engine focalizado `30 testes`;
integração PostgreSQL `2 suites / 8 testes`; concorrência `2 suites / 24 testes`; segurança
`12 suites / 38 testes`. Todas as suítes passaram.

## 13. Runtime Validation

Ambiente Docker local com PostgreSQL 17. O verificador criou uma Operation real, emitiu
`LDO-000022`, executou Preview → Render → Download, validou assinatura HYBRID e confirmou o item em
`GET /documents`. Evidências locais: `/private/tmp/orbit-dc03-preview.json`,
`/private/tmp/orbit-dc03-technical-opinion.pdf` e `/private/tmp/orbit-dc03-evidence.json`.

Também passaram `prisma validate`, `prisma generate`, migration status, lint e build do backend,
lint e build do frontend e `git diff --check`. O lint frontend manteve uma única advertência
preexistente de import não utilizado em `apps/operator/components/bottom-nav.tsx`, sem erro.

## 14. Documentation

Atualizados backend STATE, API_CONTRACTS, FRONTEND_INTEGRATION, OPUS_INTEGRATION e SECURITY; e
frontend STATE, COMPONENTS, ROUTES e ARCHITECTURE.

## 15. Remaining Blockers

Nenhum bloqueio funcional conhecido. A certificação não remodela outros tipos documentais.

## 16. Final Verdict

`ORBIT_DOCUMENT_CERTIFICATION_DC03_READY`
