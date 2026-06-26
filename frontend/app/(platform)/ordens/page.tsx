import { PageHeader } from "@platform/components/page-header";
import { ComingSoonState } from "@erp/ui/states";

/**
 * Ordens de Serviço — o domínio de Work Order ainda não existe na API e não há
 * snapshot no Demo Dataset. Conforme a sprint ("não criar lógica fake"), a tela
 * apresenta um estado honesto de preparação. Filtros, paginação, drawer de
 * detalhes e exportação serão ligados aos endpoints reais quando existirem
 * (a arquitetura — DataTable, Pagination, Drawer, ExportButton — já está pronta).
 */
export default function OrdensPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Ordens de Serviço"
        description="Indicadores, filtros, paginação, detalhe e exportação serão integrados ao domínio de OS."
      />
      <ComingSoonState
        title="Domínio de Ordens de Serviço em breve"
        description="A API de OS é escopo futuro. A arquitetura de listagem (filtros, paginação, drawer e exportação) já está pronta e será conectada assim que os endpoints existirem — sem dados fictícios até lá."
      />
    </div>
  );
}
