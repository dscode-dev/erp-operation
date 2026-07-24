-- Visibilidade de demandas no app do operador: a gestão autoriza a exibição.
ALTER TABLE "assignments"
  ADD COLUMN IF NOT EXISTS "operator_visible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "authorized_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "authorized_by" UUID;

-- Demandas já em andamento/concluídas antes desta mudança permanecem visíveis.
UPDATE "assignments"
  SET "operator_visible" = true
  WHERE "status" <> 'ASSIGNED';

-- Auto-atribuições (operador criou o próprio atendimento) já nascem visíveis.
UPDATE "assignments"
  SET "operator_visible" = true
  WHERE "assigned_by" = "assigned_to";

CREATE INDEX IF NOT EXISTS "assignments_assignee_visible_status_idx"
  ON "assignments"("assigned_to", "operator_visible", "status");
