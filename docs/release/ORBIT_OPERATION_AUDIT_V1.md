# ORBIT_OPERATION_AUDIT_V1

Data da auditoria: 18/07/2026  
Escopo: backend, Platform, Operator PWA, PostgreSQL, Document Engine, Docker e documentação operacional.  
Natureza: inspeção e certificação; nenhuma funcionalidade foi criada ou corrigida.

## Veredito executivo

**NÃO CERTIFICADO PARA RELEASE CANDIDATE.**

O Orbit possui uma base madura e vários controles de produção já funcionais, mas o módulo operacional ainda apresenta bloqueadores de autorização, máquina de estados, atomicidade, ownership e preservação histórica. Um dia completo de operação real pode deixar atendimentos parciais, expor dados de outra atribuição a um OPERATOR e produzir documentos comerciais por dois agregados diferentes.

Veredito formal:

`ORBIT_OPERATION_AUDIT_V1_NOT_READY`

Esta conclusão não significa que todo o produto esteja instável. Build, lint e todas as suítes automatizadas executadas passaram. O problema é que a cobertura existente não alcança alguns caminhos incompatíveis com as regras oficiais, confirmados diretamente no código e no runtime.

## Premissas e método

- A implantação oficial é **single-company**, com banco, storage e ambiente isolados por instalação. Não existe troca de tenant em runtime e ela não deve ser introduzida como teste ou solução.
- “Isolamento entre empresas” foi avaliado como isolamento de instalação e validação dos relacionamentos com `organizationId` onde o modelo o utiliza.
- A auditoria combinou inspeção de schema, controllers, DTOs, services, fluxos frontend, infraestrutura, documentação, testes automatizados e sondas HTTP no ambiente Docker local.
- Não foram alterados endpoints, entidades, migrations ou regras de negócio.
- Não foi executado ensaio manual completo de todos os cliques com usuários humanos. Os cenários não comprovados por runtime estão explicitamente marcados.

## Controles positivos confirmados

- JWT, refresh-token com hash, RBAC global, troca obrigatória de senha, DTO whitelist e rejeição de campos desconhecidos.
- Helmet, CORS configurável, rate limiting, Request ID e logs estruturados.
- `Assignment` possui transições protegidas, transações serializáveis e compare-and-swap para concorrência.
- Números de execução PMOC possuem unicidade por plano e não são reutilizados.
- Publicação de Asset Lifecycle está centralizada no `LifecyclePublisher`; não foi encontrada criação direta fora dele.
- O fluxo documental oficial passa por Context, Builder, Blueprint, Renderer, PdfEngine e Storage.
- Preview, render e download oficiais são centralizados no Document Engine.
- Storage local possui normalização e proteção contra path traversal.
- Uploads relevantes validam extensão, MIME declarado, assinatura binária e tamanho.
- Há constraints para orçamento aprovado por Operation, preço vigente, item ativo de estoque e execução PMOC.
- Healthcheck real confirmou PostgreSQL e storage disponíveis.

## 1. Auditoria de arquitetura e ownership

| Informação | Autoridade pretendida | Situação encontrada | Classificação |
| --- | --- | --- | --- |
| Atendimento | `Operation` | Entidade principal preservada | Conforme |
| Atribuição e execução | `Assignment` | Máquina protegida, mas `Operation.status` pode contorná-la | Bloqueador |
| Planejamento | `MaintenancePlan`/`MaintenanceExecution` | Separação existe; endpoint de execução não valida ownership do OPERATOR | Bloqueador |
| PMOC | `PmocPlan` + ExecutionRequest | Arquitetura oficial existe; histórico multi-equipamento publica apenas no equipamento primário | Bloqueador |
| Estoque físico | Inventory/StockMovement | Procurement usa Inventory transacionalmente | Conforme |
| Preço | Pricing | Budget oficial usa snapshots | Conforme |
| Orçamento | `Budget` | Existe também caminho `Operation` com tipo `BUDGET` | Bloqueador |
| Recibo/garantia | domínio Receipt | Campos continuam armazenados em `Operation`; não há agregado Receipt | Bloqueador de ownership |
| Documento emitido | `OperationDocument` | Fonte pode ser Operation ou Budget, mas o banco não exige exatamente uma | Bloqueador |
| Revisão documental | `DocumentRevision` | Snapshot de metadata existe; binário histórico é apagado | Bloqueador |
| Assinatura de execução | snapshot da revisão/documento | Existe legado em `Operation.signatureData` e snapshot documental | Dívida importante |
| Assinatura institucional | Signature + política do Template | Handoff aplica regras fixas após submissão | Bloqueador |
| Histórico de ativo | AssetLifecycle | Publisher único confirmado | Conforme, com lacuna multi-equipamento |

