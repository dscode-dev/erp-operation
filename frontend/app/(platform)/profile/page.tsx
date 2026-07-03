"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Camera, Loader2, Trash2, KeyRound, Check, ShieldCheck, Building2 } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { StatusChip } from "@erp/ui/status-chip";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { usersApi, ApiClientError, type UserTheme } from "@erp/api";
import { initials } from "@erp/utils";
import { ROLE_LABEL, ROLE_TONE, PERMISSION_KEYS, PERMISSION_LABEL } from "@platform/user-display";

const THEME_OPTIONS: { value: UserTheme; label: string }[] = [
  { value: "SYSTEM", label: "Sistema" },
  { value: "LIGHT", label: "Claro" },
  { value: "DARK", label: "Escuro" },
];

export default function ProfilePage() {
  const { session, refresh } = useAuth();

  if (!session) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando perfil…
      </div>
    );
  }

  const { user, organization, permissions } = session;
  const activePerms = PERMISSION_KEYS.filter((k) => permissions[k]);

  return (
    <div className="space-y-6 max-w-[1100px]">
      <PageHeader eyebrow="Sistema" title="Meu perfil" description="Seus dados, avatar, senha e preferências." />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <AvatarCard
            name={user.name}
            avatarAssetId={user.avatarAssetId}
            onChanged={refresh}
          />

          <SectionCard title="Identidade" icon={ShieldCheck}>
            <Row label="Nome" value={user.name} />
            <Row label="E-mail" value={user.email} />
            <Row label="Usuário" value={user.username} />
            <Row label="Papel" value={<StatusChip tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</StatusChip>} />
          </SectionCard>

          <SectionCard title="Organização" icon={Building2}>
            <Row label="Empresa" value={organization.tradeName || organization.legalName} />
            {organization.segment && <Row label="Segmento" value={organization.segment} />}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Permissões">
            {activePerms.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Sem permissões administrativas adicionais.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activePerms.map((k) => <StatusChip key={k} tone="primary">{PERMISSION_LABEL[k]}</StatusChip>)}
              </div>
            )}
          </SectionCard>

          <PreferencesCard
            theme={session.preferences?.theme ?? "SYSTEM"}
            notifications={session.preferences?.notificationsEnabled ?? true}
            onSaved={refresh}
          />

          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}

function AvatarCard({ name, avatarAssetId, onChanged }: { name: string; avatarAssetId: string | null; onChanged: () => Promise<void> }) {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSrc(null);
    if (!avatarAssetId) return;
    let active = true;
    usersApi.getAvatar(avatarAssetId).then((a) => { if (active) setSrc(`data:${a.mimeType};base64,${a.contentBase64}`); }).catch(() => {});
    return () => { active = false; };
  }, [avatarAssetId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Máximo de 2 MiB."); return; }
    setBusy(true); setError(null);
    try {
      await usersApi.uploadAvatar(file);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha no upload.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onDelete() {
    setBusy(true); setError(null);
    try {
      await usersApi.deleteAvatar();
      await onChanged();
    } catch {
      setError("Falha ao remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Avatar">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-24 w-24 rounded-full bg-[var(--color-accent)] grid place-items-center text-white text-2xl font-semibold overflow-hidden">
          {src ? <Image src={src} alt={name} fill sizes="96px" unoptimized className="object-cover" /> : initials(name)}
          {busy && <div className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
        </div>
        {error && <p className="text-[11px] text-[var(--color-danger)]">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50">
            <Camera className="h-4 w-4" /> Enviar
          </button>
          {avatarAssetId && (
            <button type="button" onClick={onDelete} disabled={busy} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={onFile} className="hidden" aria-label="Enviar avatar" />
        <p className="text-[11px] text-[var(--color-muted-foreground)]">PNG ou JPG, até 2 MiB.</p>
      </div>
    </SectionCard>
  );
}

function PreferencesCard({ theme, notifications, onSaved }: { theme: UserTheme; notifications: boolean; onSaved: () => Promise<void> }) {
  const { setTheme } = useTheme();
  const [localTheme, setLocalTheme] = useState<UserTheme>(theme);
  const [notif, setNotif] = useState(notifications);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function persist(next: { theme?: UserTheme; notificationsEnabled?: boolean }) {
    setSaving(true); setSaved(false);
    try {
      await usersApi.updatePreferences(next);
      await onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  function changeTheme(value: UserTheme) {
    setLocalTheme(value);
    setTheme(value.toLowerCase()); // sync next-themes
    persist({ theme: value });
  }

  function toggleNotif() {
    const next = !notif;
    setNotif(next);
    persist({ notificationsEnabled: next });
  }

  return (
    <SectionCard title="Preferências" action={saving ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" /> : saved ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : null}>
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">Tema</div>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => changeTheme(o.value)} className={`rounded-[var(--radius-md)] border px-3 h-9 text-sm transition ${localTheme === o.value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`}>{o.label}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <div className="text-sm font-medium">Notificações</div>
            <p className="text-caption">Preferência armazenada (entrega ainda não disponível).</p>
          </div>
          <input type="checkbox" checked={notif} onChange={toggleNotif} className="accent-[var(--color-primary)] h-4 w-4" />
        </label>
      </div>
    </SectionCard>
  );
}

function ChangePasswordCard() {
  const { logout } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = current && next.length >= 12 && next === confirm && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true); setError(null);
    try {
      await usersApi.changePassword({ currentPassword: current, newPassword: next });
      await logout();
      router.replace("/login");
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : "";
      setError(
        code === "PASSWORD_CURRENT_INVALID" ? "Senha atual incorreta." :
        code === "PASSWORD_REUSE_NOT_ALLOWED" ? "A nova senha deve ser diferente da atual." :
        code === "VALIDATION_ERROR" ? "A nova senha precisa ter ao menos 12 caracteres." :
        "Não foi possível alterar a senha.",
      );
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Segurança" icon={KeyRound}>
      <form onSubmit={onSubmit} className="space-y-3">
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        <Input label="Senha atual" value={current} onChange={setCurrent} />
        <Input label="Nova senha (mín. 12)" value={next} onChange={setNext} />
        <Input label="Confirmar nova senha" value={confirm} onChange={setConfirm} />
        <p className="text-[11px] text-[var(--color-muted-foreground)]">Ao alterar a senha, todas as sessões serão encerradas e será necessário entrar novamente.</p>
        <button type="submit" disabled={!canSubmit} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Alterar senha
        </button>
      </form>
    </SectionCard>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]" />
    </label>
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
