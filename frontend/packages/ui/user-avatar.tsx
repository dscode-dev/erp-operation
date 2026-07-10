"use client";

import { useEffect, useState } from "react";
import { usersApi } from "@erp/api";
import { cn, initials } from "@erp/utils";

export function UserAvatar({
  name,
  avatarAssetId,
  size = "md",
  className,
}: {
  name: string;
  avatarAssetId: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const sizeClass = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-14 w-14 text-lg",
    xl: "h-24 w-24 text-2xl",
  }[size];

  useEffect(() => {
    let active = true;
    setSrc(null);
    if (!avatarAssetId) return;
    usersApi.getAvatar(avatarAssetId)
      .then((avatar) => {
        if (active) setSrc(`data:${avatar.mimeType};base64,${avatar.contentBase64}`);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [avatarAssetId]);

  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-accent)] font-semibold text-white", sizeClass, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}
