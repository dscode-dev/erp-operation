/**
 * BrandLogo — the client's institutional logo (Climatize).
 *
 * Served from /brand/logo.png (copied from docs/customer/assets). Uses a plain
 * <img> to avoid next/image remote config; the asset is local and small enough.
 */
export function BrandLogo({ className = "", height = 32, alt = "Climatize" }: { className?: string; height?: number; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo.png" alt={alt} height={height} style={{ height, width: "auto" }} className={className} />
  );
}