### Duplicidades e fluxos paralelos

1. **Budget oficial versus Operation BUDGET.** O domínio Budget cria documento com `budgetId`, contexto comercial e snapshots. O Operator também pode criar uma Operation com `documentType=BUDGET`; esse caminho cria documento com `operationId` e usa seções de relatório operacional. São duas semânticas para o mesmo tipo documental.
2. **QUOTE legado.** Permanece como tipo comercial baseado em Operation ao lado de BUDGET.
3. **Recibo dentro de Operation.** Número, valor, garantia e declaração pertencem ao atendimento, impedindo ciclo de vida e histórico próprios.
4. **Assinatura legada.** `Operation.signatureData` mantém data URL enquanto o fluxo atual também mantém `customerSignatureSnapshot` no documento.
5. **Exportação de listas.** `ListExportService` monta uma representação e chama PdfEngine diretamente. É exportação administrativa, não documento oficial, mas a exceção arquitetural precisa ser formalizada para não se tornar um segundo motor documental.

## 2. Matriz documental auditada

| Tipo | Contexto atual | Preview | Render | Download | `/documentos` | Política de assinatura |
| --- | --- | --- | --- | --- | --- | --- |
| WORK_ORDER | Operation | Sim | Sim | Sim | Sim | Template inicialmente; handoff pode impor regra |
| TECHNICAL_REPORT | Operation | Sim | Sim | Sim | Sim | Template inicialmente; handoff pode impor regra |
| TECHNICAL_OPINION | Operation | Sim | Sim | Sim | Sim | Template inicialmente; handoff força técnica |
| PMOC | Operation + PMOC/Maintenance | Sim | Sim | Sim | Sim | Template inicialmente; handoff pode impor regra |
| RECEIPT | Operation | Sim | Sim | Sim | Sim | Técnica; sem agregado Receipt |
| BUDGET | Budget **e** Operation | Sim | Sim | Sim | Sim | Dois contextos incompatíveis |
| QUOTE | Operation legado | Sim | Sim | Sim | Sim | Acesso financeiro restrito |
| REPORT | Operation legado | Sim | Sim | Sim | Sim | Política genérica |
| Template Preview | Template sem operação | Sim | Não é emissão | Não | Não | Placeholders/configuração |

Nenhum renderer/PDF local foi encontrado no frontend para os documentos oficiais. `DocumentPaper` existe no código, mas não possui consumidor detectado.

## 3. Máquinas de estado

### Operation e Assignment

Fluxo protegido existente:

`ASSIGNED → ACCEPTED → STARTED → COMPLETED`

Contorno encontrado:

- `CreateOperationDto` aceita `status`, `startedAt` e `completedAt`.
- `UpdateOperationDto` permite os mesmos campos.
- OWNER, MANAGER e OPERATOR podem usar o PATCH genérico de Operation.
- `OperationsService.update()` persiste a mudança e executa efeitos de conclusão sem exigir a transição equivalente do Assignment.

Consequências: estado inalcançável pela máquina oficial torna-se gravável; endpoint pode pular aceite/início; Operation e Assignment podem divergir; auditoria de transição fica incompleta.

### Documentos

Existem três dimensões parcialmente sobrepostas:

- artefato: `DRAFT`, `READY`, `VALIDATED`, `SENT`;
- edição/renderização: `PENDING`, `READY`, `STALE`;
- workflow projetado: `DRAFT`, `REVIEW`, `APPROVED`, `STALE`.

