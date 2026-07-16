# ORBIT — PMOC Foundation — Bloco 3

## Resultado

O PMOC foi elevado a módulo de gestão operacional sem alterar a arquitetura certificada:

`PmocPlan → ExecutionRequest → Operation → Assignment → MaintenanceExecution → DocumentEngine`.

## Decisões arquiteturais

- Métricas, saúde, progresso e indicadores são projeções backend; o frontend não recalcula regras.
- O calendário consulta Execution Requests por período e não cria agenda.
- Timeline consolida fontes append-only existentes; não foi criada tabela de histórico paralela.
- Requests, OS e documentos mantêm IDs oficiais para navegação contextual.
- Nenhuma migration foi necessária.

## Dashboard

Foram adicionados PMOCs ativos, pausados e vencidos; execuções do mês, concluídas, pendentes,
canceladas e com falha; calendário, próximas e últimas execuções. `GET /pmoc/stats` mantém os campos
legados e recebe `from/to` opcionais.

## Saúde e progresso

O backend calcula ocorrências esperadas pela regra oficial entre início/fim, concluídas, restantes,
percentual, atrasadas, falhas, canceladas e atraso médio. A fórmula pública está registrada em
`docs/backend/SECURITY.md`; faixas: Excelente, Boa, Atenção e Crítica.

## Timeline operacional

`GET /pmoc/:id/history` une em lote:

- `PmocHistory`;
- `AssignmentHistory`;
- documentos PMOC renderizados;
- AuditLog de assinatura coletada.

O payload inclui origem, execução, OS e documento, sem storageKey/Base64.

## UX e navegação

- Dashboard com calendário e indicadores.
- Detalhe com progresso, saúde, Cliente, endereço, equipamentos, defaults, assinatura, última OS e
  documento.
- Requests server-side paginadas com gerar, reagendar, cancelar, abrir OS/documento.
- Pausar/retomar usa PATCH PMOC existente.
- Cliente e Equipamento exibem contexto PMOC.
- Operator mantém o fluxo Assignment e apresenta o contexto da execução.

## Performance e AppSec

- Agregações em lote; nenhuma query por card/request.
- Calendário limitado a 370 dias e 500 itens.
- Requests paginadas no servidor.
- RBAC inalterado e payloads minimizados.
- Nenhuma chave de Storage, binário, token ou dado financeiro foi exposto.

## Arquivos criados

- `frontend/apps/platform/components/pmoc-operational-calendar.tsx`;
- `docs/release/PMOC_FOUNDATION_BLOCK_3.md`.

## Arquivos modificados principais

- serviços, controller e DTOs PMOC;
- tipos/client PMOC do frontend;
- páginas `/pmoc`, `/pmoc/:id`, Cliente e Equipamento;
- teste de segurança PMOC;
- documentação backend/frontend obrigatória.

## Validação

- Prisma validate/generate: aprovado.
- Backend lint/build: aprovado.
- Frontend lint/build: aprovado; um warning preexistente fora do escopo.
- Unitários: 81/81.
- Integração PostgreSQL: 8/8.
- Concorrência: 24/24.
- Segurança: 47/47.
- Runtime Docker: imagens da API e Platform reconstruídas; API, PostgreSQL e Storage saudáveis.
- Prisma Migrate Status: 45 migrations encontradas e schema de produção local sincronizado.
- Smoke HTTP: `/pmoc` e `/operator` responderam `200`; `/api/v1/health` confirmou banco conectado e
  storage disponível.
- `git diff --check`: aprovado.

## Riscos residuais

- O acionamento externo periódico do Scheduler continua responsabilidade do ambiente operacional.
- Calendário retorna no máximo 500 itens por período; volumes superiores exigem reduzir o intervalo.
- Push, offline e múltiplos operadores permanecem fora do escopo.

## Veredito

`ORBIT_PMOC_FOUNDATION_BLOCK_3_READY`
