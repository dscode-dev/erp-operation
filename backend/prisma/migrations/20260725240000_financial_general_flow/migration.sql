-- Fluxo financeiro simplificado: conta geral + lançamentos sem categoria
-- obrigatória, e origem RECEIPT para as entradas extraídas de recibos.
ALTER TYPE "FinancialEntryOrigin" ADD VALUE IF NOT EXISTS 'RECEIPT';

ALTER TABLE "financial_entries"
  ALTER COLUMN "category_id" DROP NOT NULL;
