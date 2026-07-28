# Operation Service Value & Equipment Profile Completion

## Escopo

Entrega do valor operacional da OS, identificação técnica consistente dos equipamentos e
refinamentos do fluxo Operator, sem alterar o Document Engine.

## Decisões

- O valor foi persistido em `Operation.serviceValue`; não representa lançamento financeiro.
- OWNER/MANAGER definem o valor. O operador atribuído recebe somente leitura pelo payload da OS.
- O valor não entra no DocumentContext, Blueprint, Preview ou PDF.
- Marca, modelo e capacidade ausentes são coletados no atendimento e persistidos no equipamento.
- A atualização é limitada aos equipamentos vinculados à Operation e nunca sobrescreve dados.
- O snapshot documental recebe os dados técnicos após a complementação.

## UX

- Seletores: `Marca - Modelo - Capacidade`, com setor no subtítulo.
- Atendimento atribuído e criação mobile suportam múltiplos equipamentos incompletos.
- Walk-in exige o perfil técnico mínimo completo.
- Lista mobile ordenada da operação mais recente para a mais antiga.
- Rótulo padronizado: `Auxiliar Técnico`.

## Migration

`20260728153000_operation_service_value`

## Testes adicionados

- Exclusão do valor operacional no Blueprint.
- Constraint PostgreSQL para valor não negativo.
- Complementação condicional e auditada do equipamento.

## Validação executada

- Prisma validate/generate: aprovado.
- Backend lint/build: aprovado.
- Backend unit: 24 suítes, 98 testes aprovados.
- PostgreSQL integration: 3 suítes, 15 testes aprovados.
- PostgreSQL concurrency: 2 suítes, 24 testes aprovados.
- Security: 13 suítes, 59 testes aprovados.
- Frontend lint: aprovado, com duas advertências preexistentes fora do escopo.
- Frontend build: aprovado.
- Docker API build/startup: aprovado.
- Migration status: 76 migrations, schema atualizado.
- Healthcheck: banco conectado e storage disponível.
- `git diff --check`: aprovado.

## Segurança

- RBAC gerencial para definição do valor.
- Ownership por Assignment/Operation para o Operator.
- Proteção contra inclusão de equipamento fora da OS.
- Atualização condicional de campos vazios e auditoria append-only.
