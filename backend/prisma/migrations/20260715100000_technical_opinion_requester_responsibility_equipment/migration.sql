ALTER TABLE "operations"
  ADD COLUMN "technical_opinion_responsible" VARCHAR(180),
  ADD COLUMN "technical_opinion_crea" VARCHAR(100);

ALTER TABLE "operation_inspected_equipments"
  ADD COLUMN "system_type_snapshot" VARCHAR(180),
  ADD COLUMN "current_situation_snapshot" VARCHAR(500);
