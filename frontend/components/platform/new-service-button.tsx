"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewServiceSheet } from "./new-service-sheet";

export function NewServiceButton({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  const [open, setOpen] = useState(false);
  const base = "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 h-9 text-sm font-medium";
  const styles =
    variant === "primary"
      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]"
      : "border border-[var(--color-border)] hover:bg-[var(--color-muted)]";
  return (
    <>
      <button onClick={() => setOpen(true)} className={`${base} ${styles}`}>
        <Plus className="h-4 w-4" /> Novo serviço
      </button>
      <NewServiceSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
