"use client";

/**
 * InstallButton — "Instalar App" for the Operator PWA.
 *
 * - Chromium: triggers the native install prompt.
 * - iOS Safari: shows the manual "Adicionar à Tela de Início" instructions.
 * - Already installed: shows a confirmation chip.
 */
import { useState } from "react";
import { Download, CheckCircle2, Share, Plus } from "lucide-react";
import { useInstallPrompt } from "./use-install-prompt";

export function InstallButton() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [showIos, setShowIos] = useState(false);

  if (isStandalone) {
    return (
      <div className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-success)]/12 text-[var(--color-success)] px-3 h-10 text-sm font-medium w-full justify-center">
        <CheckCircle2 className="h-4 w-4" /> App instalado
      </div>
    );
  }

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={() => promptInstall()}
        className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-11 text-sm font-semibold active:scale-[0.99]"
      >
        <Download className="h-4 w-4" /> Instalar App
      </button>
    );
  }

  // iOS / browsers without beforeinstallprompt → manual instructions.
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowIos((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-11 text-sm font-medium hover:bg-[var(--color-muted)]"
      >
        <Download className="h-4 w-4" /> Instalar App
      </button>
      {showIos && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-sm text-[var(--color-muted-foreground)] space-y-1.5">
          <p className="font-medium text-[var(--color-foreground)]">{isIOS ? "No iPhone/iPad (Safari):" : "Pelo navegador:"}</p>
          <p className="inline-flex items-center gap-1.5">1. Toque em <Share className="h-4 w-4" /> Compartilhar</p>
          <p className="inline-flex items-center gap-1.5">2. Escolha <Plus className="h-4 w-4" /> Adicionar à Tela de Início</p>
          <p>3. Confirme — o ERP Operador abrirá como app.</p>
        </div>
      )}
    </div>
  );
}
