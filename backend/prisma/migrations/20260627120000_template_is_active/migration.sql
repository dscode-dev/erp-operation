-- Add is_active flag to document templates (ativar/desativar modelos)
ALTER TABLE "document_templates" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "document_templates_organization_id_is_active_idx" ON "document_templates" ("organization_id", "is_active");
