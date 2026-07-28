# Endereço, Orçamento e PMOC — Refinamentos

## Resultado

- Ponto de referência opcional incorporado ao endereço oficial do cliente.
- Complemento e ponto de referência exibidos no atendimento mobile, sem inclusão documental.
- Status do orçamento traduzido para pt-BR no Blueprint compartilhado por Preview e PDF.
- Datas PMOC de cobertura e recorrência preservam o dia configurado.

## Migration

- `20260728190000_customer_address_reference_point`

## Decisões

- Operation não duplica os campos de endereço; usa a relação `CustomerAddress`.
- Datas de calendário usam UTC apenas na apresentação; timestamps efetivos usam o fuso da
  instalação.
- Nenhum contrato existente foi removido ou alterado de forma incompatível.

## Validação

- Prisma format/validate/generate: aprovado.
- 81 migrations aplicadas desde banco PostgreSQL vazio: aprovado.
- Testes direcionados: 42/42.
- Suíte unitária global: 103/103.
- Backend lint/build: aprovado.
- Frontend lint/build: aprovado; permanecem dois avisos preexistentes de imports não utilizados
  em Agenda e Sidebar.
- Docker Compose reconstruído e atualizado.
- Healthcheck: banco conectado e storage disponível.
