# Backend State

## Current milestone

**Sprint 0 — Foundation de Produção**  
Status: concluída em 19 de junho de 2026.

O repositório contém exclusivamente a fundação técnica do ERP Operacional White Label. Nenhum
módulo funcional ou regra de negócio foi implementado.

## Architecture

- NestJS 11 com TypeScript em modo estrito.
- API HTTP com prefixo global `/api` e versionamento URI do NestJS. A versão atual é `v1`.
- Configuração centralizada no `AppConfigModule`, usando `ConfigModule` global, cache de valores e
  validação fail-fast.
- PostgreSQL acessado exclusivamente pelo Prisma.
- `DatabaseModule` e `LoggerModule` globais para infraestrutura compartilhada.
- Módulo `health` como único módulo HTTP.
- Componentes transversais organizados em `shared`:
  - constantes;
  - decorators;
  - DTOs;
  - exceptions;
  - filters;
  - interceptors;
  - types.
- Infraestrutura organizada em `infra/logger`, `infra/security` e `infra/storage`.
- Respostas de sucesso envelopadas globalmente por interceptor.
- Exceções normalizadas por filtro global.
- Logs estruturados em JSON para startup, shutdown, requests e exceptions.

Estrutura principal:

```text
src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── config/
│   ├── database/
│   └── health/
├── shared/
│   ├── constants/
│   ├── decorators/
│   ├── dto/
│   ├── exceptions/
│   ├── filters/
│   ├── interceptors/
│   └── types/
└── infra/
    ├── logger/
    ├── security/
    └── storage/
```

## Environment

Variáveis obrigatórias validadas antes da inicialização:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_NAME`
- `APP_PORT`
- `CORS_ORIGINS`
- `STORAGE_PROVIDER`

Variáveis opcionais com defaults seguros:

- `NODE_ENV=development`
- `RATE_LIMIT_TTL_MS=60000`
- `RATE_LIMIT_MAX=100`
- `LOG_LEVEL=info`

Os segredos JWT já são obrigatórios, distintos e devem ter pelo menos 32 caracteres, mas ainda não
são consumidos. Autenticação está fora da Sprint 0.

O arquivo `.env.example` contém o contrato completo. O `.env` real não é versionado.

## Persistence

Schema: `prisma/schema.prisma`.

Migration criada:

- `20260619090000_foundation`

Tabelas de aplicação:

- `system_settings`
  - `id` UUID
  - `key` varchar único
  - `value` JSONB
  - `created_at` timestamptz
  - `updated_at` timestamptz
- `audit_logs`
  - `id` UUID
  - `action` varchar
  - `resource` varchar
  - `actor` varchar nullable
  - `metadata` JSONB nullable
  - `created_at` timestamptz
  - índices por `(resource, created_at)` e `(actor, created_at)`

`actor` permanece nullable porque usuários e autenticação ainda não existem. Nenhuma entidade além
das duas previstas pela Sprint 0 foi criada.

## HTTP endpoints

| Method | Path             | Purpose                                                 |
| ------ | ---------------- | ------------------------------------------------------- |
| GET    | `/api/v1/health` | Estado da aplicação e conectividade real com PostgreSQL |

Consulte `API_CONTRACTS.md` para payloads e códigos HTTP.

## Docker

`docker-compose.yml` oferece:

- `postgres`: PostgreSQL 17, volume persistente, rede interna e healthcheck;
- `api`: build multi-stage, usuário não-root, migrations automáticas antes do startup e healthcheck
  HTTP.

O PostgreSQL não publica porta no host. A API é o único serviço exposto.

Inicialização local:

```bash
cp .env.example .env
# Substituir todos os valores "change_me" e segredos de exemplo.
docker compose up -d --build
```

Parada sem remover dados:

```bash
docker compose down
```

## Decisions

- Cada instalação representa exatamente um cliente, com banco, storage e configuração próprios.
  Não existe tenant compartilhado nem `tenantId` no schema.
- Prisma migrations são aplicadas antes do processo da API iniciar no container.
- O processo falha no startup quando configuração obrigatória ou conexão inicial com o banco falha.
- `SystemSetting.value` e `AuditLog.metadata` usam JSONB para configuração e contexto de auditoria
  sem antecipar entidades de negócio.
- IDs usam UUID gerado pelo PostgreSQL/Prisma.
- Datas são persistidas com timezone e precisão de milissegundos.
- O healthcheck retorna HTTP 503 se a conexão com o banco estiver indisponível.
- CORS não aceita wildcard.
- Request IDs recebidos são aceitos apenas quando seguem formato seguro e têm no máximo 128
  caracteres; caso contrário, um UUID é gerado.
- A dependência transitiva `multer` foi fixada em `2.2.0` por override para eliminar vulnerabilidades
  conhecidas presentes na versão trazida pelo adapter Express. Uploads não foram implementados.

## Verification performed

- `npm run build`: aprovado.
- `npm run lint`: aprovado.
- `npm run prisma:validate`: aprovado.
- `npm audit --omit=dev`: zero vulnerabilidades.
- `docker compose config --quiet`: aprovado.
- Build multi-stage da imagem: aprovado.
- Containers `api` e `postgres`: saudáveis.
- Migration aplicada em PostgreSQL real: aprovada.
- Tabelas verificadas: `_prisma_migrations`, `audit_logs`, `system_settings`.
- Healthcheck HTTP real: `200`, `status=ok`, `database_connection=connected`.
- Contrato global de erro verificado com rota inexistente: `404`, `code=NOT_FOUND`.
- Headers de Helmet, throttling e `X-Request-Id`: verificados.

## Explicitly not implemented

- autenticação, JWT operacional e refresh tokens;
- usuários e RBAC;
- clientes;
- equipamentos;
- orçamentos;
- ordens de serviço;
- uploads e implementação de storage;
- PDFs;
- qualquer regra de negócio.

## Next sprint guidance

Antes de alterar o backend:

1. Ler este documento e `API_CONTRACTS.md`.
2. Preservar o envelope de respostas, request IDs e versionamento.
3. Criar migration apenas para entidades autorizadas pela sprint.
4. Aplicar autorização deny-by-default quando autenticação/RBAC entrar no escopo.
5. Atualizar os quatro documentos obrigatórios ao final.
