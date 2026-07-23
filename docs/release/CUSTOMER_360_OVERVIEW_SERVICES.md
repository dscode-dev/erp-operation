# Cliente 360 — Visão Geral e Serviços

Data: 23/07/2026

## Entrega

- Visão Geral redesenhada com quatro KPIs reais.
- Identificação, endereços e contatos reorganizados.
- Cinco atendimentos recentes com acesso ao drawer oficial.
- Drawer de inclusão/edição de contato e exclusão confirmada.
- Botão Novo atendimento na aba Serviços.
- Cliente fixado pelo contexto; endereço e equipamentos permanecem selecionáveis.

## Backend

`GET /operations/stats` recebeu apenas o filtro opcional `customerId`. O escopo de acesso existente
continua aplicado em todas as contagens. CRUD de contatos e criação de Operation não foram
duplicados.

## Migrações

Nenhuma.

