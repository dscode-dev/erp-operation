-- Owner pode ocultar a assinatura do cliente em um documento (ex.: RVT criado na
-- Central de Relatórios): não exige coleta e não renderiza o bloco no PDF.
-- Apenas oculta — o fluxo do operador em campo continua coletando/exibindo.
ALTER TABLE "operation_documents"
  ADD COLUMN IF NOT EXISTS "customer_signature_hidden" BOOLEAN NOT NULL DEFAULT false;
