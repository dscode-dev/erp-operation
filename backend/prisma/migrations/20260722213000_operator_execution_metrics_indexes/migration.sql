CREATE INDEX "assignments_assignee_completed_idx"
  ON "assignments"("assigned_to", "completed_at");

CREATE INDEX "operations_schedule_status_idx"
  ON "operations"("scheduled_for", "status");
