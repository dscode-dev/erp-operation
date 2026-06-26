import { ComingSoonState } from "@erp/ui/states";

/**
 * Documentos do operador — a geração de documentos (OS, orçamento, recibo,
 * laudo) é responsabilidade do backend e ainda não há endpoint. A arquitetura
 * de visualização (Preview/Review/Download em components/documents) já está
 * pronta para o fluxo futuro: formulário → assinatura → backend → PDF.
 */
export default function OperatorDocuments() {
  return (
    <div className="px-4 pt-6 space-y-4">
      <header>
        <h1 className="text-section-title">Documentos</h1>
        <p className="text-[var(--color-muted-foreground)] text-sm">OS, orçamentos e termos.</p>
      </header>
      <ComingSoonState
        title="Documentos em breve"
        description="A geração de documentos é feita pelo backend (escopo futuro). A pré-visualização e o download já estão preparados na arquitetura."
      />
    </div>
  );
}
