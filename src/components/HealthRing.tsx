import { cn } from "@/lib/format";

/** Returns a color family based on a 0–100 score. */
export function scoreColor(score: number): { text: string; stroke: string; bg: string } {
  if (score >= 85) return { text: "text-emerald-300", stroke: "#34d399", bg: "bg-emerald-500/10" };
  if (score >= 65) return { text: "text-lime-300", stroke: "#a3e635", bg: "bg-lime-500/10" };
  if (score >= 40) return { text: "text-amber-300", stroke: "#fbbf24", bg: "bg-amber-500/10" };
  return { text: "text-rose-300", stroke: "#fb7185", bg: "bg-rose-500/10" };
}

export function HealthRing({
  score,
  size = 168,
  stroke = 12,
  label = "Catalog health",
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const c = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c1c22" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="animate-ring"
          style={{ ["--ring-circ" as string]: `${circ}px` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-4xl font-semibold tabular-nums", c.text)}>{score}</span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
    </div>
  );
}
