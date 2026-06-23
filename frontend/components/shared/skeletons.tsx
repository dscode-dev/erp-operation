export function SkeletonLine({ w = "100%" }: { w?: string }) {
  return <div className="skeleton h-3" style={{ width: w }} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3 shadow-[var(--shadow-card)]">
      <SkeletonLine w="40%" />
      <SkeletonLine w="70%" />
      <SkeletonLine w="55%" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
