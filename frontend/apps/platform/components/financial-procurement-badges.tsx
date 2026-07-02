"use client";

import type { FinancialEntryStatus, FinancialEntryType, PurchaseOrderStatus } from "@erp/api";

const financialStatusMeta: Record<FinancialEntryStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  PAID: { label: "Pago", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  CANCELED: { label: "Cancelado", className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
  OVERDUE: { label: "Em atraso", className: "bg-red-500/10 text-red-700 border-red-500/20" },
};

const financialTypeMeta: Record<FinancialEntryType, { label: string; className: string }> = {
  RECEIVABLE: { label: "A receber", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  PAYABLE: { label: "A pagar", className: "bg-red-500/10 text-red-700 border-red-500/20" },
  TRANSFER: { label: "Transferência", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
};

const purchaseStatusMeta: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
  SENT: { label: "Enviado", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  PARTIALLY_RECEIVED: { label: "Parcial", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  RECEIVED: { label: "Recebido", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  CANCELED: { label: "Cancelado", className: "bg-red-500/10 text-red-700 border-red-500/20" },
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}

export function FinancialStatusBadge({ status }: { status: FinancialEntryStatus }) {
  return <Badge {...financialStatusMeta[status]} />;
}

export function FinancialTypeBadge({ type }: { type: FinancialEntryType }) {
  return <Badge {...financialTypeMeta[type]} />;
}

export function PurchaseStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge {...purchaseStatusMeta[status]} />;
}

export function purchaseStatusLabel(status: PurchaseOrderStatus): string {
  return purchaseStatusMeta[status].label;
}
