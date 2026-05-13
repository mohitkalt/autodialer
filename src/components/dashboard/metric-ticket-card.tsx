"use client";

/**
 * Ticket-style metric tile (perforated edges + bold stat row). Theme-aware hole fill
 * must match the dashboard shell background so notches read as cutouts.
 */

export type MetricTicketTone = "teal" | "purple" | "amber";

export type MetricTicketTrend = "up" | "down" | "neutral";

export type MetricTicketCardProps = {
  label: string;
  value: string;
  /** Secondary stat (e.g. delta %); show "—" until wired to API. */
  change?: string;
  trend?: MetricTicketTrend;
  tone?: MetricTicketTone;
  /** Must match page surface behind the card (`bg-zinc-950` / `bg-zinc-100`). */
  holeSurfaceClassName: string;
};

const toneClass: Record<MetricTicketTone, string> = {
  teal: "bg-gradient-to-br from-teal-800 via-teal-900 to-teal-950",
  purple: "bg-gradient-to-br from-violet-900 via-purple-950 to-indigo-950",
  amber: "bg-gradient-to-br from-amber-700 via-amber-800 to-yellow-900",
};

const notchYs = ["28%", "48%", "68%"];

function TrendGlyph({ trend }: { trend: MetricTicketTrend }) {
  const common = "h-4 w-4 text-white";
  if (trend === "up") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 17L17 7M17 7H10M17 7V14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 7L17 17M17 17H10M17 17V10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export default function MetricTicketCard({
  label,
  value,
  change = "—",
  trend = "neutral",
  tone = "teal",
  holeSurfaceClassName,
}: MetricTicketCardProps) {
  return (
    <div className={`relative px-2 py-1 ${holeSurfaceClassName}`}>
      {(["left", "right"] as const).flatMap((side) =>
        notchYs.map((top, i) => (
          <span
            key={`${side}-${i}`}
            className={`pointer-events-none absolute z-0 size-[13px] rounded-full ${holeSurfaceClassName} ${
              side === "left" ? "-left-0.5" : "-right-0.5"
            }`}
            style={{ top, transform: "translateY(-50%)" }}
            aria-hidden
          />
        )),
      )}

      <div
        className={`relative z-10 flex min-h-[132px] flex-col rounded-2xl px-5 pb-5 pt-4 text-white shadow-lg ring-1 ring-black/10 ${toneClass[tone]}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="max-w-[72%] text-sm font-medium leading-snug text-white/95">{label}</p>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm"
            aria-hidden
          >
            <TrendGlyph trend={trend} />
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-6">
          <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
          <p className="text-sm font-medium tabular-nums text-white/90">{change}</p>
        </div>
      </div>
    </div>
  );
}