Não há invariantes de banco que impeçam combinações incompatíveis. A projeção frontend reduz o impacto visual, mas não substitui uma máquina de estados única.

### Demais agregados

- Assignment possui bloqueios adequados contra aceitar atribuição alheia, iniciar sem aceitar e concluir sem iniciar.
- PMOC protege reserva/concorrência de ExecutionRequest e numeração monotônica.
- Budget protege edição após aprovação e múltiplos aprovados por Operation.
- Procurement protege recebimento excedente e pedido já recebido.
- Financial protege pagamento duplicado e cancelamento de lançamento pago.

## 4. Auditoria dos fluxos

### PMOC

Arquitetura esperada encontrada: `PmocPlan → ExecutionRequest → Operation → Assignment → MaintenanceExecution → Document Engine`.

Lacunas:

- PMOC suporta múltiplos equipamentos, mas Operation, MaintenancePlan e eventos de Lifecycle continuam ancorados no equipamento primário. Os equipamentos adicionais não recebem o mesmo histórico.
- Histórico e calendário usam limites fixos de 500 registros sem paginação integral.
- A política de assinatura deixa de ser exclusivamente do Template após o handoff.
- A cadeia completa não foi certificada manualmente nesta auditoria; foi validada por testes automatizados existentes e inspeção.

### Ordem de Serviço, Visita e Laudo

- Todos reutilizam Operation, Assignment, handoff e Document Engine.
- O risco principal é o PATCH genérico de Operation contornar Assignment.
- A submissão do Operator é uma sequência de chamadas independentes, sem comando transacional único ou idempotency key.
- Evidências criadas junto à Operation são gravadas depois da transação principal; falhas são absorvidas, permitindo atendimento sem todas as fotos esperadas.

### Recibo

- Preview/render/download funcionam pelo Document Engine.
- O ownership permanece incorreto: recibo e garantia são campos de Operation, sem histórico administrativo próprio.

### Orçamento

- O fluxo Platform do agregado Budget usa snapshots e Document Engine corretamente.
- O fluxo Operator baseado em Operation cria um segundo tipo de “orçamento”, sem BudgetItems, Pricing, aprovação e BudgetHistory.

## 5. Consistência transacional e concorrência

### Conforme

- Assignment usa transação serializável e CAS.
- Render documental possui proteção contra alteração concorrente e falha de storage.
- PMOC ExecutionRequest protege geração concorrente.
- Inventory, Procurement e Financial concentram alterações críticas em transações.

### Não conforme

1. O Operator executa criação, localização do Assignment, aceite, início, conclusão, handoff e submissão em requisições sequenciais. Falha intermediária deixa estado parcial.
2. Fotos de `OperationsService.create()` são persistidas fora da transação e erros são ignorados.
3. `OperationDocument` não possui constraint XOR entre `operationId` e `budgetId`.
4. Status e timestamps de Operation/Assignment não possuem checks de coerência no banco.
5. Alterações de assinatura/fotos podem tornar documento STALE, mas o binário anterior é apagado na próxima renderização, quebrando reimpressão histórica.

## 6. Histórico, auditoria e eventos

- AuditLog registra actor como texto opcional, sem FK. Imutabilidade depende da aplicação; não há proteção append-only no banco.
- AssetLifecycle está centralizado no Publisher, resultado positivo.
- Eventos entre domínios são chamadas síncronas diretas. Não existe outbox/event store para entrega durável futura.
- `DocumentRevision` não preserva o PDF da versão, assinatura exata nem chave histórica do artefato.
- PMOC preserva números cancelados e histórico de ExecutionRequest.
- Não foram encontrados publishers paralelos de lifecycle.

## 7. Auditoria de segurança

### Bloqueadores

