CREATE UNIQUE INDEX "pmoc_history_execution_completed_once_key"
  ON "pmoc_history"("execution_request_id", "action")
  WHERE "action" = 'EXECUTION_COMPLETED';
