# Product Backlog Closure 06 — Work Order Runtime Consistency

Status: concluído em 11 de julho de 2026.

## Reprodução e causa raiz

O caminho foi rastreado de forma conclusiva com uma Operation realista em testes do serviço (cliente,
equipamento, operador, checklist, assinatura PNG e `signedAt`) e com os mesmos componentes usados em
runtime. O Docker local estava parado, portanto nenhuma execução foi atribuída falsamente a PostgreSQL.

Metadados seguros observados no rastreio: tipo `WORK_ORDER`, assinatura presente, MIME `image/png`,
tamanho binário, componente `signature` presente, PDF com `/Subtype /Image` e `/XObject`. Nenhum base64
foi registrado em log, audit, lifecycle ou `renderMetadata`.

A falha principal era a divergência entre preview e download:

- preview por Operation ou por OperationDocument reconstruía o blueprint atual;
- download retornava o binário persistido sem verificar se a Operation/template havia mudado;
- uma OS renderizada antes da assinatura permanecia baixável depois da assinatura.

Uma falha adicional existia em `OperationsService.update`: o método retornava a transação antes do
upload de fotos e antes de recarregar a Operation. A assinatura era persistida, mas a mutation não
devolvia o estado autoritativo e as fotos do update não eram executadas.

## Estratégia de documento obsoleto

Foi adotada a estratégia V1 de re-render explícito:

1. preview e render calculam SHA-256 do blueprint sem timestamps de geração;
2. render persiste apenas o hash em `renderMetadata.sourceFingerprint`;
3. download reconstrói o blueprint atual e compara os hashes;
4. ausência ou divergência retorna HTTP 409 `DOCUMENT_STALE`, sem acessar o PDF antigo;
5. o usuário deve renderizar novamente e então baixar.

O hash cobre a semântica do documento, incluindo assinatura, checklist, observações, fotos, materiais,
status, datas, template e configuração. Conteúdo de assinatura/foto não é exposto no metadata.

## Experiências documentais

- **Visualizar modelo:** `templateId` → `TemplatePreviewContext`; sem Operation e sem emissão.
- **Pré-visualizar com dados reais:** `operationId + WORK_ORDER` → `DocumentContext` → blueprint atual.
- **Renderizar/baixar:** mesma Operation e mesmo tipo `WORK_ORDER`; o download só aceita o fingerprint
  da fonte atualmente renderizada.

`TECHNICAL_REPORT` de `/reports/visita` permanece separado da OS e não é usado como fallback.

## Platform e Operator

- A Platform passou a permitir coleta e persistência de assinatura de OS no drawer da Operation. A
  confirmação aguarda `PATCH /operations/:id`, recarrega a Operation e orienta re-render explícito.
- O Operator wizard já cria a Operation com assinatura e `signedAt` na mesma mutation; a OS oficial é
  `WORK_ORDER`.
- Cards, agenda e detalhe do Operator priorizam `scheduledFor`. Ausência é exibida como “Não agendado”,
  sem fallback enganoso para `assignedAt`.

## Datas

- Tabela de Operações: colunas distintas **Criado** (`createdAt`) e **Data do agendamento**
  (`scheduledFor`).
- Drawer: seção **Datas** com criação, agendamento, aceite, início, conclusão e assinatura quando
  disponíveis.
- O nome persistido/canônico do domínio continua `scheduledFor`; não houve migration.

## Testes e validação

- assinatura persistida → DocumentContext → blueprint `WORK_ORDER`;
- blueprint assinado → Renderer → PDF com imagem;
- alteração semântica muda fingerprint; timestamp de preview não muda;
- PDF anterior é bloqueado com `DOCUMENT_STALE` antes do storage;
- update aguarda assinatura/foto e retorna Operation autoritativa;
- ausência opcional de assinatura permanece controlada pelos testes existentes.

Validações finais estão registradas em `docs/backend/STATE.md` e `docs/frontend/STATE.md`.

- Prisma validate/generate: passou;
- backend lint/build: passou;
- backend tests: 16 suites, 47 testes, todos passaram;
- frontend lint: passou com 2 warnings pré-existentes;
- frontend build: passou;
- `git diff --check`: passou.

## Migration

Nenhuma migration criada.
