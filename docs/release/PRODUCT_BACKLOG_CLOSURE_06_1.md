# Product Backlog Closure 06.1 — Runtime-Verified Work Order Parity

Status: concluído em 11 de julho de 2026 com inspeção visual da aplicação e do PDF reais.

## Componentes ativos

`/operacoes` monta `frontend/app/(platform)/operacoes/page.tsx`, `DataTable`,
`OperationDetailDrawer`, `OperationView` e `DocumentViewer`. A lista usa
`operationApi.listOperations()` e o drawer usa `operationApi.getOperation()`.

O contrato HTTP observado em `GET /api/v1/operations` e `GET /api/v1/operations/:id` contém
`createdAt` e `scheduledFor`. O campo canônico de agendamento é `scheduledFor`.

## Evidência runtime

Ambiente: API e PostgreSQL locais via Docker, frontend Next.js local e Chrome headless real.
Operation segura: `b240e547…`; documento `023dac25…`; template `162d3c80…`; tipo `WORK_ORDER`.

- API `createdAt`: `2026-07-11T14:09:54.114Z`;
- API `scheduledFor`: `2026-07-15T13:30:00.000Z`;
- tabela `/operacoes`: `Criado` = `11/07 · 11:09`; `Data do agendamento` = `15/07 · 10:30`;
- drawer: seção `Datas`, `Criado em` e `Agendado para 15/07 · 10:30` visíveis;
- preview real: página 3/3, imagem com alt `Assinatura do cliente/responsável`, altura visível;
- PDF: duas páginas, assinatura visível na página 2 e texto português preservado;
- stale: download após mutation retornou `409 DOCUMENT_STALE`; re-render e novo download passaram.

Screenshots e artefatos foram mantidos somente em `/private/tmp`; credenciais aleatórias não foram
versionadas.

## Causas raiz

1. O Closure 06 alterou código, mas não executou inspeção visual da aplicação ativa.
2. O PDF manual usava Helvetica Type1 e conversão Latin-1, removendo/substituindo glifos.
3. O primeiro arquivo Fontsource testado era o subset `latin-ext` isolado e produziu quadrados no
   runtime; a inspeção visual detectou e corrigiu para Noto Sans `latin` regular/bold.
4. O fingerprint incluía o próprio documento renderizado na lista de relacionados e ficava stale
   imediatamente; o documento corrente deixou de ser tratado como relacionado.
5. Drawers aninhados eram limitados pelo transform do drawer pai e comprimiam o preview; `Drawer`
   passou a usar portal no `document.body`.
6. Páginas PDF não tinham fundo explícito; agora usam fundo branco determinístico.

## Paridade de componentes

| Componente | DocumentViewer | PDF | Resultado |
| --- | --- | --- | --- |
| Header/título | identidade, título, número | identidade, título, número | equivalente |
| Metadados | cards chave/valor | blocos chave/valor | equivalente |
| Seções | hierarquia e cor primária | hierarquia e cor primária | equivalente |
| Tabela | cabeçalho/linhas | cabeçalho sombreado/linhas | equivalente |
| Checklist | estado e notas | estado e notas | equivalente |
| Imagens | imagem do blueprint | mesma imagem do blueprint | equivalente |
| Assinatura | imagem, legenda e data | mesma imagem, legenda e data | equivalente |
| Footer | conteúdo e página | conteúdo e página | equivalente |

O preview possui 3 páginas pelo paginador visual e o PDF possui 2 pelo `LayoutEngine`; a composição
semântica e a ordem são as mesmas, sem exigência de paginação pixel-idêntica.

## Unicode e fonte

O adapter PDF usa PDFKit com Noto Sans regular/bold incorporadas pelo pacote `@fontsource/noto-sans`
(SIL Open Font License). A fonte faz parte do artefato Node/Docker e não é exposta por endpoint.

Texto extraído do PDF real preservou: `Revisão técnica concluída — pressão, vazão e condição do
equipamento estão estáveis.` Também foram testados acentos, `º`, `ª`, `–`, `—` e `R$`.

## Runtime fixture

`backend/test/runtime/verify-work-order-runtime.mjs` é opt-in, exige `ORBIT_RUNTIME_VERIFY=true`,
recusa banco remoto/produção, gera senha aleatória e registra somente evidência segura.
`frontend/test/runtime/verify-operations-ui.mjs` usa Chrome local e captura os estados visíveis.

Nenhuma migration foi criada.

## Validação automatizada final

- build e lint de backend: aprovados;
- testes unitários/serviço do backend: 16 suítes, 47 testes aprovados;
- testes focados do Document Engine: 12 testes aprovados;
- integração transacional PostgreSQL: 2 suítes, 7 testes aprovados;
- concorrência PostgreSQL: 2 suítes, 24 testes aprovados;
- AppSec diretamente relacionado a Document Engine e Signatures: 2 suítes, 7 testes aprovados;
- build e lint de frontend: aprovados; o lint conserva dois warnings preexistentes de imports não
  utilizados, sem erro.

A execução agregada de toda a suíte AppSec ainda expõe isolamento preexistente entre specs: uma
fixture remove o ator compartilhado e outra revoga uma sessão reaproveitada, causando falhas por FK
e `401` em specs posteriores. As duas suítes AppSec diretamente afetadas por este backlog passam
isoladamente; a correção global do harness permanece registrada como dívida de testes, sem bloquear
o comportamento runtime certificado aqui.
