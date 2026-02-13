import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { LosersTable } from "@/components/LosersTable";
import { computeLosers } from "@/lib/losers";
import { formatPrice, formatPct } from "@/lib/number";

export async function DashboardContent() {
  const losers = await computeLosers({
    quote: "USDT",
    limit: 50,
    minQuoteVolume: 1_000_000,
    excludeLeveraged: true,
  });

  // Compute KPI values from live data
  const count = losers.length;
  const worst = losers[0]; // already sorted ascending by change
  const totalLoss = losers.reduce(
    (sum, l) => sum + (l.changePct24h < 0 ? l.changePct24h : 0),
    0
  );
  const avgChange =
    count > 0
      ? losers.reduce((sum, l) => sum + l.changePct24h, 0) / count
      : 0;

  return (
    <>
      {/* KPI Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Biggest Loser"
          value={worst ? worst.symbol.replace("USDT", "") : "—"}
          subtext={worst ? formatPct(worst.changePct24h) : undefined}
        />
        <KpiCard
          label="Worst 24h Drop"
          value={worst ? `$${formatPrice(worst.lastPrice)}` : "—"}
          subtext={worst ? worst.symbol : undefined}
        />
        <KpiCard
          label="Losers Tracked"
          value={String(count)}
          subtext="USDT pairs > $1M vol"
        />
        <KpiCard
          label="Avg 24h Change"
          value={formatPct(avgChange)}
          subtext={`Sum: ${formatPct(totalLoss)}`}
        />
      </div>

      {/* Losers Table */}
      <SectionCard title="Top Losers — Binance Spot (24h)">
        <LosersTable losers={losers} />
      </SectionCard>
    </>
  );
}
