-- PMOC: registro de adiantamento (execução gerada muito antes do previsto).
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'REQUEST_EARLY_GENERATION' BEFORE 'OS_GENERATED_AUTO';
