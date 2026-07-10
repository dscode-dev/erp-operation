-- Additive V1 document taxonomy closure.
-- Existing REPORT values remain valid for historical compatibility.
ALTER TYPE "DocumentTemplateType" ADD VALUE IF NOT EXISTS 'TECHNICAL_OPINION';
