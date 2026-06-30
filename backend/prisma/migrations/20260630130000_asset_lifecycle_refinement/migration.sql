CREATE INDEX "asset_lifecycle_eq_type_at_idx"
  ON "asset_lifecycle_events"("equipment_id", "type", "occurred_at");

CREATE INDEX "asset_lifecycle_eq_performer_at_idx"
  ON "asset_lifecycle_events"("equipment_id", "performed_by", "occurred_at");

CREATE INDEX "asset_lifecycle_at_id_idx"
  ON "asset_lifecycle_events"("occurred_at", "id");

CREATE INDEX "asset_lifecycle_doc_type_idx"
  ON "asset_lifecycle_events"("document_id", "type");
