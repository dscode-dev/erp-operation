import { PageHeader } from "@platform/components/page-header";
import { ComingSoonState } from "@erp/ui/states";

/**
 * Produtos — não há endpoint de produtos nem snapshot no Demo Dataset nesta
 * sprint. Estado honesto de preparação (sem mocks locais). Filtros, exportação
 * e cadastro reutilizam a arquitetura já criada (DataTable, ExportButton,
 * Drawer de formulário) e serão conectados quando a API existir.
 */
export default function ProdutosPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Cadastros"
        title="Produtos"
        description="Catálogo de peças e insumos — filtros, exportação e cadastro serão integrados à API."
      />
      <ComingSoonState
        title="Catálogo de produtos em breve"
        description="Ainda não existe endpoint de produtos nem dados no Demo Dataset. A arquitetura de listagem e cadastro está pronta para integração assim que a API estiver disponível."
      />
    </div>
  );
}
