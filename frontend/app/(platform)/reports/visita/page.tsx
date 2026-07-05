"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera, X, Info } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import { customersApi, equipmentsApi, usersApi, useQuery } from "@erp/api";

/**
 * Relatório de Visita Técnica — fluxo VISUAL (Sprint 2).
 * Coleta cliente, equipamento, operador, observações, fotos e assinatura.
 * NÃO gera PDF: a montagem do documento é responsabilidade do backend (Sprint 3).
 */
export default function VisitaTecnicaPage() {
  const [customerId, setCustomerId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const photosRef = useRef(photos);
  const [signed, setSigned] = useState(false);

  const customers = useQuery((signal) => customersApi.listCustomers({ limit: 100, signal }), []);
  const operators = useQuery((signal) => usersApi.listUsers({ limit: 100, signal }), []);
  const equipments = useQuery(
    (signal) => (customerId ? equipmentsApi.listEquipments({ customerId, limit: 100, signal }) : Promise.resolve(null)),
    [customerId],
  );

  // Reset equipment when customer changes.
  useEffect(() => { setEquipmentId(""); }, [customerId]);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)); }, []);

  const customer = customers.data?.items.find((c) => c.id === customerId);
  const equipment = equipments.data?.items.find((e) => e.id === equipmentId);
  const operator = operators.data?.items.find((u) => u.id === operatorId);

  function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))]);
    e.target.value = "";
  }
  function removePhoto(i: number) {
    setPhotos((prev) => {
      const target = prev[i];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Relatórios
      </Link>
      <PageHeader eyebrow="Visita Técnica" title="Relatório de Visita Técnica" description="Fluxo visual de preenchimento. A geração do PDF é feita pelo backend (Sprint 3)." />

      <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)] flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        Esta é a etapa de coleta. Fotos e assinatura são visuais nesta sprint e não são enviadas ainda.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Form */}
        <div className="space-y-4">
          <SectionCard title="Identificação">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Cliente" value={customerId} onChange={setCustomerId} options={(customers.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Selecione o cliente" />
              <Select label="Equipamento" value={equipmentId} onChange={setEquipmentId} options={(equipments.data?.items ?? []).map((e) => ({ value: e.id, label: e.name }))} placeholder={customerId ? "Selecione o equipamento" : "Selecione o cliente primeiro"} disabled={!customerId} />
              <Select label="Operador" value={operatorId} onChange={setOperatorId} options={(operators.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))} placeholder="Selecione o operador" />
            </div>
          </SectionCard>

          <SectionCard title="Observações técnicas">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Descreva o serviço executado, condições do equipamento, recomendações…" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] resize-none" />
          </SectionCard>

          <SectionCard title={`Fotos (${photos.length})`}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p, i) => (
                <div key={p.url} className="relative group aspect-square rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]">
                  <Image src={p.url} alt={p.name} fill sizes="120px" unoptimized className="object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label="Remover foto" className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] grid place-items-center cursor-pointer hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                <Camera className="h-5 w-5" />
                <input type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" aria-label="Adicionar fotos" />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Assinatura">
            <SignaturePad onChange={(d) => setSigned(Boolean(d))} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Resumo">
            <dl className="space-y-2 text-sm">
              <ReviewRow label="Cliente" value={customer?.name ?? "—"} />
              <ReviewRow label="Equipamento" value={equipment?.name ?? "—"} />
              <ReviewRow label="Operador" value={operator?.name ?? "—"} />
              <ReviewRow label="Fotos" value={String(photos.length)} />
              <ReviewRow label="Assinatura" value={signed ? "Coletada" : "Pendente"} />
            </dl>
            <p className="mt-3 text-caption">Preview e PDF oficiais são feitos apenas pelo Document Engine após criação de Operation.</p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-caption">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Select({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)] disabled:opacity-60">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
