import type { ReactNode } from "react";
import { PlatformSidebar } from "@/components/platform/sidebar";
import { PlatformTopbar } from "@/components/platform/topbar";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex bg-[var(--color-background)] text-[var(--color-foreground)]">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PlatformTopbar />
        <main className="flex-1 p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
