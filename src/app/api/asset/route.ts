import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { fetchCoin, fetchTickers, type CoinDetail } from "@/lib/coingecko";
import {
  fetchExchangeInfo,
  fetchTicker24h,
  fetchKlines,
  getSymbolMeta,
  normalizeKlinesToCandles,
  type Candle,
} from "@/lib/binanceMarket";
import { computeAthFromBinanceDaily } from "@/lib/ath";

// ── Query-param schema ──────────────────────────────────────────────

const INTERVAL_VALUES = ["15m", "1h", "4h", "1d"] as const;

const QuerySchema = z.object({
  symbol: z.string().min(1, "symbol is required").toUpperCase(),
  interval: z
    .enum(INTERVAL_VALUES)
    .optional()
    .default("1h"),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
  includeAth: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  includeBinancePairs: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  includeCoinInfo: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  includeExternalTickers: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  vsCurrency: z.string().default("usd").transform((v) => v.toLowerCase()),
  tickersLimit: z.coerce.number().int().min(1).max(50).default(25),
});

// ── Types ───────────────────────────────────────────────────────────

interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

type MappingConfidence = "high" | "medium" | "low";

// ── Helpers ─────────────────────────────────────────────────────────

async function searchCoinGecko(query: string): Promise<CoinGeckoSearchResult[]> {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.coins ?? []) as CoinGeckoSearchResult[];
}

function computeConfidence(
  baseAsset: string,
  result: CoinGeckoSearchResult
): MappingConfidence {
  const baseLower = baseAsset.toLowerCase();
  const symbolMatch = result.symbol.toLowerCase() === baseLower;
  const nameIncludesBase = result.name.toLowerCase().includes(baseLower);

  if (symbolMatch && nameIncludesBase) return "high";
  if (symbolMatch) return "medium";
  return "low";
}

function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
  });
}

function extractFromCoin(
  detail: CoinDetail,
  vsCurrency: string
): {
  homepage: string | null;
  athGlobal: {
    price: number | null;
    dateIso: string | null;
    vsCurrency: string;
  } | null;
  marketCap: number | null;
  currentPrice: number | null;
} {
  const md = detail.market_data;
  const cc = vsCurrency.toLowerCase();
  return {
    homepage:
      detail.links?.homepage?.[0] && detail.links.homepage[0].length > 0
        ? detail.links.homepage[0]
        : detail.links?.homepage?.find((h) => h && h.length > 0) ?? null,
    athGlobal: md?.ath
      ? {
          price: md.ath[cc] ?? md.ath.usd ?? null,
          dateIso: md.ath_date?.[cc] ?? md.ath_date?.usd ?? null,
          vsCurrency: cc,
        }
      : null,
    marketCap: md?.market_cap?.[cc] ?? md?.market_cap?.usd ?? null,
    currentPrice: md?.current_price?.[cc] ?? md?.current_price?.usd ?? null,
  };
}

