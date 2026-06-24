"use client";

// Dependency-free inline-SVG charts tuned to the KPLC palette. Kept tiny and
// self-contained so the admin dashboard needs no charting library.

const NAVY = "#0b2e63";
const BLUE = "#0b66ff";

/** Smooth area + line trend chart with point markers and a baseline grid. */
export function TrendChart({
  data, height = 180, suffix = "%",
}: { data: { label: string; value: number }[]; height?: number; suffix?: string }) {
  if (data.length === 0) return <Empty height={height} />;
  const W = 640, H = height, padX = 28, padY = 22;
  const max = Math.max(100, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => padY + (H - padY * 2) * (1 - (v - min) / span);
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${H - padY} L${pts[0][0]},${H - padY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.22" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={4} y={y(g) + 3} fontSize="9" fill="#94a3b8">{g}</text>
        </g>
      ))}
      <path d={area} fill="url(#trendFill)" />
      <path d={line} fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={NAVY} strokeWidth="2" />
          <text x={p[0]} y={p[1] - 9} fontSize="9.5" fontWeight="700" fill={NAVY} textAnchor="middle">{data[i].value}{suffix}</text>
          <text x={p[0]} y={H - 6} fontSize="9" fill="#64748b" textAnchor="middle">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Vertical bars (e.g. Mon–Fri pattern), colour-coded by value band. */
export function MiniBars({ data, height = 150 }: { data: { label: string; value: number }[]; height?: number }) {
  if (data.length === 0) return <Empty height={height} />;
  const W = 360, H = height, padY = 22, gap = 14;
  const bw = (W - gap * (data.length + 1)) / data.length;
  const color = (v: number) => (v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      {data.map((d, i) => {
        const h = ((H - padY * 2) * Math.min(100, d.value)) / 100;
        const xx = gap + i * (bw + gap);
        const yy = H - padY - h;
        return (
          <g key={d.label}>
            <rect x={xx} y={padY} width={bw} height={H - padY * 2} rx="4" fill="#f1f5f9" />
            <rect x={xx} y={yy} width={bw} height={h} rx="4" fill={color(d.value)} />
            <text x={xx + bw / 2} y={yy - 5} fontSize="10" fontWeight="700" fill={NAVY} textAnchor="middle">{d.value}%</text>
            <text x={xx + bw / 2} y={H - 6} fontSize="9.5" fill="#64748b" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Donut for the 3-band risk distribution. */
export function Donut({ segments, size = 150 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2, stroke = 18, rad = r - stroke / 2, C = 2 * Math.PI * rad;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="shrink-0">
        <circle cx={r} cy={r} r={rad} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <circle key={i} cx={r} cy={r} r={rad} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${r} ${r})`} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
        <text x={r} y={r - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill={NAVY}>{total}</text>
        <text x={r} y={r + 16} textAnchor="middle" fontSize="9" fill="#94a3b8">students</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="ml-auto font-bold tabular-nums text-slate-800">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ height }: { height: number }) {
  return <div style={{ height }} className="flex items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">No data for this range</div>;
}
