# Product Backlog Closure 04 — Avatar Crop, Identity Sync & Notification Center

## Avatar root cause

The profile page uploaded the original selected image directly. The platform shell rendered only
initials and did not consume the authenticated avatar asset. The authoritative identity source was
already `AuthProvider` + `GET /users/me`; the missing piece was shared avatar rendering and refresh
after mutation.

## Avatar architecture

- Client crop/reposition UI.
- Output: PNG 512×512.
- Official upload: `POST /users/avatar`.
- Backend validation remains authoritative.
- Public avatar response does not expose storage keys.
- `AuthProvider.refresh()` synchronizes identity after upload/delete.

## Notification architecture

- Persisted `Notification` model.
- One row per intended recipient.
- Private recipient isolation by `recipientUserId`.
- Idempotency by `(recipientUserId, eventKey)`.
- Domain services create notifications after successful authoritative transitions.
- No AuditLog polling.
- No frontend-only notification state.

## Audience matrix V1

| Event | OWNER | MANAGER | Assigned OPERATOR | VIEWER |
|---|---:|---:|---:|---:|
| Assignment assigned | No | No | Yes | No |
| Assignment overdue | Yes | Yes | Yes | No |
| Operation started | Yes | Yes | No | No |
| Operation completed | Yes | Yes | No | No |
| Budget approved | Yes | Yes | No | No |
| Budget rejected | Yes | Yes | No | No |

## Overdue strategy

There is no official scheduler in the repository. V1 uses bounded idempotent synchronization when
notification list/count is read. The scan is limited to 50 assignments and uses deterministic
event keys.

## API

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

## Refresh strategy

- Fetch unread count on shell load.
- Refresh on focus/visibility.
- Poll every 60 seconds only while visible.
- Refresh list when panel opens.

## AppSec

- No storage keys in avatar public response.
- Backend avatar validation retained.
- Cross-user notification access denied.
- Action URLs server-generated and internal.
- Duplicate logical events skipped.
