# Backend State

## Current milestone

**Sprint 5 — Equipment Domain Foundation**  
Status: concluída em 24 de junho de 2026.

As Sprints 0, 1, 2 e 3 foram preservadas. Nenhuma entidade, migration ou regra operacional foi
adicionada.

Sprint 4 introduz o primeiro domínio operacional de produção: Customer. Organization continua
representando a empresa dona da instalação; Customer representa o cliente atendido por ela.

Sprint 5 introduz Equipment como domínio real ligado obrigatoriamente a Customer e opcionalmente a
CustomerAddress e equipamento pai.

## Architecture

- NestJS 11, TypeScript estrito, PostgreSQL e Prisma.
- API versionada em `/api/v1`.
- JWT com refresh rotation, Argon2id, guards globais e RBAC.
- Novo `UsersModule` para equipe, perfil, preferências, permissões e avatar.
- Storage local reutilizado por abstração para avatares.
- Senha temporária com troca obrigatória aplicada por guard global.
- Respostas preservam os envelopes globais de sucesso e erro.
- Demo dataset opcional em `src/seeds/demo`.
- Módulo interno local-only para leitura/reset do dataset de integração.

Módulos:

```text
src/modules/
├── auth/
├── config/
├── customers/
├── database/
├── equipments/
├── health/
├── internal-demo/
├── organization/
└── users/
```

## Persistence

Migrations:

1. `20260619090000_foundation`
2. `20260619130000_auth_rbac`
3. `20260623140000_organization_foundation`
4. `20260624110000_user_team_foundation`
5. `20260624160000_customer_domain_foundation`
6. `20260624190000_equipment_domain_foundation`

Sprint 3.5 não criou migrations e não alterou `schema.prisma`.

### Customer Domain

Entidades:

- `Customer`, com enum `PERSON`/`COMPANY`, CPF/CNPJ opcionais e soft delete;
- `CustomerAddress`;
- `CustomerContact`;
- `CustomerAttachment`, com binário no StorageProvider.

Busca parcial cobre nome, nome fantasia, telefone, e-mail, CPF e CNPJ. Listagem usa `page`, `limit`
e `search`. Endereço e contato principal são únicos por cliente por regra transacional.

RBAC:

- OWNER: acesso total;
- MANAGER: criar, editar, visualizar e gerenciar sub-recursos;
- OPERATOR/VIEWER: leitura;
- exclusão lógica do Customer e exclusão de anexos: somente OWNER.

Upload de anexos: PDF/PNG/JPG/JPEG, 5 MiB, validação de extensão, MIME e assinatura binária.

Demo:

- Hospital Santa Clara;
- Condomínio Atlântico Sul;
- Shopping Recife;
- Colégio Boa Viagem.

Os clientes demo agora usam exclusivamente as entidades reais, com endereço, contato e anexo.
`demo.customers.v1` foi removido.

Endpoints: CRUD/status/stats de customers; CRUD de addresses/contacts; upload/read/delete de
attachments.

Validação em PostgreSQL 17 confirmou migration, CRUD, busca, paginação, stats, soft delete, RBAC,
anexos, idempotência do seed e os 13 eventos de auditoria.

### Equipment Domain

Entidades:

- `Equipment`;
- `EquipmentAttachment`;
- `EquipmentMetric`;
- enums `EquipmentType`, `EquipmentStatus`, `EquipmentAttachmentCategory`.

Equipment pertence a Customer, pode apontar para CustomerAddress do mesmo cliente e pode possuir um
parent simples do mesmo cliente. Relações cruzadas e ciclo direto são rejeitados.

`qrToken` é UUID único e `qrCode` usa `equipment:<qrToken>`. Não há geração de imagem.

Busca: name, tag, serialNumber, model e manufacturer. Filtros: customerId, addressId, status e type.
Stats retornam totais por status e por tipo.

RBAC:

- OWNER total;
- MANAGER CRUD/status, anexos e métricas;
- OPERATOR leitura e criação de métricas;
- VIEWER leitura.

Demo real:

- Split Samsung 24.000 BTU;
- Condensadora LG VRF;
- Chiller Trane 120 TR;
- Inversor Fronius 8kW;
- Evaporadora LG VRF filha da condensadora.

Cada equipamento demo possui endereço real, métrica e manual PDF. `demo.equipment.v1` foi removido.

