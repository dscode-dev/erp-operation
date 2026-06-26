"use client";

/** Shared mandatory password-change screen, reused by both apps. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "./auth-provider";
import { usersApi, ApiClientError } from "@erp/api";

const ERROR_MESSAGES: Record<string, string> = {
  PASSWORD_CURRENT_INVALID: "A senha atual está incorreta.",
  PASSWORD_REUSE_NOT_ALLOWED: "A nova senha deve ser diferente da atual.",
  VALIDATION_ERROR: "A nova senha precisa ter entre 12 e 128 caracteres.",
};

export function ChangePasswordScreen({ variant }: { variant: "platform" | "operator" }) {
  const { status, logout } = useAuth();
  const router = useRouter();
  const loginPath = variant === "operator" ? "/operator/login" : "/login";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(loginPath);
  }, [status, router, loginPath]);

  const tooShort = newPassword.length > 0 && newPassword.length < 12;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 12 && confirm === newPassword && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      await logout();
      router.replace(loginPath);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : "UNKNOWN_ERROR";
      setError(ERROR_MESSAGES[code] ?? "Não foi possível alterar a senha.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-background)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--color-primary)]/10 grid place-items-center text-[var(--color-primary)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-page-title mt-4">Troca obrigatória de senha</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">Por segurança, defina uma nova senha antes de continuar.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] space-y-4">
          {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
          <PwInput label="Senha atual" value={currentPassword} onChange={setCurrentPassword} />
          <div>
            <PwInput label="Nova senha" value={newPassword} onChange={setNewPassword} />
            <p className={`mt-1 text-[11px] ${tooShort ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]"}`}>Mínimo de 12 caracteres.</p>
          </div>
          <div>
            <PwInput label="Confirmar nova senha" value={confirm} onChange={setConfirm} />
            {mismatch && <p className="mt-1 text-[11px] text-[var(--color-danger)]">As senhas não coincidem.</p>}
          </div>
          <button type="submit" disabled={!canSubmit} className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-11 text-sm font-semibold disabled:opacity-50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Alterar senha e entrar
          </button>
        </form>
      </div>
    </div>
  );
}

function PwInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="password" required autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••••••" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-11 text-sm outline-none focus:border-[var(--color-primary)]" />
    </label>
  );
}
