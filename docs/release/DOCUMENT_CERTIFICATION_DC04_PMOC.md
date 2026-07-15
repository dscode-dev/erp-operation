# ORBIT — Document Certification DC-04 — PMOC

Data: 2026-07-15

## Referência analisada

O PDF do cliente possui uma página com identificação operacional e do equipamento, checklist
agrupado por unidade, resultados Sim/Não/N.A., quatro evidências em linha, assinatura técnica e
rodapé corporativo. A identidade do cliente não foi copiada; a semântica foi adaptada ao Orbit.

## Arquitetura certificada

O fluxo permanece único:

`PmocPlan → MaintenanceExecution → Operation → DocumentContext → DocumentBuilder →
DocumentBlueprint → LayoutEngine → DocumentRenderer → PdfEngine → Storage → /documentos`.

Não foram criados renderer, preview, PDF, agenda, execução ou assinatura paralelos.

## Estrutura documental

1. Cabeçalho institucional oficial.
2. Identificação, número, emissão, estado, responsável e endereço.
3. Dados operacionais e periodicidade.
4. Tabela oficial de múltiplos equipamentos e ambientes.
5. Referência textual à Lei nº 13.589/2018, sem inferência jurídica.
6. Checklist por equipamento com procedimento, resultado e observação.
7. Materiais, fotos opcionais em até quatro colunas e observações.
8. Assinatura institucional do template e assinatura coletada do cliente.
9. Rodapé institucional e paginação do engine.

## Persistência e segurança

Checklist possui snapshot, equipamento e resultado `YES | NO | NOT_APPLICABLE`. A coleta registra
nome, função e horário; PNG/JPEG é validado por assinatura binária e limite. A resposta expõe apenas
`signatureCaptured`. Alterações de conteúdo entram no fingerprint e invalidam render anterior.

## Platform e Operator

A Platform prepara plano, equipamentos e procedimentos. O Operator altera somente a Operation
atribuída, registra resultados, fotos e coleta do cliente. Ambos usam Preview → Render → Download
do Document Engine.

## Migration

`20260715193000_pmoc_document_certification`.

## Veredito

## Validação executada

- Prisma validate/generate: aprovado.
- Backend lint/build: aprovado.
- Unit: 19 suítes, 81 testes aprovados.
- PostgreSQL integration: 2 suítes, 8 testes aprovados.
- PostgreSQL concurrency: 2 suítes, 24 testes aprovados.
- AppSec: 12 suítes, 38 testes aprovados.
- Frontend lint: aprovado com um warning preexistente no BottomNav; build: 40 rotas aprovadas.
- `git diff --check`: aprovado.
- Migration aplicada no banco dedicado e no ambiente local; API saudável com banco/storage.

## Runtime Preview → Render → Download

Fixture local guardada: PMOC `6737f139-2816-4570-90c1-5f1b3fd2d121`, Operation
`9141befb-aa44-45bd-a759-6c4f8e8bb6eb`, documento `PMOC-000028`. O cenário confirmou dois
equipamentos, dois checklists por ativo, quatro fotos, estado `NÃO ASSINADO`, coleta pelo Operator
atribuído, `DOCUMENT_STALE` no render anterior e novo documento `ASSINADO`. PDF válido com 24.420
bytes e registro confirmado em `/documentos`. Uma assinatura institucional e uma assinatura do
cliente foram renderizadas. Evidência: `/private/tmp/orbit-dc04-evidence.json`; PDF:
`/private/tmp/orbit-dc04-pmoc.pdf`.

## Inspeção visual

As três páginas foram renderizadas em imagem e comparadas: cabeçalho/rodapé repetidos, tabelas sem
corte, checklist legível, evidência contida em card, assinaturas mantidas juntas e Unicode correto.

## Itens deferidos

- Compliance Engine genérico, assinatura eletrônica/ICP, notificações, offline sync e remodelagem
  visual do renderer permanecem fora do escopo.

## Veredito final

ORBIT_DOCUMENT_CERTIFICATION_DC04_PMOC_READY
