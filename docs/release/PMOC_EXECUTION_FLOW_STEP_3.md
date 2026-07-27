# PMOC Execution Flow — Step 3

Data: 2026-07-27

## Resultado

O Operator passou a executar PMOCs já configurados. A entrada móvel não cria `PmocPlan`: OWNER
seleciona plano ativo, equipamento coberto e executa o atendimento individual pelo mesmo wizard
usado na Platform.

## Arquitetura

```text
PmocPlan
  → equipamento coberto
  → PmocExecutionRequest
  → Operation
  → MaintenanceExecution
  → DocumentContext
  → DocumentBuilder
  → Renderer/PdfEngine
  → download autenticado
```

Não foram criados fluxo documental, renderer, Storage, entidade ou endpoint paralelo.

## Assinatura do responsável

O cadastro institucional ganhou associação explícita com um usuário OWNER por meio de
`Signature.userId`, relação já oficial do domínio. A associação é validada no backend e única por
usuário. Múltiplos técnicos são representados por múltiplos usuários OWNER, cada um com sua
assinatura.

A migration `20260727213000_link_existing_owner_signature` associa automaticamente o OWNER à
assinatura padrão preexistente somente quando há exatamente um OWNER ativo. Com múltiplos OWNER, a
seleção é explícita em Configurações > Assinaturas.

## UX mobile

- opção “Executar PMOC” exclusiva para OWNER;
- seleção de plano ativo;
- lista dos equipamentos cobertos com última execução;
- wizard em quatro etapas: Identificação, Escopo, Evidências e Confirmação;
- evidências opcionais, limite de seis;
- conclusão com compartilhamento nativo e download do PDF oficial.

## Validação

- Prisma validate: aprovado;
- Prisma generate: aprovado;
- migration PostgreSQL: aplicada;
- backend lint: aprovado;
- backend build: aprovado;
- frontend build: aprovado;
- frontend lint: aprovado com dois warnings preexistentes;
- unitários backend: 22 suites, 94 testes aprovados;
- integração PostgreSQL: 3 suites, 14 testes aprovados;
- segurança: 13 suites, 59 testes aprovados;
- concorrência: 2 suites, 24 testes aprovados;
- Docker API/PostgreSQL/Frontend: saudáveis;
- `git diff --check`: aprovado.