Validação: 6 migrations do zero, 5 equipamentos demo, hierarquia, filtros combinados, QR,
integridade customer/address/parent, métricas, anexos, soft delete, RBAC e nove eventos auditados.

### Stage 0

`Organization` recebeu:

- `segment String?`

`DocumentTemplate` recebeu:

- `isSystem Boolean @default(false)`

Templates default existentes são migrados para `isSystem=true`. Templates de sistema podem ser
editados, mas não excluídos.

### User expandido

Campos adicionados:

- `avatarAssetId`
- `phone`
- `jobTitle`
- `notes`
- `mustChangePassword`
- `disabledAt`

### Novas entidades

`UserPreferences`:

- `id`
- `userId` único
- `theme`: `SYSTEM`, `LIGHT` ou `DARK`
- `notificationsEnabled`
- timestamps

`UserPermission`:

- `id`
- `userId` único
- `canFinancial`
- `canUsers`
- `canReports`
- `canSchedules`
- `canTemplates`
- timestamps

`UserAvatarAsset`:

- metadados do arquivo de avatar;
- relação opcional um-para-um com `User`;
- storage key independente dos assets organizacionais.

Não foi criado campo de idioma, locale ou infraestrutura i18n para usuários.

## Access model

- `OWNER`: lista, consulta, cria, edita, desativa, ativa, remove por soft delete e redefine senha.
- `MANAGER`: lista e consulta equipe.
- `VIEWER`: lista e consulta equipe em modo leitura.
- `OPERATOR`: somente perfil, preferências, senha e avatar próprios.
- Todos os papéis podem gerenciar suas próprias preferências, senha e avatar.

Permissões granulares complementam o papel:

- OWNER recebe todas efetivamente como `true`;
- MANAGER possui valores configuráveis pelo OWNER;
- OPERATOR e VIEWER permanecem com os cinco flags administrativos em `false`.

## Password lifecycle

- Criação e reset geram senha aleatória de 32 caracteres base64url.
- A senha temporária é retornada uma única vez na resposta.
- `mustChangePassword=true` é obrigatório em criação/reset.
- Guard global bloqueia rotas normais com `PASSWORD_CHANGE_REQUIRED`.
- Permanecem acessíveis durante bootstrap: login, `/auth/me`, `/users/me` e troca de senha.
- Troca e reset revogam todas as sessões ativas.
- Troca rejeita senha atual inválida e reutilização da senha corrente.

## Soft delete and owner safety

- `DELETE /users/:id` não remove registro.
- Soft delete define `isActive=false` e `disabledAt`.
- Disable/delete revogam sessões imediatamente.
- OWNER não pode desativar ou excluir a própria conta.
- O último OWNER ativo não pode ser desativado, removido ou rebaixado.

## Avatar security

- Extensões: `png`, `jpg`, `jpeg`.
- MIME: `image/png`, `image/jpeg`.
- Limite: 2 MiB.
- Assinatura binária PNG/JPEG é validada.
- Nome de storage usa UUID em `users/avatar/`.
- Nome original é apenas metadado sanitizado.
- Substituição remove o asset anterior.

## Endpoints added

| Method | Path                               | Access                      |
| ------ | ---------------------------------- | --------------------------- |
| GET    | `/api/v1/users`                    | OWNER, MANAGER, VIEWER      |
| GET    | `/api/v1/users/:id`                | OWNER, MANAGER, VIEWER      |
| POST   | `/api/v1/users`                    | OWNER                       |
| PATCH  | `/api/v1/users/:id`                | OWNER                       |
| DELETE | `/api/v1/users/:id`                | OWNER                       |
| PATCH  | `/api/v1/users/:id/disable`        | OWNER                       |
| PATCH  | `/api/v1/users/:id/enable`         | OWNER                       |
| PATCH  | `/api/v1/users/:id/reset-password` | OWNER                       |
| PATCH  | `/api/v1/users/change-password`    | Todos, para a própria conta |
| GET    | `/api/v1/users/me/preferences`     | Todos, para a própria conta |
| PATCH  | `/api/v1/users/me/preferences`     | Todos, para a própria conta |
| GET    | `/api/v1/users/me`                 | Todos, para a própria conta |
| POST   | `/api/v1/users/avatar`             | Todos, para a própria conta |
| GET    | `/api/v1/users/avatar/:id`         | Todos os autenticados       |
| DELETE | `/api/v1/users/avatar`             | Todos, para a própria conta |

