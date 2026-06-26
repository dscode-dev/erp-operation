# COMPONENTS — Sprint 2

## Camada de API (`lib/api/`)

Sprint 2 estendeu os domínios:

- `users.ts`: `getUser`, `createUser`, `updateUser`, `disableUser`, `enableUser`, `deleteUser`, `resetPassword`, `uploadAvatar`, `deleteAvatar` (além de `getMe`, `changePassword`, preferences, `listUsers`).
- `organization.ts`: `updateOrganizationSettings`, `createTemplate`/`updateTemplate`/`deleteTemplate`, `uploadAsset`/`deleteAsset` (além de get/update organization e settings/templates read).
- `types.ts`: `CreateUserPayload`, `UpdateUserPayload`, `CreateUserResult`, `ResetPasswordResult`, `AvatarMeta`, `BrandAsset`, payloads de organização/settings/templates.

Helpers: `lib/user-display.ts` (papéis/permissões), reaproveita `lib/format.ts`, `lib/export.ts`, `lib/equipment-display.ts`.

## Componentes compartilhados (`components/shared/`) — NOVOS

| Componente | Arquivo | Descrição |
|---|---|---|
| `ConfirmDialog` | `confirm-dialog.tsx` | Modal de confirmação (async, variante `danger`) |
| `SearchInput` | `search-input.tsx` | Input de busca controlado com limpar |
| `StatusChip` | `status-chip.tsx` | Chip semântico genérico (tons) |
| `SectionCard` | `section-card.tsx` | Card com header (ícone/título/ação) |
| `EmptyIllustration` | `empty-illustration.tsx` | Empty state ilustrado |
| `FilterBar` / `FilterChip` | `filter-bar.tsx` | Toolbar de lista composável (substitui a antiga de platform) |
| `MetricCard` | `metric-card.tsx` | Re-export do MetricCard de plataforma |
| `DrawerTabs` | `drawer-tabs.tsx` | Abas padronizadas para drawers de entidade |

## Drawers de entidade (padronizados)

`Customer`, `Equipment`, `User` e `Service` usam o mesmo padrão: `shared/Drawer` + `DrawerTabs` + `StatusChip`.

| Drawer | Arquivo |
|---|---|
| `UserFormDrawer` | `platform/user-form-drawer.tsx` (criar/editar + senha temporária) |
| `UserDetailDrawer` | `platform/user-detail-drawer.tsx` (ações OWNER + abas + avatar) |
| `ServiceDetailDrawer` | `platform/service-detail-drawer.tsx` (atendimento + documento) |
| `CustomerDetailDrawer` / `CustomerFormDrawer` | `platform/customer-*` (migrados p/ `DrawerTabs`) |
| `EquipmentDetailDrawer` | `platform/equipment-detail-drawer.tsx` (migrado p/ `DrawerTabs`) |

## DataTable (refinada)

`platform/data-table.tsx`: `rowHref`, `onRowClick`, **ordenação** (`Column.sortAccessor`) e **seleção** (`selectable`, `selectedIds`, `onSelectedChange`).

## Documentos (`components/documents/`)

`DocumentPreview`, `DocumentDownload`, `DocumentViewer` (Sprint 1) + **`SignaturePad`** (captura visual de assinatura). Geração permanece no backend.

## Plataforma — outros

`Pagination`, `ExportButton`, `QrFoundation`, `NewServiceSheet`, `sidebar` (RBAC com novas rotas), `topbar` (usuário + logout), `MetricCard`, `DataTable`.

## Padrões consolidados

- Toda lista: loading (skeleton) · empty (EmptyState/EmptyIllustration) · error (retry) · coming-soon.
- Toda entidade: drawer padronizado (`Drawer` + `DrawerTabs`).
- Ações destrutivas: `ConfirmDialog` (danger).
- RBAC: `<Gate>` + sidebar filtrada; 401/403 do backend são autoridade final.
- Dados: sempre via `@/lib/api`; nunca `fetch` direto, nunca mocks locais.
