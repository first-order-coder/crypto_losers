import { formatCompact } from "@/lib/number";

interface YellowStatStripProps {
  loserCount: number;
  totalQuoteVolume: number;
  updatedAt: string; // ISO timestamp
}

export function YellowStatStrip({
  loserCount,
  totalQuoteVolume,
  updatedAt,
}: YellowStatStripProps) {
  // Format to short UTC time: "14:32 UTC"
  const d = new Date(updatedAt);
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return (
    <div className="ink-border-2 bg-yellow-300 py-3 px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-bold uppercase tracking-wider text-black">
      <span className="tabular-nums">{loserCount} Losers</span>
      <span className="text-yellow-700/60" aria-hidden>
        /
      </span>
      <span className="tabular-nums">${formatCompact(totalQuoteVolume)} Volume</span>
      <span className="text-yellow-700/60" aria-hidden>
        /
      </span>
      <span className="tabular-nums">Updated {time} UTC</span>
    </div>
  );
}
