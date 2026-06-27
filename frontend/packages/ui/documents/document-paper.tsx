"use client";

/**
 * DocumentPaper — renderização profissional e moderna de um documento (A4).
 *
 * Identidade compartilhada por todos os modelos: cabeçalho com logo + dados da
 * organização, faixa de título, grade de metadados, seções dinâmicas, área de
 * assinatura e rodapé. É a base visual preparada para a renderização dinâmica
 * pelo backend (mesma estrutura de seções). Não gera PDF.
 */
import { BrandLogo } from "../brand";

export type DocPaperSection =
  | { title: string; kind: "fields"; fields: { label: string; value: string }[] }
  | { title: string; kind: "text"; text: string }
  | { title: string; kind: "list"; items: string[] }
  | { title: string; kind: "table"; columns: string[]; rows: string[][]; total?: string };

export type DocPaperData = {
  kindLabel: string;
  number: string;
  statusLabel?: string;
  org: { name: string; cnpj?: string; city?: string; email?: string; phone?: string };
  meta: { label: string; value: string }[];
  sections: DocPaperSection[];
  signatures: { name: string; role: string }[];
};

export function DocumentPaper({ data }: { data: DocPaperData }) {
  return (
    <div className="mx-auto w-full max-w-[820px] bg-white text-[#0f172a] shadow-[var(--shadow-card)] rounded-[var(--radius-md)] overflow-hidden">
      {/* Top brand bar */}
      <div className="h-1.5 bg-[var(--color-primary)]" />

      <div className="p-7 sm:p-9">
        {/* Header */}
        <header className="flex items-start justify-between gap-6 border-b border-[#e2e8f0] pb-5">
          <BrandLogo height={40} />
          <div className="text-right text-[11px] leading-relaxed text-[#475569]">
            <div className="text-[13px] font-semibold text-[#0f172a]">{data.org.name}</div>
            {data.org.cnpj && <div>CNPJ {data.org.cnpj}</div>}
            {data.org.city && <div>{data.org.city}</div>}
            {(data.org.phone || data.org.email) && <div>{[data.org.phone, data.org.email].filter(Boolean).join(" · ")}</div>}
          </div>
        </header>

        {/* Title */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">{data.kindLabel}</h1>
            <p className="text-[12px] text-[#64748b] mt-0.5">Documento nº <span className="font-mono">{data.number}</span></p>
          </div>
          {data.statusLabel && (
            <span className="text-[11px] font-medium uppercase tracking-wider rounded-full border border-[#cbd5e1] px-2.5 py-1 text-[#475569]">{data.statusLabel}</span>
          )}
        </div>

        {/* Meta grid */}
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 rounded-[var(--radius-md)] bg-[#f8fafc] border border-[#e2e8f0] p-4">
          {data.meta.map((m) => (
            <div key={m.label} className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-[#94a3b8]">{m.label}</span>
              <span className="text-[13px] font-medium">{m.value || "—"}</span>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="mt-6 space-y-5">
          {data.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)] border-b border-[#e2e8f0] pb-1.5 mb-2.5">{s.title}</h2>
              {s.kind === "text" && <p className="text-[13px] leading-relaxed text-[#334155] whitespace-pre-wrap">{s.text}</p>}
              {s.kind === "fields" && (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                  {s.fields.map((f) => (
                    <div key={f.label} className="flex justify-between gap-4 text-[13px] border-b border-dashed border-[#e2e8f0] py-1">
                      <span className="text-[#64748b]">{f.label}</span>
                      <span className="font-medium text-right">{f.value || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.kind === "list" && (
                <ul className="space-y-1.5">
                  {s.items.map((it, j) => (
                    <li key={j} className="flex items-start gap-2 text-[13px] text-[#334155]">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0" /> {it}
                    </li>
                  ))}
                </ul>
              )}
              {s.kind === "table" && (
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-[#94a3b8] border-b border-[#e2e8f0]">
                      {s.columns.map((c, j) => <th key={j} className={`py-1.5 font-medium ${j === s.columns.length - 1 ? "text-right" : ""}`}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-[#f1f5f9]">
                        {row.map((cell, ci) => <td key={ci} className={`py-1.5 ${ci === row.length - 1 ? "text-right font-medium" : "text-[#334155]"}`}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  {s.total && (
                    <tfoot>
                      <tr><td colSpan={s.columns.length} className="pt-2 text-right text-[14px] font-semibold">Total: {s.total}</td></tr>
                    </tfoot>
                  )}
                </table>
              )}
            </section>
          ))}
        </div>

        {/* Signatures */}
        {data.signatures.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-10">
            {data.signatures.map((sig) => (
              <div key={sig.role} className="text-center">
                <div className="border-t border-[#94a3b8] pt-1.5 text-[12px] font-medium">{sig.name}</div>
                <div className="text-[11px] text-[#64748b]">{sig.role}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-[#e2e8f0] pt-3 flex items-center justify-between text-[10px] text-[#94a3b8]">
          <span>{data.org.name}</span>
          <span>Documento gerado pelo ERP · {data.number}</span>
        </footer>
      </div>
    </div>
  );
}
