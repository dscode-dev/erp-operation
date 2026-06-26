"use client";

/**
 * AtendimentoWizard — the full field-service flow:
 * Cliente → Endereço → Equipamento → Tipo → Checklist → Observações → Fotos →
 * Assinatura → Resumo → Enviar.
 *
 * Reads clients/equipments from the real backend; on submit, enqueues to the
 * offline outbox (no Service endpoint yet — Backend Sprint 6).
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Building2, MapPin, Wrench, ClipboardList, Check, CheckCircle2,
  Camera, PenLine, FileText, Send, ChevronRight, Circle,
} from "lucide-react";
import { WizardProgressHeader } from "@erp/ui/wizard/progress-header";
import { WizardFooter } from "@erp/ui/wizard/step-footer";
import { SearchInput } from "@erp/ui/search-input";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { PhotoInput, type CapturedPhoto } from "@erp/ui/photo-input";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import {
  customersApi, equipmentsApi, useQuery,
  type Customer, type CustomerDetail, type EquipmentSummary,
} from "@erp/api";
import { useDebounce } from "@erp/utils";
import { SERVICE_TYPES, serviceTypeLabel, type ServiceTypeKey } from "../../lib/service-types";
import { submitAtendimento } from "../../lib/atendimento";

const STEPS = [
  "Cliente", "Endereço", "Equipamento", "Tipo", "Checklist",
  "Observações", "Fotos", "Assinatura", "Resumo",
] as const;

type ChecklistItem = { label: string; done: boolean };

export function AtendimentoWizard({
  initialCustomerId,
  initialEquipmentId,
}: {
  initialCustomerId?: string;
  initialEquipmentId?: string;
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<{ id: string; label: string } | null>(null);
  const [equipment, setEquipment] = useState<EquipmentSummary | null>(null);
  const [serviceType, setServiceType] = useState<ServiceTypeKey | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Prefill from QR / "Iniciar atendimento" deep links.
  useEffect(() => {
    let active = true;
    (async () => {
      if (initialEquipmentId) {
        const eq = await equipmentsApi.getEquipment(initialEquipmentId).catch(() => null);
        if (!active || !eq) return;
        setEquipment(eq);
        if (eq.address) setAddress({ id: eq.address.id, label: eq.address.name ?? eq.address.city ?? "Endereço" });
        if (eq.customer) {
          const c = await customersApi.getCustomer(eq.customer.id).catch(() => null);
          if (active && c) {
            setCustomer(c);
            setStep(3); // pula para Tipo de serviço
          }
        }
      } else if (initialCustomerId) {
        const c = await customersApi.getCustomer(initialCustomerId).catch(() => null);
        if (active && c) {
          setCustomer(c);
          setStep(1); // pula para Endereço
        }
      }
    })();
    return () => { active = false; };
  }, [initialEquipmentId, initialCustomerId]);

  function pickServiceType(key: ServiceTypeKey) {
    setServiceType(key);
    const cfg = SERVICE_TYPES.find((t) => t.key === key);
    setChecklist((cfg?.defaultChecklist ?? []).map((label) => ({ label, done: false })));
  }

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!customer;
      case 1: return !!address;
      case 2: return true; // equipamento opcional
      case 3: return !!serviceType;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return !!signature;
      case 8: return true;
      default: return false;
    }
  }, [step, customer, address, serviceType, signature]);

  function back() {
    if (step === 0) router.push("/operator");
    else setStep((s) => s - 1);
  }

  async function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Resumo → Enviar
    setSubmitting(true);
    const result = submitAtendimento({
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? "",
      addressId: address?.id ?? null,
      addressLabel: address?.label ?? "",
      equipmentId: equipment?.id ?? null,
      equipmentName: equipment?.name ?? "",
      serviceType,
      checklist,
      notes,
      photoCount: photos.length,
      signedAt: signature ? new Date().toISOString() : null,
    });
    setSubmitting(false);
    setSubmittedId(result.id);
  }

  if (submittedId) {
    return <SuccessView onDone={() => router.push("/operator")} onNew={() => window.location.reload()} />;
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex flex-col min-h-dvh">
      <WizardProgressHeader
        title={STEPS[step]}
        current={step}
        total={STEPS.length}
        onBack={back}
        onClose={() => router.push("/operator")}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {step === 0 && <ClienteStep selected={customer} onSelect={(c) => { setCustomer(c); setAddress(null); setEquipment(null); }} />}
        {step === 1 && customer && <EnderecoStep customerId={customer.id} selected={address} onSelect={setAddress} />}
        {step === 2 && customer && <EquipamentoStep customerId={customer.id} selected={equipment} onSelect={setEquipment} />}
        {step === 3 && <TipoStep selected={serviceType} onSelect={pickServiceType} />}
        {step === 4 && <ChecklistStep items={checklist} onToggle={(i) => setChecklist((arr) => arr.map((it, idx) => idx === i ? { ...it, done: !it.done } : it))} />}
        {step === 5 && <NotesStep value={notes} onChange={setNotes} />}
        {step === 6 && <FotosStep photos={photos} onChange={setPhotos} />}
        {step === 7 && <AssinaturaStep onChange={setSignature} />}
        {step === 8 && (
          <ResumoStep
            customer={customer} address={address} equipment={equipment}
            serviceType={serviceType} checklist={checklist} notes={notes}
            photoCount={photos.length} signed={!!signature}
          />
        )}
      </div>

      <WizardFooter
        onBack={back}
        onNext={next}
        nextLabel={isLast ? "Enviar atendimento" : "Continuar"}
        nextDisabled={!canNext}
        loading={submitting}
        isLast={isLast}
        nextIcon={isLast ? <Send className="h-4 w-4" /> : undefined}
      />
    </div>
  );
}

/* ---------- Steps ---------- */

