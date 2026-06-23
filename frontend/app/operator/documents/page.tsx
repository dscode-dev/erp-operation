import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { operatorDocuments } from "@/mocks/data";

export default function OperatorDocuments() {
  return (
    <div className="px-4 pt-6 space-y-4">
      <header>
        <h1 className="text-heading">Documentos</h1>
        <p className="text-[var(--color-muted-foreground)] text-sm">OS, orçamentos e termos assinados.</p>
      </header>
      {operatorDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento"
          description="Documentos gerados em atendimentos aparecem aqui."
        />
      ) : (
        <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] divide-y divide-[var(--color-border)]">
          {operatorDocuments.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.title}</div>
                <div className="text-caption">{d.kind} · {d.date}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
