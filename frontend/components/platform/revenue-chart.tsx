type Datum = { month: string; receita: number; despesa: number };

export function RevenueChart({ data }: { data: Datum[] }) {
  const W = 600;
  const H = 200;
  const padX = 32;
  const padY = 20;
  const max = Math.max(...data.flatMap((d) => [d.receita, d.despesa])) * 1.1;
  const stepX = (W - padX * 2) / (data.length - 1);

  const toPath = (key: "receita" | "despesa") =>
    data
      .map((d, i) => {
        const x = padX + i * stepX;
        const y = H - padY - (d[key] / max) * (H - padY * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const toArea = (key: "receita" | "despesa") => {
    const path = data
      .map((d, i) => {
        const x = padX + i * stepX;
        const y = H - padY - (d[key] / max) * (H - padY * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const last = padX + (data.length - 1) * stepX;
    return `${path} L${last.toFixed(1)},${H - padY} L${padX},${H - padY} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico de receita e despesa">
      {/* grid */}
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <line
          key={p}
          x1={padX}
          x2={W - padX}
          y1={H - padY - p * (H - padY * 2)}
          y2={H - padY - p * (H - padY * 2)}
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />
      ))}
      {/* areas */}
      <path d={toArea("receita")} fill="var(--color-primary)" opacity="0.12" />
      <path d={toArea("despesa")} fill="var(--color-danger)" opacity="0.08" />
      {/* lines */}
      <path d={toPath("receita")} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath("despesa")} fill="none" stroke="var(--color-danger)" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* dots */}
      {data.map((d, i) => {
        const x = padX + i * stepX;
        const yR = H - padY - (d.receita / max) * (H - padY * 2);
        return <circle key={i} cx={x} cy={yR} r={3} fill="var(--color-primary)" />;
      })}
      {/* labels */}
      {data.map((d, i) => (
        <text
          key={d.month}
          x={padX + i * stepX}
          y={H - 4}
          textAnchor="middle"
          fontSize="10"
          fill="var(--color-muted-foreground)"
        >
          {d.month}
        </text>
      ))}
    </svg>
  );
}
