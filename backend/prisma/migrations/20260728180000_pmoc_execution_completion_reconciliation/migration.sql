UPDATE "maintenance_executions" execution
SET
  "status" = 'COMPLETED'::"MaintenanceExecutionStatus",
  "executed_at" = COALESCE(execution."executed_at", operation."completed_at", CURRENT_TIMESTAMP)
FROM "operations" operation
WHERE execution."operation_id" = operation."id"
  AND operation."status" = 'COMPLETED'::"OperationStatus"
  AND execution."status" <> 'COMPLETED'::"MaintenanceExecutionStatus";

UPDATE "maintenance_plans" plan
SET
  "last_execution" = projection."last_execution",
  "updated_at" = CURRENT_TIMESTAMP
FROM (
  SELECT
    execution."maintenance_plan_id",
    MAX(execution."executed_at") AS "last_execution"
  FROM "maintenance_executions" execution
  WHERE execution."status" = 'COMPLETED'::"MaintenanceExecutionStatus"
    AND execution."executed_at" IS NOT NULL
  GROUP BY execution."maintenance_plan_id"
) projection
WHERE plan."id" = projection."maintenance_plan_id"
  AND (
    plan."last_execution" IS NULL
    OR plan."last_execution" < projection."last_execution"
  );

UPDATE "pmoc_plans" plan
SET
  "last_execution_date" = projection."last_execution",
  "updated_at" = CURRENT_TIMESTAMP
FROM (
  SELECT
    request."pmoc_plan_id",
    MAX(execution."executed_at") AS "last_execution"
  FROM "pmoc_execution_requests" request
  INNER JOIN "maintenance_executions" execution
    ON execution."id" = request."maintenance_execution_id"
  WHERE execution."status" = 'COMPLETED'::"MaintenanceExecutionStatus"
    AND execution."executed_at" IS NOT NULL
  GROUP BY request."pmoc_plan_id"
) projection
WHERE plan."id" = projection."pmoc_plan_id"
  AND (
    plan."last_execution_date" IS NULL
    OR plan."last_execution_date" < projection."last_execution"
  );
