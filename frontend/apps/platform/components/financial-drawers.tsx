"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Drawer } from "@erp/ui/drawer";
import { ErrorState } from "@erp/ui/states";
import {
  financialApi,
  type FinancialAccount,
  type FinancialAccountType,
  type FinancialCategory,
  type FinancialCategoryType,
  type FinancialEntry,
  type FinancialEntryOrigin,
  type FinancialEntryType,
  type FinancialHistory,
  type Paginated,
} from "@erp/api";
import { formatCurrencyBRL, formatDate, formatDateTime } from "@erp/utils";
import { FinancialStatusBadge, FinancialTypeBadge } from "./financial-procurement-badges";

const accountTypes: FinancialAccountType[] = ["CASH", "BANK", "CREDIT_CARD", "DIGITAL_WALLET", "OTHER"];
const categoryTypes: FinancialCategoryType[] = ["INCOME", "EXPENSE", "TRANSFER"];
const entryTypes: FinancialEntryType[] = ["RECEIVABLE", "PAYABLE", "TRANSFER"];

/** Backend rule (assertAccountCategory): each entry type accepts one category type. */
const ENTRY_CATEGORY_TYPE: Record<FinancialEntryType, FinancialCategoryType> = {
  RECEIVABLE: "INCOME",
  PAYABLE: "EXPENSE",
  TRANSFER: "TRANSFER",
};
const origins: FinancialEntryOrigin[] = ["MANUAL", "BUDGET", "PURCHASE", "OPERATION", "PMOC", "OTHER"];

type MutationState = { loading: boolean; error: unknown | null };

export function FinancialEntryDrawer({
  open,
  entry,
  accounts,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  entry: FinancialEntry | null;
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    accountId: "",
    categoryId: "",
    type: "RECEIVABLE" as FinancialEntryType,
    origin: "MANUAL" as FinancialEntryOrigin,
    amount: "",
    dueDate: "",
    description: "",
    notes: "",
  });
  const [history, setHistory] = useState<Paginated<FinancialHistory> | null>(null);
  const [state, setState] = useState<MutationState>({ loading: false, error: null });

  // Only categories whose type matches the selected entry type are valid
  // (backend rejects the pair with FINANCIAL_INVALID_RELATIONSHIP otherwise).
  const compatibleCategories = categories.filter((c) => c.active && c.type === ENTRY_CATEGORY_TYPE[form.type]);

  useEffect(() => {
    if (!open) return;
    const initialType = entry?.type ?? "RECEIVABLE";
    setForm({
      accountId: entry?.accountId ?? accounts[0]?.id ?? "",
      categoryId:
        entry?.categoryId ??
        categories.find((c) => c.active && c.type === ENTRY_CATEGORY_TYPE[initialType])?.id ??
        "",
      type: initialType,
      origin: entry?.origin ?? "MANUAL",
      amount: entry ? String(entry.amount) : "",
      dueDate: entry?.dueDate ? entry.dueDate.slice(0, 10) : "",
      description: entry?.description ?? "",
      notes: entry?.notes ?? "",
    });
    setState({ loading: false, error: null });
    setHistory(null);
    if (entry) {
      financialApi.getHistory(entry.id, { limit: 20 }).then(setHistory).catch(() => setHistory(null));
    }
  }, [open, entry, accounts, categories]);

  async function save() {
    setState({ loading: true, error: null });
    try {
      const payload = {
        accountId: form.accountId,
        categoryId: form.categoryId,
        type: form.type,
        origin: form.origin,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        description: form.description,
        notes: form.notes || null,
      };
      if (entry) await financialApi.updateEntry(entry.id, payload);
      else await financialApi.createEntry(payload);
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function pay() {
    if (!entry) return;
    setState({ loading: true, error: null });
    try {
      await financialApi.payEntry(entry.id);
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function cancel() {
    if (!entry || !window.confirm("Cancelar este lançamento?")) return;
    setState({ loading: true, error: null });
    try {
      await financialApi.cancelEntry(entry.id, { reason: "Cancelado pela interface" });
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={entry ? entry.description : "Novo lançamento"}
      eyebrow="Financeiro"
      width="max-w-3xl"
      footer={
        <>
          {entry?.status === "PENDING" && (
            <>
              <button onClick={cancel} className="btn-secondary text-red-600" disabled={state.loading}>Cancelar</button>
              <button onClick={pay} className="btn-secondary" disabled={state.loading}>Marcar pago</button>
            </>
          )}
          <button onClick={onClose} className="btn-secondary" disabled={state.loading}>Fechar</button>
          <button onClick={save} className="btn-primary" disabled={state.loading || !form.accountId || !form.categoryId}>Salvar</button>
        </>
      }
    >
      <div className="space-y-5">
        {state.error ? <ErrorState error={state.error} /> : null}
        {entry && (
          <div className="flex flex-wrap gap-2">
            <FinancialStatusBadge status={entry.status} />
            <FinancialTypeBadge type={entry.type} />
            <span className="text-caption">Criado em {formatDateTime(entry.createdAt)}</span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Conta">
            <select value={form.accountId} onChange={(e) => setForm((s) => ({ ...s, accountId: e.target.value }))} className="input">
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={form.categoryId} onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))} className="input">
              {compatibleCategories.length === 0 && <option value="">Nenhuma categoria compatível</option>}
              {compatibleCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as FinancialEntryType;
                // Changing the type invalidates the current category; pick the
                // first compatible one for the new type.
                setForm((s) => ({
                  ...s,
                  type,
                  categoryId: categories.find((c) => c.active && c.type === ENTRY_CATEGORY_TYPE[type])?.id ?? "",
                }));
              }}
              className="input"
            >
              {entryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Origem">
            <select value={form.origin} onChange={(e) => setForm((s) => ({ ...s, origin: e.target.value as FinancialEntryOrigin }))} className="input">
              {origins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
            </select>
          </Field>
          <Field label="Valor">
            <input value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} className="input" type="number" min="0.01" step="0.01" />
          </Field>
          <Field label="Vencimento">
            <input value={form.dueDate} onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))} className="input" type="date" />
          </Field>
          <Field label="Descrição">
            <input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className="input" />
          </Field>
          <Field label="Observações">
            <input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} className="input" />
          </Field>
        </div>
        {entry && (
          <section>
            <h3 className="text-sm font-semibold mb-2">Histórico</h3>
            <HistoryList items={history?.items ?? []} />
          </section>
        )}
      </div>
    </Drawer>
  );
}

