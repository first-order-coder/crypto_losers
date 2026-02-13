import { z } from "zod";
import { fetch24hTickers } from "@/lib/binance";

// ── Shared schema for losers query params ───────────────────────────
// This schema works for JSON bodies (booleans) — the route-level schema
// can wrap/transform from query-string types as needed.
export const LosersParamsSchema = z.object({
  quote: z
    .string()
    .toUpperCase()
    .default("USDT"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  minQuoteVolume: z.coerce
    .number()
    .min(0)
    .default(1_000_000),
  excludeLeveraged: z
    .boolean()
    .default(true),
});

export type LosersParams = z.infer<typeof LosersParamsSchema>;

// Leveraged-token suffixes to exclude
const LEVERAGED_SUFFIXES = ["UP", "DOWN", "BULL", "BEAR"];

export interface Loser {
  symbol: string;
  lastPrice: number;
  changePct24h: number;
  quoteVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
}

/**
 * Return ALL filtered + sorted losers without any limit.
 * Used by /api/losers for cursor-based paging.
 */
export async function computeAllFilteredLosers(params: {
  quote: string;
  minQuoteVolume: number;
  excludeLeveraged: boolean;
}): Promise<Loser[]> {
  const { quote, minQuoteVolume, excludeLeveraged } = params;
  const tickers = await fetch24hTickers();

  return tickers
    .filter((t) => t.symbol.endsWith(quote))
    .filter((t) => Number(t.quoteVolume) >= minQuoteVolume)
    .filter((t) => {
      if (!excludeLeveraged) return true;
      const base = t.symbol.slice(0, -quote.length);
      return !LEVERAGED_SUFFIXES.some((s) => base.endsWith(s));
    })
    .sort(
      (a, b) =>
        Number(a.priceChangePercent) - Number(b.priceChangePercent)
    )
    .map((t) => ({
      symbol: t.symbol,
      lastPrice: Number(t.lastPrice),
      changePct24h: Number(t.priceChangePercent),
      quoteVolume24h: Number(t.quoteVolume),
      highPrice24h: Number(t.highPrice),
      lowPrice24h: Number(t.lowPrice),
    }));
}

/**
 * Compute the top losers from Binance 24h ticker data.
 * Shared between server components and /api/email-losers.
 */
export async function computeLosers(params: LosersParams): Promise<Loser[]> {
  const all = await computeAllFilteredLosers(params);
  return all.slice(0, params.limit);
}