// ── GET handler ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    symbol,
    interval,
    limit,
    includeAth,
    includeBinancePairs,
    includeCoinInfo,
    includeExternalTickers,
    vsCurrency,
    tickersLimit,
  } = parsed.data;

  // 1. Resolve base/quote via Binance exchangeInfo
  const meta = await getSymbolMeta(symbol);

  if (!meta) {
    return NextResponse.json(
      {
        error: "Symbol not found",
        detail: `"${symbol}" is not an active trading pair on Binance`,
      },
      { status: 400 },
    );
  }

  const { baseAsset, quoteAsset } = meta;

  try {
    // 2. Fetch Binance 24h ticker
    const ticker = await fetchTicker24h(symbol);

    const binance24h = {
      lastPrice: Number(ticker.lastPrice),
      changePct24h: Number(ticker.priceChangePercent),
      quoteVolume24h: Number(ticker.quoteVolume),
      highPrice24h: Number(ticker.highPrice),
      lowPrice24h: Number(ticker.lowPrice),
    };

    // 3. Fetch klines for candlestick chart
    let candles: Candle[] = [];
    try {
      const rawKlines = await fetchKlines(symbol, interval, limit);
      candles = normalizeKlinesToCandles(rawKlines);
    } catch {
      candles = [];
    }

    // 4. Compute ATH from Binance daily klines (cached)
    let athBinance: {
      price: number;
      time: number;
      scannedDays: number;
    } | null = null;

    if (includeAth) {
      const athResult = await computeAthFromBinanceDaily(symbol);
      if (athResult.ath != null && athResult.athTime != null) {
        athBinance = {
          price: athResult.ath,
          time: athResult.athTime,
          scannedDays: athResult.scannedDays,
        };
      }
    }

    // 5. Binance pairs (all TRADING pairs sharing same baseAsset)
    let binancePairs: Array<{ symbol: string; quoteAsset: string }> = [];
    if (includeBinancePairs) {
      const info = await fetchExchangeInfo();
      binancePairs = info.symbols
        .filter(
          (s) => s.status === "TRADING" && s.baseAsset === baseAsset,
        )
        .map((s) => ({ symbol: s.symbol, quoteAsset: s.quoteAsset }))
        .sort((a, b) => {
          if (a.quoteAsset === b.quoteAsset) {
            return a.symbol.localeCompare(b.symbol);
          }
          return a.quoteAsset.localeCompare(b.quoteAsset);
        });
    }

    // 6. CoinGecko mapping + metadata + external tickers
    const searchResults = includeCoinInfo
      ? await searchCoinGecko(baseAsset)
      : [];

    let coin:
      | {
          id: string;
          name: string;
          symbol: string;
          imageUrl: string | null;
          descriptionHtml: string;
          homepage: string | null;
          athGlobal: {
            price: number | null;
            dateIso: string | null;
            vsCurrency: string;
          } | null;
          marketCap: number | null;
          currentPrice: number | null;
        }
      | null = null;

    let externalTickers: Array<{
      marketName: string;
      base: string;
      target: string;
      last: number | null;
      volume: number | null;
      tradeUrl: string | null;
    }> = [];

    let mappingConfidence: MappingConfidence = "low";

    if (searchResults.length > 0) {
      const scored = searchResults.map((r) => ({
        result: r,
        confidence: computeConfidence(baseAsset, r),
      }));

      const order: Record<MappingConfidence, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };

      scored.sort((a, b) => {
        const diff = order[a.confidence] - order[b.confidence];
        if (diff !== 0) return diff;
        return (
          (a.result.market_cap_rank ?? Infinity) -
          (b.result.market_cap_rank ?? Infinity)
        );
      });

      const best = scored[0];
      mappingConfidence = best.confidence;

      if (best.confidence !== "low") {
        const coinId = best.result.id;
        const detail = await fetchCoin(coinId);
        if (detail) {
          const rawDesc = detail.description?.en ?? "";
          const extracted = extractFromCoin(detail, vsCurrency);

          coin = {
            id: detail.id,
            name: detail.name,
            symbol: detail.symbol,
            imageUrl: detail.image?.small ?? null,
            descriptionHtml: sanitizeDescription(rawDesc),
            homepage: extracted.homepage,
            athGlobal: extracted.athGlobal,
            marketCap: extracted.marketCap,
            currentPrice: extracted.currentPrice,
          };

          if (includeExternalTickers) {
            const tickersRes = await fetchTickers(
              coinId,
              1,
              "volume_desc",
              tickersLimit,
            );
            if (tickersRes?.tickers?.length) {
              const normalized = tickersRes.tickers
                .map((t) => ({
                  marketName: t.market?.name ?? "Unknown",
                  base: t.base ?? "",
                  target: t.target ?? "",
                  last:
                    typeof t.last === "number"
                      ? t.last
                      : null,
                  volume:
                    typeof t.volume === "number"
                      ? t.volume
                      : null,
                  tradeUrl: t.trade_url ?? null,
                }))
                .filter((t) => t.base && t.target);

              normalized.sort((a, b) => {
                const va = a.volume ?? 0;
                const vb = b.volume ?? 0;
                return vb - va;
              });

              externalTickers = normalized.slice(0, tickersLimit);
            }
          }
        }
      }
    }

    const updatedAt = new Date().toISOString();

    // Backwards-compatible fields (existing contract) + new fields
    return NextResponse.json({
      // existing
      symbol,
      binance: binance24h,
      background: coin
        ? {
            name: coin.name,
            symbol: coin.symbol,
            imageUrl: coin.imageUrl,
            descriptionHtml: coin.descriptionHtml,
            homepage: coin.homepage,
            twitter: null,
          }
        : null,
      mappingConfidence,
      chart: candles.map((c) => ({ t: c.time * 1000, price: c.close })), // simple line chart data for legacy consumers
      listings: externalTickers.map((t) => ({
        marketName: t.marketName,
        base: t.base,
        target: t.target,
        last: t.last,
        volume: t.volume,
        tradeUrl: t.tradeUrl,
      })),
      ath: coin?.athGlobal?.price ?? null,
      athDate: coin?.athGlobal?.dateIso ?? null,
      atl: null,
      atlDate: null,
      marketCap: coin?.marketCap ?? null,

      // new extended payload
      baseAsset,
      quoteAsset,
      binance24h,
      chartDetail: {
        interval,
        candles,
      },
      athBinance,
      binancePairs,
      coin,
      externalTickers,
      updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch asset data", detail: message },
      { status: 502 },
    );
  }
}