function ClienteStep({ selected, onSelect }: { selected: Customer | null; onSelect: (c: Customer) => void }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const list = useQuery(
    (signal) => customersApi.listCustomers({ limit: 12, search: debounced || undefined, signal }),
    [debounced],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">Busque por nome, telefone ou CNPJ.</p>
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente…" className="w-full" />
      {list.loading && !list.data ? (
        <SkeletonList rows={5} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum cliente" description="Ajuste a busca." />
      ) : (
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((c) => (
            <li key={c.id}>
              <PickRow
                active={selected?.id === c.id}
                onClick={() => onSelect(c)}
                icon={<Building2 className="h-4 w-4" />}
                title={c.name}
                subtitle={c.cnpj ?? c.cpf ?? c.phone ?? "—"}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EnderecoStep({ customerId, selected, onSelect }: { customerId: string; selected: { id: string; label: string } | null; onSelect: (a: { id: string; label: string }) => void }) {
  const detail = useQuery<CustomerDetail>((signal) => customersApi.getCustomer(customerId, { signal }), [customerId]);
  if (detail.loading && !detail.data) return <SkeletonList rows={3} />;
  if (detail.error && !detail.data) return <ErrorState error={detail.error} onRetry={detail.refetch} />;
  const addresses = detail.data?.addresses ?? [];
  if (addresses.length === 0) return <EmptyState icon={MapPin} title="Sem endereços" description="Este cliente não possui endereços cadastrados." />;
  return (
    <ul className="space-y-2">
      {addresses.map((a) => {
        const label = [a.street, a.number, a.district, a.city].filter(Boolean).join(", ") || a.name || "Endereço";
        return (
          <li key={a.id}>
            <PickRow
              active={selected?.id === a.id}
              onClick={() => onSelect({ id: a.id, label })}
              icon={<MapPin className="h-4 w-4" />}
              title={a.name ?? "Endereço"}
              subtitle={label}
              badge={a.isPrimary ? "Principal" : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}

function EquipamentoStep({ customerId, selected, onSelect }: { customerId: string; selected: EquipmentSummary | null; onSelect: (e: EquipmentSummary | null) => void }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const list = useQuery(
    (signal) => equipmentsApi.listEquipments({ customerId, limit: 12, search: debounced || undefined, signal }),
    [customerId, debounced],
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">Busque por nome, código ou número de série. (Opcional)</p>
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar equipamento…" className="w-full" />
      <button type="button" onClick={() => onSelect(null)} className={`w-full text-left rounded-[var(--radius-md)] border p-3 text-sm ${selected === null ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
        Sem equipamento específico
      </button>
      {list.loading && !list.data ? (
        <SkeletonList rows={4} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum equipamento" />
      ) : (
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((e) => (
            <li key={e.id}>
              <PickRow
                active={selected?.id === e.id}
                onClick={() => onSelect(e)}
                icon={<Wrench className="h-4 w-4" />}
                title={e.name}
                subtitle={`${e.tag ?? "—"} · ${e.manufacturer ?? ""} ${e.model ?? ""}`.trim()}
                badge={e.status === "MAINTENANCE" ? "Manutenção" : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TipoStep({ selected, onSelect }: { selected: ServiceTypeKey | null; onSelect: (k: ServiceTypeKey) => void }) {
  return (
    <div className="space-y-2">
      {SERVICE_TYPES.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onSelect(t.key)}
          className={`w-full text-left rounded-[var(--radius-md)] border p-4 transition active:scale-[0.99] ${selected === t.key ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)]"}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{t.label}</span>
            {selected === t.key && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
          </div>
          <p className="text-caption mt-0.5">{t.description}</p>
        </button>
      ))}
    </div>
  );
}

function ChecklistStep({ items, onToggle }: { items: ChecklistItem[]; onToggle: (i: number) => void }) {
  if (items.length === 0) return <EmptyState icon={ClipboardList} title="Selecione o tipo de serviço" description="O checklist é gerado a partir do tipo." />;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i}>
          <button type="button" onClick={() => onToggle(i)} className="w-full flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5 text-left active:scale-[0.99]">
            {it.done ? <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" /> : <Circle className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0" />}
            <span className={`text-sm ${it.done ? "line-through text-[var(--color-muted-foreground)]" : ""}`}>{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function NotesStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-muted-foreground)]">Descreva o serviço, achados e recomendações.</p>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={8} placeholder="Observações técnicas…" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-3 text-sm outline-none focus:border-[var(--color-primary)] resize-none" />
    </div>
  );
}

function FotosStep({ photos, onChange }: { photos: CapturedPhoto[]; onChange: (p: CapturedPhoto[]) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">Registre o serviço com fotos (opcional).</p>
      <PhotoInput photos={photos} onChange={onChange} />
    </div>
  );
}

function AssinaturaStep({ onChange }: { onChange: (s: string | null) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">Colete a assinatura do cliente para concluir.</p>
      <SignaturePad onChange={onChange} onConfirm={onChange} />
    </div>
  );
}

function ResumoStep({
  customer, address, equipment, serviceType, checklist, notes, photoCount, signed,
}: {
  customer: Customer | null;
  address: { id: string; label: string } | null;
  equipment: EquipmentSummary | null;
  serviceType: ServiceTypeKey | null;
  checklist: ChecklistItem[];
  notes: string;
  photoCount: number;
  signed: boolean;
}) {
  const done = checklist.filter((c) => c.done).length;
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)] flex items-start gap-2">
        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
        Revise os dados antes de enviar. O documento é gerado pelo backend após o envio.
      </div>
      <SummaryRow icon={<Building2 className="h-4 w-4" />} label="Cliente" value={customer?.name} />
      <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Endereço" value={address?.label} />
      <SummaryRow icon={<Wrench className="h-4 w-4" />} label="Equipamento" value={equipment?.name ?? "Sem equipamento"} />
      <SummaryRow icon={<ClipboardList className="h-4 w-4" />} label="Tipo" value={serviceType ? serviceTypeLabel(serviceType) : undefined} />
      <SummaryRow icon={<CheckCircle2 className="h-4 w-4" />} label="Checklist" value={`${done}/${checklist.length} concluídos`} />
      <SummaryRow icon={<Camera className="h-4 w-4" />} label="Fotos" value={`${photoCount}`} />
      <SummaryRow icon={<PenLine className="h-4 w-4" />} label="Assinatura" value={signed ? "Coletada" : "Pendente"} tone={signed ? "success" : "warning"} />
      {notes && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <div className="text-caption uppercase tracking-wider mb-1">Observações</div>
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}

function SuccessView({ onDone, onNew }: { onDone: () => void; onNew: () => void }) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="max-w-xs">
        <div className="mx-auto h-16 w-16 rounded-full bg-[var(--color-success)]/12 grid place-items-center text-[var(--color-success)]">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-section-title mt-4">Atendimento registrado</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Salvo na fila de envio. Será sincronizado com o backend automaticamente quando o domínio de Serviços estiver disponível.
        </p>
        <div className="mt-6 space-y-2">
          <button type="button" onClick={onNew} className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-12 text-sm font-semibold active:scale-[0.99]">Novo atendimento</button>
          <button type="button" onClick={onDone} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] h-12 text-sm font-medium hover:bg-[var(--color-muted)]">Voltar ao início</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

function PickRow({ active, onClick, icon, title, subtitle, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string; badge?: string }) {
  return (
    <button type="button" onClick={onClick} className={`w-full text-left flex items-center gap-3 rounded-[var(--radius-md)] border p-3.5 transition active:scale-[0.99] ${active ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`}>
      <span className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{title}</span>
        <span className="block text-caption truncate">{subtitle}</span>
      </span>
      {badge && <StatusChip tone="warning">{badge}</StatusChip>}
      {active ? <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />}
    </button>
  );
}

function SummaryRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value?: string; tone?: "success" | "warning" }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
      <span className="text-[var(--color-muted-foreground)]">{icon}</span>
      <span className="text-caption w-24 shrink-0">{label}</span>
      <span className={`text-sm font-medium flex-1 text-right truncate ${tone === "success" ? "text-[var(--color-success)]" : tone === "warning" ? "text-[var(--color-warning)]" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}
