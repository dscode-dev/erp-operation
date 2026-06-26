"use client";

/**
 * UserFormDrawer — create / edit a team member (OWNER only).
 *
 * On create, the backend returns a one-time `temporaryPassword` which is shown
 * once in a copyable confirmation and never logged/persisted.
 */
import { useEffect, useState } from "react";
import { Loader2, Copy, Check, KeyRound } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { usersApi, ApiClientError, type Role, type TeamUser, type UserPermissions } from "@erp/api";
import { ROLE_LABEL, ROLES, PERMISSION_KEYS, PERMISSION_LABEL } from "@platform/user-display";

type FormState = {
  name: string;
  email: string;
  username: string;
  role: Role;
  phone: string;
  jobTitle: string;
  notes: string;
  permissions: UserPermissions;
};

const EMPTY_PERMS: UserPermissions = {
  canFinancial: false,
  canUsers: false,
  canReports: false,
  canSchedules: false,
  canTemplates: false,
};

function fromUser(u: TeamUser | null): FormState {
  return {
    name: u?.name ?? "",
    email: u?.email ?? "",
    username: u?.username ?? "",
    role: u?.role ?? "OPERATOR",
    phone: u?.phone ?? "",
    jobTitle: u?.jobTitle ?? "",
    notes: u?.notes ?? "",
    permissions: u?.permission ?? EMPTY_PERMS,
  };
}

export function UserFormDrawer({
  open,
  onClose,
  onSaved,
  user = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: TeamUser | null;
}) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState<FormState>(fromUser(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(fromUser(user));
      setError(null);
      setFieldError(null);
      setTempPassword(null);
      setCopied(false);
    }
  }, [open, user]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // OWNER role has all permission flags effectively true.
  const ownerLocked = form.role === "OWNER";

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
      setError("Nome, e-mail e usuário são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldError(null);
    try {
      if (isEdit && user) {
        await usersApi.updateUser(user.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          notes: form.notes.trim() || undefined,
          permissions: form.permissions,
        });
        onSaved();
        onClose();
      } else {
        const result = await usersApi.createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          notes: form.notes.trim() || undefined,
          permissions: form.permissions,
        });
        onSaved();
        setTempPassword(result.temporaryPassword); // shown once
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "USER_CONFLICT") {
        setFieldError("E-mail ou usuário já cadastrado.");
      } else if (err instanceof ApiClientError && err.code === "USER_LAST_OWNER") {
        setError("É necessário manter ao menos um proprietário ativo.");
      } else if (err instanceof ApiClientError && err.isForbidden) {
        setError("Você não tem permissão para esta ação.");
      } else {
        setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
      }
    } finally {
      setSaving(false);
    }
  }

  function copyPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Success view: show the one-time temporary password.
  if (tempPassword) {
    return (
      <Drawer open={open} onClose={onClose} eyebrow="Usuários" title="Usuário criado">
        <div className="space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]">
            Usuário criado com sucesso. Copie a senha temporária — ela não será exibida novamente.
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex items-center gap-2 text-caption uppercase tracking-wider mb-2">
              <KeyRound className="h-3.5 w-3.5" /> Senha temporária
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm break-all rounded bg-[var(--color-muted)] px-3 py-2">{tempPassword}</code>
              <button type="button" onClick={copyPassword} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
                {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
              O usuário deverá trocar a senha no primeiro acesso (troca obrigatória).
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-10 text-sm font-medium">
            Concluir
          </button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Usuários"
      title={isEdit ? "Editar usuário" : "Novo usuário"}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar usuário"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>
        )}

        <Field label="Nome completo" required>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Nome do colaborador" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail" required error={fieldError ?? undefined}>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="email@empresa.com.br" />
          </Field>
          <Field label="Usuário" required>
            <input value={form.username} onChange={(e) => set("username", e.target.value)} className={inputCls} placeholder="usuario" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Cargo">
            <input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className={inputCls} placeholder="Ex.: Técnico" />
          </Field>
        </div>

        <Field label="Papel">
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("role", r)}
                className={`rounded-[var(--radius-md)] border px-3 h-9 text-sm transition ${
                  form.role === r ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Permissões">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {PERMISSION_KEYS.map((k) => {
              const checked = ownerLocked || form.permissions[k];
              return (
                <label key={k} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm cursor-pointer">
                  <span>{PERMISSION_LABEL[k]}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={ownerLocked}
                    onChange={(e) => set("permissions", { ...form.permissions, [k]: e.target.checked })}
                    className="accent-[var(--color-primary)] disabled:opacity-50"
                  />
                </label>
              );
            })}
          </div>
          {ownerLocked && <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">Proprietários têm todas as permissões.</p>}
        </Field>

        <Field label="Observações">
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} h-auto py-2 resize-none`} />
        </Field>
      </div>
    </Drawer>
  );
}

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label} {required && <span className="text-[var(--color-danger)]">*</span>}</span>
      {children}
      {error && <span className="block text-[11px] text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}
