-- Uma operação pode ter múltiplos técnicos: 1 executor primário
-- (= Operation.operator_id) + N auxiliares (recebem/visualizam a demanda).
ALTER TABLE "assignments"
  ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT true;

-- Deixa de ser 1:1 com a operação.
DROP INDEX IF EXISTS "assignments_operation_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "assignments_operation_assignee_uq"
  ON "assignments"("operation_id", "assigned_to");
CREATE INDEX IF NOT EXISTS "assignments_operation_primary_idx"
  ON "assignments"("operation_id", "is_primary");
