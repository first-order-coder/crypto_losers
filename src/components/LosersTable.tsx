"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice, formatPct, formatCompact, formatFull } from "@/lib/number";

export interface LoserRow {
  symbol: string;
  lastPrice: number;
  changePct24h: number;
  quoteVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
}

interface LosersTableProps {
  losers: LoserRow[];
}

export function LosersTable({ losers }: LosersTableProps) {
  return (
    <div className="ink-border-2 rounded-sm bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead className="text-left">Symbol</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">24h %</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="text-right">24h High</TableHead>
            <TableHead className="text-right">24h Low</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {losers.map((l, i) => {
            const isNegative = l.changePct24h < 0;
            return (
              <TableRow key={l.symbol}>
                <TableCell className="tabular-nums text-right text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell className="text-left font-medium">
                  <Link
                    href={`/asset/binance/${l.symbol}`}
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {l.symbol}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums text-right">
                  ${formatPrice(l.lastPrice)}
                </TableCell>
                <TableCell
                  className={`tabular-nums text-right font-medium ${
                    isNegative ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {formatPct(l.changePct24h)}
                </TableCell>
                <TableCell className="tabular-nums text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default border-b border-dashed border-muted-foreground/40">
                        ${formatCompact(l.quoteVolume24h)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      ${formatFull(l.quoteVolume24h)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="tabular-nums text-right">
                  ${formatPrice(l.highPrice24h)}
                </TableCell>
                <TableCell className="tabular-nums text-right">
                  ${formatPrice(l.lowPrice24h)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
