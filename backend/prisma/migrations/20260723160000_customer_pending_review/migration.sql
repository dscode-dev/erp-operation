-- Cadastro de cliente criado em campo (OS avulso) aguardando conclusão pelo owner.
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "pending_review" BOOLEAN NOT NULL DEFAULT false;
