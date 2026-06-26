# COMPONENTS — Sprint 3

Pacotes compartilhados (`@erp/*`) + apps (`@platform/*`, `@operator/*`). Ver `ARCHITECTURE.md`.

## Compartilhado — `@erp/ui` (Design System)

Primitivos (Sprint 2): `status-pill`, `status-chip`, `skeletons`, `empty-state`, `empty-illustration`, `states`, `drawer`, `drawer-tabs`, `confirm-dialog`, `search-input`, `filter-bar`, `section-card`, `metric-card`. `auth/*` (provider scope-aware, gate, require-auth, login/change-password screens). `theme/*`, `base/*`.

### Novos na Sprint 3
| Componente | Arquivo | Uso |
|---|---|---|
| `Stepper` | `wizard/stepper.tsx` | progresso segmentado |
| `WizardProgressHeader` | `wizard/progress-header.tsx` | header sticky (etapa X/N) |
| `WizardFooter` | `wizard/step-footer.tsx` | controles voltar/continuar/enviar |
| `PhotoInput` | `photo-input.tsx` | captura multi-foto (preview/remover/reordenar) |
| `SignaturePad` | `documents/signature-pad.tsx` | **refinado**: desfazer/limpar/confirmar/indicador |
| `applyBranding` | `auth/auth-provider.tsx` | aplica cores da empresa ao tema (export) |

## Operator — `@operator/*` (`apps/operator`)

| Item | Arquivo |
|---|---|
| `OperatorShell` | `shell/operator-shell.tsx` (brand bar + bottom nav) |
| `OperatorBottomNav` | `components/bottom-nav.tsx` (Início/Agenda/Atend./Clientes/Perfil) |
| `OperatorHome` | `features/home/operator-home.tsx` |
| `AtendimentoWizard` | `features/atendimento/atendimento-wizard.tsx` (10 etapas + pickers) |
| Config/serviços | `lib/service-types.ts` (tipos + checklists HVAC) |
| Outbox offline | `lib/offline-queue.ts` (fila local + status + flush placeholder) |
| Submissão | `lib/atendimento.ts` (`AtendimentoDraft`, `submitAtendimento` → outbox) |

Componentes herdados: `service-card`, `schedule-card`, `quick-action`, `operator-header`.

## Platform — `@platform/*`

Inalterado em estrutura; ajustes: Financeiro (métricas + grid de alturas iguais) e Settings (cores dinâmicas via `applyBranding` + `refresh`). `equipment-display`/`user-display` continuam em `apps/platform` (reutilizados também pelo Operator via `@platform/equipment-display`).

## Sprint 4 — novos

| Item | Local | Uso |
|---|---|---|
| `useInstallPrompt` / `InstallButton` | `@erp/ui/pwa` | instalação do PWA (Chromium + fallback iOS) |
| `QrFoundation` (atualizado) | `@platform/components/qr-foundation` | QR + copiar código + baixar PNG |
| `operationsApi` (`getOrders`/`getProducts`) | `@erp/api/operations` | snapshots demo de OS e Produtos |
| `app/manifest.ts` + `public/icons/operator-icon.svg` | `app/` | manifest PWA + ícone |

Telas demo: `/documentos` (DocumentViewer + RBAC), `/demo-ready` (apresentação), Ordens/Produtos (Demo Dataset), QR do operador (`/operator/qr`).

## Sprint 5 — novos

| Item | Local | Uso |
|---|---|---|
| `BrandLogo` | `@erp/ui/brand` | logo do cliente (login/sidebar/operator) |
| `Timeline` / `TimelineEvent` | `@erp/ui/timeline` | histórico (Serviço/Cliente/Equipamento) |
| `operationsApi.getDocuments`/`getServices` | `@erp/api/operations` | snapshots `demo.documents.v1`/`demo.services.v1` |

Telas: `/reports` (central documental), `/servicos` (histórico timeline), `/operator/{equipamentos,documents,sync}`, `/demo-ready` (roteiro guiado). Docker: `frontend/Dockerfile` + serviço `frontend` no compose.

## Regras

- Dados via `@erp/api`; nunca `fetch` direto, nunca mocks. Operator escreve no outbox local até o backend de Serviços existir.
- Reutilizáveis ficam em `packages/ui`; layouts completos não são compartilhados.
- RBAC sempre do backend; sessões Platform/Operator isoladas por escopo.