1. **OPERATOR enxerga listagem global de Operations.** O controller não repassa actor e o service não filtra `operatorId`, em contraste com Assignment.
2. **IDOR de foto operacional.** Download por `GET /operations/photos/:photoId` aceita OPERATOR e não verifica se a foto pertence à atribuição do actor.
3. **MaintenanceExecution sem ownership do operador.** OPERATOR pode usar o PATCH sobre uma execução que não lhe pertence; o service valida relação com equipamento/Operation, não o responsável.
4. **Metrics público.** `/api/v1/metrics` está marcado como público e respondeu 200 sem autenticação.
5. **Dados internos em respostas.** Blueprint/preview e endpoints de assets retornam `contentBase64`; o resolver inclui `storageKey`. Isso viola a política documental de não expor paths, chaves ou binários em JSON.
6. **Portas públicas no Compose.** PostgreSQL, API e frontend são publicados em `0.0.0.0`; o Postgres local foi confirmado nessa condição.

### Controles confirmados

- Rate limit de login, validação de token e bloqueio de usuário inativo passaram nos testes.
- Upload com assinatura binária inválida foi rejeitado.
- Operador não consegue aceitar Assignment de outro operador.
- Tipos financeiros no Document Engine possuem restrição adicional.
- UUIDs inválidos e relacionamentos PMOC inconsistentes são rejeitados.

## 8. UX e frontend

### Problemas de V1

- `/documentos` monta opções de cliente, equipamento e operador apenas com os 20 registros da página atual. Entidades fora da página ficam impossíveis de selecionar e as opções mudam ao paginar.
- Vários seletores carregam no máximo 100 registros sem busca remota/paginação. Com 100 clientes e 500 equipamentos, fluxos de criação deixam registros inacessíveis.
- A página de relatórios concentra aproximadamente 3 mil linhas; wizard PMOC e atendimento Operator também são componentes grandes. Isso aumenta risco de regressão e inconsistência visual.
- A página de sincronização do Operator ainda informa indisponibilidade e usa uma outbox cujo `flushOutbox()` sempre retorna zero, enquanto o atendimento real exige conexão e envia diretamente.
- Há etapas extensas em wizards e dados repetidos entre resumo, conteúdo e revisão. A redução deve ocorrer somente depois dos bloqueadores de domínio.

### Pontos positivos

- Estados de loading, retry e empty state aparecem nos módulos principais.
- Componentes oficiais de documento, badges e paginação são amplamente reutilizados.
- PMOC já separa visão geral e agenda e reutiliza o wizard oficial.

## 9. Performance e escala

- `FinancialService.stats()` considera no máximo 500 lançamentos pendentes para saldo previsto/fluxo; acima disso o indicador fica matematicamente incorreto.
- Histórico e calendário PMOC usam `take: 500` sem cursor/paginação completa.
- Filtros do repositório documental são aplicados no backend, mas a descoberta de opções no frontend é page-local.
- Bundles mais pesados observados no build incluem Equipamentos (~475 kB first load), Budgets (~358 kB) e Produtos (~336 kB).
- Não foi executado teste de carga sintético com 100/500/1000 registros nesta auditoria; portanto, capacidade nessas escalas permanece não certificada.
- Métricas são mantidas em memória do processo e reiniciam com o container; não há retenção ou alertas externos.

## 10. Prontidão operacional

| Controle | Resultado |
| --- | --- |
| Health PostgreSQL/storage | Aprovado no runtime local |
| Build backend/frontend | Aprovado |
| Migrations em banco isolado | Aprovadas pela suíte de integração |
| Backup/restore | Procedimento documentado, não reexecutado nesta auditoria |
| Rollback | Estratégia documentada; não houve release para reverter |
| Observabilidade | Logs/Request ID presentes; metrics público e volátil |
| Segredos | Configuração por env; Compose ainda expõe serviços |
| Storage | Persistente local; sem certificação de object storage |
| Multiempresa | Isolamento por instalação; troca de tenant não aplicável |
| Recuperação de desastre | Não recertificada nesta execução |

Há uma inconsistência documental no runbook: uma seção cita `/health/metrics`, enquanto o endpoint real é `/metrics`.

## 11. Roadmap priorizado

### 🔴 Bloqueadores do Release Candidate

