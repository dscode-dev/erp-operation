-- Setor/local do equipamento (usado nos relatórios no lugar do endereço).
ALTER TABLE "equipments"
  ADD COLUMN IF NOT EXISTS "sector" VARCHAR(160);
