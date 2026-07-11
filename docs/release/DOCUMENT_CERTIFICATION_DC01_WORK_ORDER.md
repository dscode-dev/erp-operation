# Document Certification DC-01 — Work Order

Status: certificado em 11 de julho de 2026.

## Referência inspecionada

O PDF do cliente possui uma página e organiza: marca/número, período, cliente, equipamento, defeito
informado, serviços executados, liberação operacional, assinatura técnica com conselho e rodapé
institucional. A identidade e os textos do cliente não foram copiados.

## Diferenças encontradas antes da implementação

- a OS Orbit começava por finalidade genérica, sem identificação na ordem contratada;
- programação aparecia depois de cliente/equipamento;
- defeito relatado e serviço executado não possuíam campos próprios;
- materiais não eram incluídos na especialização WORK_ORDER;
- logo, endereço completo e website da organização não chegavam ao header;
- títulos de seção podiam ficar órfãos no fim de uma página;
- data da assinatura no PDF permanecia ISO;
- o rodapé não reunia identificação documental e contato institucional.

## Estrutura certificada

1. Identificação da OS: número, emissão, criação, agendamento, status, responsável e operador;
2. Cliente e endereço;
3. Equipamento e QR;
4. Defeito/solicitação informada;
5. Serviços executados;
6. Checklist;
7. Materiais, quando existentes;
8. Observações/resultado;
9. Fotos, quando existentes;
10. Assinaturas definidas pela política do template;
11. Rodapé institucional, versão e paginação.

## Arquitetura e paridade

Preview e PDF recebem a mesma instância de `DocumentBlueprint`. Logo e fotos são resolvidos por
`DocumentAssetResolver`; assinaturas são entregues pelo `DocumentContext`. O Builder não consulta
Prisma nem Storage. Renderer, PdfEngine, repositório, versionamento e download existentes foram
preservados.

| Elemento | Preview | PDF | Origem |
|---|---:|---:|---|
| Identificação | Sim | Sim | Operation/Document |
| Cliente/endereço | Sim | Sim | DocumentContext |
| Equipamento/QR | Sim | Sim | DocumentContext |
| Defeito | Sim | Sim | `reportedIssue` |
| Serviços | Sim | Sim | `serviceDescription` |
| Checklist/materiais/fotos | Sim | Sim | Operation |
| Assinaturas | Sim | Sim | Signature Policy |
| Header/footer | Sim | Sim | Organization/Blueprint |

## Runtime

Certificação HTTP local gerou uma Operation real, preview WORK_ORDER, render, download e stale
re-render. O Blueprint retornou a ordem esperada, defeito/serviços e assinatura de execução; o PDF
começou com `%PDF-`, preservou Unicode e foi inspecionado visualmente em duas páginas. A quebra de
seção foi corrigida para manter título e primeiro bloco juntos.

## Migration

`20260711210000_work_order_certification`: adiciona endereço/website opcionais da Organization e os
campos `reportedIssue`/`serviceDescription` da Operation.

## Deferimentos

- o cadastro local usado na prova não possuía BrandAsset LOGO; o fluxo foi coberto por teste com
  asset resolvido e renderiza automaticamente quando configurado;
- QR gráfico continua usando o componente QR oficial já existente; evolução visual do QR pertence à
  certificação transversal de componentes, não a um renderer exclusivo da OS.

## Validações

- Prisma validate/generate e migration deploy: aprovados;
- backend lint/build: aprovados; suíte padrão 16/16 e 50/50 testes;
- teste focado do Document Engine: 15/15;
- integração PostgreSQL: 2 suítes e 7/7 testes;
- concorrência PostgreSQL: 2 suítes e 24/24 testes;
- AppSec Document Engine/Signatures: 2 suítes e 7/7 testes;
- frontend lint aprovado com dois warnings preexistentes; build de produção aprovado;
- runtime HTTP real: preview/render/download/stale/re-render aprovados;
- inspeção visual do PDF final e da referência executada;
- `git diff --check` aprovado no fechamento.
