import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { ComingSoonState } from "@erp/ui/states";

/** Detalhe de produto — aguardando o domínio de Produtos no backend. */
export default function ProdutoDetailPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <Link href="/produtos" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Produtos
      </Link>
      <PageHeader eyebrow="Cadastros" title="Detalhe do produto" description="Detalhe será integrado ao domínio de Produtos." />
      <ComingSoonState title="Detalhe de produto em breve" description="Ficha técnica, movimentações e utilizações em OS serão consumidas da API quando o domínio existir." />
    </div>
  );
}
