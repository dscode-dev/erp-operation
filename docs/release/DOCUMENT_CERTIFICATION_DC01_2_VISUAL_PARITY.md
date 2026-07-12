# ORBIT — DC-01.2 Visual Parity Certification

Data: 12 de julho de 2026  
Escopo: Ordem de Serviço (`WORK_ORDER`)

## Resultado

A Ordem de Serviço usa um único `DocumentBlueprint` para Preview e PDF. O QR agora é uma imagem
real gerada do payload persistido do equipamento. A política `HYBRID` entrega a assinatura técnica
exata configurada no template e a assinatura coletada na execução.

## Refinamento de layout

- cabeçalho do PDF reorganizado no mesmo padrão do Preview: logo, título/subtítulo/número à esquerda
  e organização/contato à direita;
- margens verticais entre seções ampliadas;
- primeira página da WORK_ORDER limitada preferencialmente a Identificação, Cliente e Equipamento;
- conteúdo subsequente continua fluindo pelo LayoutEngine e abre páginas adicionais quando preciso;
- checklist concluído possui marca de check gráfica no PDF;
- modo `FIXED` foi verificado em runtime com uma única assinatura institucional e nenhuma assinatura
  coletada ou placeholder adicional.

## Inspeção e decisões

| Tema | Antes | Decisão certificada |
|---|---|---|
| QR | retângulo/texto ilustrativo no Renderer e placeholder no Viewer | PNG produzido pelo `DocumentAssetResolver`, incluído no `QrCodeComponent` |
| Identidade visual | CSS e medidas PDF independentes | tokens de `visualStyle` no Blueprint, com defaults retrocompatíveis |
| Metadados | linhas no PDF e cards no Preview | cards em duas colunas nas duas superfícies |
| Tabelas/checklist | representação parcialmente divergente | larguras, estado, numeração e notas derivados do mesmo componente |
| Assinatura técnica | dependia da configuração runtime e label genérico | relação exata do template, label “Responsável técnico” e metadados profissionais |
| Assinatura coletada | regra legada podia interferir em `FIXED` | inserida por política explícita; `HYBRID` combina ambas |

## Fluxo oficial

```text
Operation + Equipment.qrCode + Template policy
↓
DocumentContextService
↓
DocumentAssetResolver (logo, QR, assinaturas)
↓
DocumentBuilder
↓
DocumentBlueprint
├─ DocumentViewer
└─ DocumentRenderer → PDF Engine
```

## Evidência runtime

- Operation: `24e0fbf7…`
- Document: `60e9c530…`
- Template: `162d3c80…`
- equipamento resolvido pelo payload `equipment:7de712a5-692a-481f-b080-189e518628c0`;
- QR PNG presente no Blueprint e decodificado novamente a partir da página rasterizada do PDF;
- material real `Fluido refrigerante técnico` presente;
- assinatura institucional exata `ce7d403a…` presente com cargo, CREA e departamento;
- assinatura coletada presente;
- PDF válido (`%PDF-`), 26.553 bytes, SHA-256
  `a678276af2e1dc0e5724ae4387702ca7d78fc93afc75b6177faaed2af03d2fc5`;
- stale download recusado com `409 DOCUMENT_STALE`; re-render produziu download atual.

## Comparação visual

Preview e PDF apresentam a mesma ordem semântica, identidade cromática, cards de metadados,
equipamento, QR, tabela de materiais, observações e duas assinaturas. O Preview dividiu o conteúdo
em 3 páginas e o PDF em 2 porque navegador e PDF usam métricas físicas distintas. Não houve perda,
reordenação ou diferença de conteúdo. A convergência pixel a pixel de paginação permanece deferida,
sem introduzir renderer paralelo.

## AppSec e performance

- nenhum `storageKey`, path, token ou binário bruto foi adicionado aos metadados públicos;
- QR não substitui JWT/RBAC;
- payload do QR é limitado e tratado como texto;
- assinatura é resolvida exatamente pela política do template;
- Context resolve os assets em lote; Builder e Renderer não consultam Prisma/Storage;
- não foi introduzido N+1.

## Testes e validações

Cobertura adicionada para geração/decodificação do QR, imagem no Blueprint/PDF e resolução exata da
assinatura institucional. O verificador runtime também cobre QR lookup, material, assinatura
institucional/coletada, stale detection e evidência visual do Viewer.

- Prisma validate/generate: aprovado;
- backend lint/build: aprovados;
- backend unit: 16 suítes, 52 testes aprovados;
- PostgreSQL integration: 2 suítes, 7 testes aprovados;
- PostgreSQL concurrency: 2 suítes, 24 testes aprovados;
- PostgreSQL AppSec: aprovado;
- frontend lint: aprovado, com 2 warnings preexistentes de imports não utilizados;
- frontend build: aprovado, 38 páginas geradas;
- inspeção runtime Preview/PDF: aprovada.

## Migration

Nenhuma migration nesta certificação.
