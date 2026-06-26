"use client";

/**
 * CustomerDetailDrawer — read-only detail (GET /customers/:id) with tabs:
 * Visão geral · Endereços · Contatos · Anexos. Edit/disable actions are gated.
 */
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MapPin, Paperclip, Phone, Mail, FileText } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { DrawerTabs } from "@erp/ui/drawer-tabs";
import { StatusPill } from "@erp/ui/status-pill";
import { ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import { customersApi, useQuery, type CustomerDetail } from "@erp/api";
import { formatDate, maskCep } from "@erp/utils";

const TABS = ["Visão geral", "Endereços", "Contatos", "Anexos"] as const;
type Tab = (typeof TABS)[number];

export function CustomerDetailDrawer({
  customerId,
  open,
  onClose,
  onEdit,
}: {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (customer: CustomerDetail) => void;
}) {
  const [tab, setTab] = useState<Tab>("Visão geral");
  const detail = useQuery<CustomerDetail | null>(
    (signal) => (customerId ? customersApi.getCustomer(customerId, { signal }) : Promise.resolve(null)),
    [customerId, open],
  );
  const c = detail.data;

  return (
    <Drawer open={open} onClose={onClose} eyebrow="Cliente" title={c?.name ?? "Carregando…"}>
      {detail.loading && !c ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando cliente…
        </div>
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : c ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={c.isActive ? "success" : "offline"} label={c.isActive ? "Ativo" : "Inativo"} />
            <span className="text-[11px] uppercase tracking-wider rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[var(--color-muted-foreground)]">
              {c.type === "COMPANY" ? "Empresa" : "Pessoa"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Gate roles={["OWNER", "MANAGER"]}>
                {onEdit && (
                  <button onClick={() => onEdit(c)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 h-8 text-xs hover:bg-[var(--color-muted)]">
                    Editar
                  </button>
                )}
              </Gate>
              <Link href={`/clientes/${c.id}`} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 h-8 text-xs hover:bg-[var(--color-muted)]">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir página
              </Link>
            </div>
          </div>

          <DrawerTabs
            tabs={TABS}
            active={tab}
            onChange={setTab}
            counts={{ Endereços: c.addresses.length, Contatos: c.contacts.length, Anexos: c.attachments.length }}
          />

          {tab === "Visão geral" && <OverviewTab c={c} />}
          {tab === "Endereços" && <AddressesTab c={c} />}
          {tab === "Contatos" && <ContactsTab c={c} />}
          {tab === "Anexos" && <AttachmentsTab c={c} />}
        </div>
      ) : null}
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0 border-[var(--color-border)]/60">
      <span className="text-caption">{label}</span>
      <span className="text-sm text-right">{value || "—"}</span>
    </div>
  );
}

function OverviewTab({ c }: { c: CustomerDetail }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <Row label="Documento" value={c.cnpj ?? c.cpf} />
      {c.tradeName && <Row label="Nome fantasia" value={c.tradeName} />}
      <Row label="E-mail" value={c.email} />
      <Row label="Telefone" value={c.phone} />
      {c.secondaryPhone && <Row label="Telefone secundário" value={c.secondaryPhone} />}
      <Row label="Cadastrado em" value={formatDate(c.createdAt)} />
      {c.notes && <Row label="Observações" value={c.notes} />}
    </div>
  );
}

function AddressesTab({ c }: { c: CustomerDetail }) {
  if (c.addresses.length === 0) return <Empty label="Nenhum endereço cadastrado." />;
  return (
    <ul className="space-y-2">
      {c.addresses.map((a) => (
        <li key={a.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <span className="text-sm font-medium">{a.name ?? "Endereço"}</span>
            {a.isPrimary && <span className="text-[10px] uppercase rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5">Principal</span>}
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {[a.street, a.number, a.complement, a.district].filter(Boolean).join(", ")}
            {a.city ? ` — ${a.city}/${a.state ?? ""}` : ""}
            {a.zipCode ? ` · CEP ${maskCep(a.zipCode)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ContactsTab({ c }: { c: CustomerDetail }) {
  if (c.contacts.length === 0) return <Empty label="Nenhum contato cadastrado." />;
  return (
    <ul className="space-y-2">
      {c.contacts.map((ct) => (
        <li key={ct.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{ct.name}</span>
            {ct.role && <span className="text-caption">· {ct.role}</span>}
            {ct.isPrimary && <span className="text-[10px] uppercase rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5">Principal</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
            {ct.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {ct.phone}</span>}
            {ct.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {ct.email}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AttachmentsTab({ c }: { c: CustomerDetail }) {
  if (c.attachments.length === 0) return <Empty label="Nenhum anexo." />;
  return (
    <ul className="space-y-2">
      {c.attachments.map((at) => (
        <li key={at.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{at.originalFileName}</div>
            <div className="text-caption">{at.category} · {(at.fileSize / 1024).toFixed(0)} KB</div>
          </div>
          <Paperclip className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </li>
      ))}
    </ul>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">{label}</p>;
}
