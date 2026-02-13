"use client";

import { LoserCard } from "@/components/LoserCard";
import type { LoserRow } from "@/components/LosersTable";

interface LosersGridProps {
  losers: LoserRow[];
}

export function LosersGrid({ losers }: LosersGridProps) {
  if (losers.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No losers match your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {losers.map((l, i) => (
        <LoserCard key={l.symbol} {...l} rank={i + 1} />
      ))}
    </div>
  );
}
