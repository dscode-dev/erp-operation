ALTER TABLE "signatures" ADD COLUMN "user_id" UUID;

CREATE UNIQUE INDEX "signatures_user_id_key" ON "signatures"("user_id");
CREATE INDEX "signatures_user_id_idx" ON "signatures"("user_id");

ALTER TABLE "signatures"
ADD CONSTRAINT "signatures_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