`GET /users` aceita `page`, `limit` e `search`.

## Audit events

- `USER_CREATED`
- `USER_UPDATED`
- `USER_DISABLED`
- `USER_ENABLED`
- `USER_DELETED`
- `PASSWORD_RESET`
- `PASSWORD_CHANGED`
- `AVATAR_UPDATED`
- `PREFERENCES_UPDATED`

Senhas, hashes, tokens e conteúdo base64 não são registrados.

## Seed

O seed continua idempotente e agora:

- cria preferências e permissões completas para o OWNER;
- corrige esses registros quando o OWNER já existe;
- marca os seis templates padrão como `isSystem=true`.

## Verification performed

- Prisma schema válido e client gerado.
- Quatro migrations executadas do zero em PostgreSQL 17.
- Build Docker aprovado.
- Health check com banco conectado.
- Build TypeScript aprovado.
- ESLint aprovado.
- 2 suítes e 6 testes aprovados.
- Fluxos reais validados em container:
  - login OWNER;
  - profile agregado;
  - segment organizacional;
  - proteção de template de sistema;
  - criação de MANAGER;
  - bloqueio por troca obrigatória;
  - troca de senha e revogação da sessão anterior;
  - paginação/busca;
  - leitura MANAGER e escrita negada;
  - preferências;
  - upload/leitura/exclusão de avatar;
  - disable/enable;
  - reset de senha;
  - soft delete;
  - proteção contra auto-desativação.

## Explicitly not implemented

- convites ou recuperação por e-mail;
- MFA, SSO ou notificações reais;
- idioma/locale/i18n de usuário;
- clientes, equipamentos, produtos, serviços, agenda, orçamentos, OS, relatórios operacionais ou
  financeiro.

## Future work

- Sprint 4 pode iniciar o primeiro módulo operacional.
- Aplicar os flags granulares em módulos futuros por decorators/guards específicos do recurso.
- Considerar streaming/binário de avatar quando cache HTTP for necessário.
- Adicionar política automática para limpeza de sessões expiradas e arquivos órfãos.

## Sprint 3.5 demo environment

Variáveis:

- `ENABLE_DEMO_DATA=false` por padrão;
- `ENABLE_DEMO_ENDPOINTS=false` por padrão.

Produção rejeita startup se qualquer flag estiver habilitada.

Seed:

- `src/seeds/demo/demo.seed.ts`;
- executável por `npm run prisma:seed:demo`;
- também invocado pelo seed principal quando habilitado;
- idempotente;
- gera senhas aleatórias somente para usuários efetivamente criados;
- não sobrescreve usuários ou organizações personalizadas.

Dados reais nas entidades existentes:

- organização Climatize Refrigeração em instalação vazia/bootstrap;
- usuários `ninja`, `ricardo`, `joao`, `maria`, `financeiro`;
- preferências e permissões para contas criadas.

Snapshots temporários em `SystemSetting`:

- dashboard;
- agenda;
- financeiro;
- manifesto interno.

Esses snapshots não representam modelagem final dos módulos.

Endpoints internos:

| Method | Path                            | Access |
| ------ | ------------------------------- | ------ |
| GET    | `/api/v1/internal/demo/dataset` | OWNER  |
| POST   | `/api/v1/internal/demo/reset`   | OWNER  |

Ambos exigem ambiente development e os dois flags demo. Quando desabilitados respondem 404.

Documentação adicionada:

- `docs/backend/DEMO_DATA.md`;
- `docs/backend/OPUS_INTEGRATION.md`.

Verificações específicas:

- ambiente sem demo mantém flags false;
- execução sem demo criou zero chaves `demo.*`;
- desenvolvimento aceita demo;
- produção rejeita demo;
- snapshots são determinísticos para uma data fixa;
- nomes realistas e equipamentos esperados validados em testes.
- seed executado duas vezes sem duplicar usuários ou reemitir senhas;
- reset interno recriou apenas registros demo;
- resultado validado: 5 usuários, 5 preferências e 6 settings reservados;
- dataset interno retornou 4 clientes e 4 equipamentos;
- endpoint interno retornou 404 quando flags estavam desligadas.
