"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  /** A native install prompt is available (Chromium). */
  canInstall: boolean;
  /** Running as an installed PWA. */
  isStandalone: boolean;
  /** iOS Safari (no beforeinstallprompt; needs manual Add to Home Screen). */
  isIOS: boolean;
  /** Trigger the native prompt; resolves to true when accepted. */
  promptInstall: () => Promise<boolean>;
};

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(standalone));

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsStandalone(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === "accepted";
  }

  return { canInstall: deferred !== null, isStandalone, isIOS, promptInstall };
}
