CREATE TYPE "NotificationType" AS ENUM (
  'ASSIGNMENT_ASSIGNED',
  'ASSIGNMENT_REASSIGNED',
  'ASSIGNMENT_OVERDUE',
  'OPERATION_STARTED',
  'OPERATION_COMPLETED',
  'BUDGET_APPROVED',
  'BUDGET_REJECTED'
);

CREATE TYPE "NotificationSeverity" AS ENUM (
  'INFO',
  'SUCCESS',
  'WARNING',
  'DANGER'
);

CREATE TYPE "NotificationEntityType" AS ENUM (
  'ASSIGNMENT',
  'OPERATION',
  'BUDGET',
  'MAINTENANCE',
  'PMOC'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "title" VARCHAR(140) NOT NULL,
  "message" VARCHAR(300) NOT NULL,
  "entity_type" "NotificationEntityType" NOT NULL,
  "entity_id" UUID NOT NULL,
  "action_url" VARCHAR(255),
  "event_key" VARCHAR(180) NOT NULL,
  "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_recipient_user_id_event_key_key"
  ON "notifications"("recipient_user_id", "event_key");

CREATE INDEX "notifications_organization_id_created_at_idx"
  ON "notifications"("organization_id", "created_at");

CREATE INDEX "notifications_recipient_user_id_read_at_created_at_idx"
  ON "notifications"("recipient_user_id", "read_at", "created_at");

CREATE INDEX "notifications_type_created_at_idx"
  ON "notifications"("type", "created_at");

CREATE INDEX "notifications_deleted_at_idx"
  ON "notifications"("deleted_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
