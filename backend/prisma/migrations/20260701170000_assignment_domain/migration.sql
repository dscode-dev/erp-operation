-- Assignment Domain + Operator Workflow

ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_CREATED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_REASSIGNED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_ACCEPTED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_STARTED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_COMPLETED';

CREATE TYPE "AssignmentStatus" AS ENUM (
  'ASSIGNED',
  'ACCEPTED',
  'STARTED',
  'PAUSED',
  'COMPLETED',
  'CANCELED',
  'REJECTED'
);

CREATE TYPE "AssignmentEventType" AS ENUM (
  'ASSIGNED',
  'REASSIGNED',
  'ACCEPTED',
  'STARTED',
  'PAUSED',
  'RESUMED',
  'REJECTED',
  'COMPLETED',
  'CANCELED'
);

CREATE TABLE "assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "operation_id" UUID NOT NULL,
  "assigned_by" UUID NOT NULL,
  "assigned_to" UUID NOT NULL,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMPTZ(3),
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "canceled_at" TIMESTAMPTZ(3),
  "rejected_at" TIMESTAMPTZ(3),
  "rejection_reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "event" "AssignmentEventType" NOT NULL,
  "actor_id" UUID NOT NULL,
  "previous_status" "AssignmentStatus",
  "new_status" "AssignmentStatus" NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assignments_operation_id_key" ON "assignments"("operation_id");
CREATE INDEX "assignments_assigned_to_status_assigned_at_idx" ON "assignments"("assigned_to", "status", "assigned_at");
CREATE INDEX "assignments_assigned_by_assigned_at_idx" ON "assignments"("assigned_by", "assigned_at");
CREATE INDEX "assignments_status_assigned_at_idx" ON "assignments"("status", "assigned_at");

CREATE INDEX "assignment_history_assignment_id_created_at_idx" ON "assignment_history"("assignment_id", "created_at");
CREATE INDEX "assignment_history_operation_id_created_at_idx" ON "assignment_history"("operation_id", "created_at");
CREATE INDEX "assignment_history_actor_id_created_at_idx" ON "assignment_history"("actor_id", "created_at");
CREATE INDEX "assignment_history_event_created_at_idx" ON "assignment_history"("event", "created_at");

ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_assigned_by_fkey"
  FOREIGN KEY ("assigned_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_assigned_to_fkey"
  FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignment_history"
  ADD CONSTRAINT "assignment_history_assignment_id_fkey"
  FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_history"
  ADD CONSTRAINT "assignment_history_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_history"
  ADD CONSTRAINT "assignment_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