1. Remover status/timestamps dos DTOs genéricos de Operation e centralizar toda transição em comandos oficiais sincronizados com Assignment.
2. Aplicar escopo do actor em listagem/stats/fotos de Operation e em MaintenanceExecution; adicionar testes IDOR por role.
3. Criar comando backend idempotente/transacional para submissão operacional ou protocolo explícito de retomada/compensação.
4. Eliminar `Operation BUDGET`/QUOTE paralelo ou convertê-lo exclusivamente no agregado Budget oficial.
5. Criar domínio/ownership oficial de Receipt sem armazenar garantia comercial em Operation.
6. Preservar binário e snapshots completos por DocumentRevision; downloads históricos nunca podem apontar somente para a versão atual.
7. Fazer o Template ser a única autoridade de NONE/FIXED/COLLECTED/HYBRID também no handoff.
8. Remover `storageKey` e base64 de contratos públicos; assets e downloads devem ser streaming autenticado.
9. Adicionar constraints de fonte documental e coerência de estados/timestamps.
10. Publicar lifecycle de PMOC/Operation/Document para todos os equipamentos cobertos, sem duplicação indevida.
11. Restringir bind do PostgreSQL e endpoints internos; proteger `/metrics`.
12. Remover truncamentos que alteram estatísticas e históricos.

### 🟡 Melhorias importantes para a V1

1. Implementar busca remota em todos os selects e corrigir filtros de `/documentos` para não depender da página atual.
2. Retirar a tela de sincronização morta ou alinhar sua mensagem ao comportamento online real.
3. Dividir componentes monolíticos por responsabilidades sem alterar fluxo.
4. Unificar a representação pública dos estados documentais.
5. Reforçar append-only de AuditLog e referências estruturadas de actor/recurso.
6. Formalizar `ListExportService` como exportação tabular fora do catálogo documental.
7. Corrigir runbook e adicionar testes para os endpoints descobertos nesta auditoria.

### 🔵 Evoluções planejadas

1. Outbox transacional e eventos duráveis para notificações, BI, fiscal, WhatsApp e e-mail.
2. Object storage oficial e estratégia de retenção/immutability.
3. Offline sync real no Operator com idempotência.
4. Ensaios recorrentes de carga, caos, restore e disaster recovery.
5. Integrações NFS-e, PIX e conciliação somente após fechamento dos ownerships.

## 12. Validações executadas

| Validação | Resultado |
| --- | --- |
| `npx prisma validate` | PASS com `DATABASE_URL` temporária válida; `.env` local do backend não continha a variável |
| `npx prisma generate` | PASS |
| Backend lint | PASS |
| Backend build | PASS |
| Backend unit | PASS — 17 suítes, 80 testes |
| PostgreSQL integration | PASS — 3 suítes, 12 testes |
| PostgreSQL concurrency | PASS — 2 suítes, 24 testes |
| PostgreSQL security | PASS — 12 suítes, 50 testes |
| Frontend lint | PASS |
| Frontend build | PASS — 40 rotas |
| Runtime health | PASS — database connected e storage available |
| Runtime metrics sem token | **FAIL de segurança** — HTTP 200 |
| `git diff --check` | Executado ao final da documentação |

As suítes PostgreSQL foram executadas no banco isolado `orbit_operation_audit_v1_test`. A primeira tentativa em banco preexistente falhou por ownership de migrations/tabelas; nenhum banco da aplicação foi alterado para contornar o problema.

## 13. Arquivos e migrations

Arquivo criado:

- `docs/release/ORBIT_OPERATION_AUDIT_V1.md`

Arquivos de estado atualizados:

- `docs/backend/STATE.md`
- `docs/frontend/STATE.md`

Migrations criadas: **nenhuma**.

Código funcional alterado: **nenhum**.

## Conclusão

A arquitetura oficial está reconhecível e possui bons controles transacionais nos agregados mais recentes. A certificação, porém, não pode ser concedida enquanto caminhos genéricos contornarem essas mesmas regras e enquanto documentos históricos, assets e autorização operacional não forem corrigidos. A próxima etapa recomendada é uma closure estritamente limitada aos bloqueadores vermelhos, começando por autorização/estado e atomicidade antes de qualquer polish de UX.
