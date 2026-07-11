ALTER TABLE "document_templates"
  ADD COLUMN "execution_signature_client" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "execution_signature_technician" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "execution_signature_operator" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "signatures"
  ADD COLUMN "professional_council" VARCHAR(120),
  ADD COLUMN "department" VARCHAR(120);

CREATE TABLE "document_template_signatures" (
  "id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "signature_id" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_template_signatures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_template_signatures_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_template_signatures_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "signatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "document_template_signatures_template_id_signature_id_key" ON "document_template_signatures"("template_id", "signature_id");
CREATE INDEX "document_template_signatures_template_id_position_idx" ON "document_template_signatures"("template_id", "position");
CREATE INDEX "document_template_signatures_signature_id_idx" ON "document_template_signatures"("signature_id");

INSERT INTO "document_template_signatures" ("id", "template_id", "signature_id", "position")
SELECT gen_random_uuid(), "id", "signature_id", 0
FROM "document_templates"
WHERE "signature_id" IS NOT NULL
ON CONFLICT ("template_id", "signature_id") DO NOTHING;
