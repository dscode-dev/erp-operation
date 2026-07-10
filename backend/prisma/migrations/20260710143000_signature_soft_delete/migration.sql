ALTER TABLE "signatures"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "signatures_deleted_at_idx"
  ON "signatures"("deleted_at");
