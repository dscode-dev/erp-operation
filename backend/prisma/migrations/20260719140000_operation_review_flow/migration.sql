-- Operation review flow: assigned operations start PENDING, field completion
-- moves them to REVIEW, and the technical responsible approves to COMPLETED.
ALTER TYPE "OperationStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'IN_PROGRESS';
ALTER TYPE "OperationStatus" ADD VALUE IF NOT EXISTS 'REVIEW' BEFORE 'COMPLETED';
