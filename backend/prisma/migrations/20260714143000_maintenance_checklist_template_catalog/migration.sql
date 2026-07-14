CREATE TABLE "maintenance_checklist_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "maintenance_type" "OperationMaintenanceType" NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "maintenance_checklist_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_checklist_templates_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "maintenance_checklist_template_unique"
  ON "maintenance_checklist_templates"("organization_id", "maintenance_type", "description");

CREATE INDEX "maintenance_checklist_template_lookup_idx"
  ON "maintenance_checklist_templates"("organization_id", "maintenance_type", "active");
