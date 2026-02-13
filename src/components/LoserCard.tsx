"use client";

import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice, formatPct, formatCompact, formatFull } from "@/lib/number";
import type { LoserRow } from "@/components/LosersTable";

interface LoserCardProps extends LoserRow {
  rank: number;
}

export function LoserCard({
  symbol,
  lastPrice,
  changePct24h,
  quoteVolume24h,
  highPrice24h,
  lowPrice24h,
  rank,
}: LoserCardProps) {
  const isNegative = changePct24h < 0;

  return (
    <div className="ink-card rounded-sm flex flex-col cursor-pointer">
      {/* Header row: rank + symbol + change % */}
      <div className="flex items-baseline justify-between px-3 pt-3 pb-1">
        <div className="flex items-baseline gap-1.5">
          <span className="tabular-nums text-[10px] text-muted-foreground">
            {rank}.
          </span>
          <span className="text-sm font-bold uppercase tracking-tight">
            {symbol}
          </span>
        </div>
        <span
          className={`tabular-nums text-sm font-bold ${
            isNegative ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {formatPct(changePct24h)}
        </span>
      </div>

      {/* Price */}
      <div className="px-3 pb-2">
        <span className="tabular-nums text-lg font-bold tracking-tight">
          ${formatPrice(lastPrice)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-ink" />

      {/* Stats rows */}
      <div className="px-3 py-2 space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase tracking-wider">
            Vol
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="tabular-nums font-bold cursor-default border-b border-dashed border-muted-foreground/40">
                ${formatCompact(quoteVolume24h)}
              </span>
            </TooltipTrigger>
            <TooltipContent>${formatFull(quoteVolume24h)}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase tracking-wider">
            High
          </span>
          <span className="tabular-nums font-bold">
            ${formatPrice(highPrice24h)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground uppercase tracking-wider">
            Low
          </span>
          <span className="tabular-nums font-bold">
            ${formatPrice(lowPrice24h)}
          </span>
        </div>
      </div>

      {/* View link */}
      <Link
        href={`/asset/binance/${symbol}`}
        className="block border-t-2 border-ink py-1.5 text-center text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
      >
        View →
      </Link>
    </div>
  );
}