export function FinancialAccountDrawer({
  open,
  account,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: FinancialAccount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: "", type: "BANK" as FinancialAccountType, openingBalance: "0", description: "", active: true });
  const [state, setState] = useState<MutationState>({ loading: false, error: null });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: account?.name ?? "",
      type: account?.type ?? "BANK",
      openingBalance: account ? String(account.openingBalance) : "0",
      description: account?.description ?? "",
      active: account?.active ?? true,
    });
    setState({ loading: false, error: null });
  }, [open, account]);

  async function save() {
    setState({ loading: true, error: null });
    try {
      const payload = { name: form.name, type: form.type, description: form.description || null, openingBalance: Number(form.openingBalance || 0), active: form.active };
      if (account) await financialApi.updateAccount(account.id, payload);
      else await financialApi.createAccount(payload);
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function deactivate() {
    if (!account || !window.confirm("Desativar esta conta?")) return;
    setState({ loading: true, error: null });
    try {
      await financialApi.deleteAccount(account.id);
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={account ? account.name : "Nova conta"} eyebrow="Conta financeira" footer={<><button onClick={deactivate} className="btn-secondary text-red-600" disabled={!account || state.loading}>Desativar</button><button onClick={onClose} className="btn-secondary">Fechar</button><button onClick={save} className="btn-primary" disabled={state.loading || !form.name}>Salvar</button></>}>
      <div className="space-y-4">
        {state.error ? <ErrorState error={state.error} /> : null}
        <Field label="Nome"><input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
        <Field label="Tipo"><select className="input" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as FinancialAccountType }))}>{accountTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
        {!account && <Field label="Saldo inicial"><input className="input" type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm((s) => ({ ...s, openingBalance: e.target.value }))} /></Field>}
        <Field label="Descrição"><textarea className="input min-h-24" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
        {account && <p className="text-caption">Saldo atual: {formatCurrencyBRL(Number(account.currentBalance))}</p>}
      </div>
    </Drawer>
  );
}

export function FinancialCategoryDrawer({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: FinancialCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: "", type: "EXPENSE" as FinancialCategoryType, color: "#2563eb", icon: "Tag", active: true });
  const [state, setState] = useState<MutationState>({ loading: false, error: null });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: category?.name ?? "",
      type: category?.type ?? "EXPENSE",
      color: category?.color ?? "#2563eb",
      icon: category?.icon ?? "Tag",
      active: category?.active ?? true,
    });
    setState({ loading: false, error: null });
  }, [open, category]);

  async function save() {
    setState({ loading: true, error: null });
    try {
      const payload = { name: form.name, type: form.type, color: form.color || null, icon: form.icon || null, active: form.active };
      if (category) await financialApi.updateCategory(category.id, payload);
      else await financialApi.createCategory(payload);
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function deactivate() {
    if (!category || !window.confirm("Desativar esta categoria?")) return;
    setState({ loading: true, error: null });
    try {
      await financialApi.deleteCategory(category.id);
      onSaved();
      onClose();
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={category ? category.name : "Nova categoria"} eyebrow="Categoria financeira" footer={<><button onClick={deactivate} className="btn-secondary text-red-600" disabled={!category || state.loading}>Desativar</button><button onClick={onClose} className="btn-secondary">Fechar</button><button onClick={save} className="btn-primary" disabled={state.loading || !form.name}>Salvar</button></>}>
      <div className="space-y-4">
        {state.error ? <ErrorState error={state.error} /> : null}
        <Field label="Nome"><input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
        <Field label="Tipo"><select className="input" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as FinancialCategoryType }))}>{categoryTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cor"><input className="input" value={form.color} onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))} /></Field>
          <Field label="Ícone"><input className="input" value={form.icon} onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))} /></Field>
        </div>
      </div>
    </Drawer>
  );
}

function HistoryList({ items }: { items: FinancialHistory[] }) {
  if (items.length === 0) return <p className="text-caption">Nenhum histórico retornado.</p>;
  return (
    <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
      {items.map((item) => (
        <li key={item.id} className="p-3 text-sm">
          <div className="font-medium">{item.action}</div>
          <div className="text-caption">{formatDateTime(item.createdAt)} · {item.actor?.name ?? "Sistema"}</div>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium space-y-1"><span>{label}</span>{children}</label>;
}

export function FinancialEntrySummary({ entry }: { entry: FinancialEntry }) {
  const sign = entry.type === "PAYABLE" ? "-" : "+";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <FinancialStatusBadge status={entry.status} />
        <FinancialTypeBadge type={entry.type} />
      </div>
      <p className="text-2xl font-semibold">{sign}{formatCurrencyBRL(Number(entry.amount))}</p>
      <p className="text-caption">Vencimento: {formatDate(entry.dueDate)}</p>
    </div>
  );
}
