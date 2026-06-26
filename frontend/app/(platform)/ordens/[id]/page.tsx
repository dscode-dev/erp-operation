import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { ComingSoonState } from "@/components/shared/states";

/** Detalhe de OS — aguardando o domínio de Work Order no backend. */
export default function OrdemDetailPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <Link href="/ordens" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Ordens de Serviço
      </Link>
      <PageHeader eyebrow="Operação" title="Detalhe da OS" description="Detalhe será integrado ao domínio de Ordens de Serviço." />
      <ComingSoonState title="Detalhe de OS em breve" description="O detalhamento (checklist, itens, linha do tempo e anexos) será consumido da API quando o domínio existir." />
    </div>
  );
}
