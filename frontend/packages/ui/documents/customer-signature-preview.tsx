"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { documentsApi, useQuery } from "@erp/api";
import { ErrorState } from "@erp/ui/states";

export function CustomerSignaturePreview({ documentId, name }: { documentId: string; name: string }) {
  const image = useQuery((signal) => documentsApi.getCustomerSignatureImage(documentId, { signal }), [documentId]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image.data?.blob) return;
    const objectUrl = URL.createObjectURL(image.data.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image.data]);

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Assinatura do cliente coletada</h3>
      <div className="grid min-h-28 place-items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3">
        {url ? (
          <Image unoptimized src={url} width={320} height={96} alt={`Assinatura de ${name}`} className="max-h-24 max-w-full object-contain" />
        ) : image.error ? (
          <ErrorState error={image.error} onRetry={image.refetch} />
        ) : (
          <span className="text-caption">Carregando assinatura…</span>
        )}
      </div>
    </section>
  );
}
