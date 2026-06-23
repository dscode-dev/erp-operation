import type { ReactNode } from "react";
import { OperatorBottomNav } from "@/components/operator/bottom-nav";

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] max-w-[640px] mx-auto">
      <main className="flex-1 pb-24 animate-fade-in">{children}</main>
      <OperatorBottomNav />
    </div>
  );
}
