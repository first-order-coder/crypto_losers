import { computeAllFilteredLosers } from "@/lib/losers";
import { DashboardClient } from "@/components/DashboardClient";

const PAGE_SIZE = 50;

export async function DashboardContent() {
  const all = await computeAllFilteredLosers({
    quote: "USDT",
    minQuoteVolume: 1_000_000,
    excludeLeveraged: true,
  });

  const firstPage = all.slice(0, PAGE_SIZE);
  const updatedAt = new Date().toISOString();

  return (
    <DashboardClient
      initialLosers={firstPage}
      initialUpdatedAt={updatedAt}
      initialTotal={all.length}
    />
  );
}
