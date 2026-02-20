import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchSymbolExchangeInfo,
  fetchExchangeInfo,
  fetchFullTicker24h,
  fetchUiKlines,
  fetchDepthSnapshot,
  fetchAggTrades,
  fetchAvgPrice,
  fetchBookTicker,
  normalizeUiKlinesToFullCandles,
  extractFilters,
} from "@/lib/binanceMarket";

// ── Query schema ──────────────────────────────────────────────────────

const VALID_INTERVALS = [
  "1s","1m","3m","5m","15m","30m",
  "1h","2h","4h","6h","8h","12h",
  "1d","3d","1w","1M",
] as const;

const QuerySchema = z.object({
  symbol: z.string().min(1).toUpperCase(),
  interval: z.enum(VALID_INTERVALS).optional().default("1h"),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  depthLimit: z.coerce.number().int().min(1).max(5000).default(100),
  tradesLimit: z.coerce.number().int().min(1).max(1000).default(200),
});

// ── GET handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { symbol, interval, limit, depthLimit, tradesLimit } = parsed.data;

  // 1. Validate symbol + get full info (includes filters and precision)
  let symInfo;
  try {
    symInfo = await fetchSymbolExchangeInfo(symbol);
  } catch {
    symInfo = null;
  }

  if (!symInfo || symInfo.status !== "TRADING") {
    return NextResponse.json(
      { error: "Symbol not found or not actively trading", symbol },
      { status: 404 },
    );
  }

  const { baseAsset, quoteAsset } = symInfo;
  const filters = extractFilters(symInfo);

  const precision = {
    baseAssetPrecision: symInfo.baseAssetPrecision ?? 8,
    quoteAssetPrecision: symInfo.quoteAssetPrecision ?? 8,
    tickSize: filters.tickSize,
    stepSize: filters.stepSize,
    minNotional: filters.minNotional,
  };

  // 2. Fetch all data in parallel; each failure degrades gracefully
  const [tickerResult, klinesResult, depthResult, tradesResult, avgPriceResult, bookTickerResult, exchangeInfoResult] =
    await Promise.allSettled([
      fetchFullTicker24h(symbol),
      fetchUiKlines(symbol, interval, limit),
      fetchDepthSnapshot(symbol, depthLimit),
      fetchAggTrades(symbol, tradesLimit),
      fetchAvgPrice(symbol),
      fetchBookTicker(symbol),
      fetchExchangeInfo(),
    ]);

  // 3. Process results
  const ticker = tickerResult.status === "fulfilled" ? tickerResult.value : null;
  const rawKlines = klinesResult.status === "fulfilled" ? klinesResult.value : [];
  const depth = depthResult.status === "fulfilled" ? depthResult.value : null;
  const aggTrades = tradesResult.status === "fulfilled" ? tradesResult.value : [];
  const avgPriceRaw = avgPriceResult.status === "fulfilled" ? avgPriceResult.value : null;
  const bookTickerRaw = bookTickerResult.status === "fulfilled" ? bookTickerResult.value : null;
  const exchangeInfo = exchangeInfoResult.status === "fulfilled" ? exchangeInfoResult.value : null;

  if (!ticker) {
    return NextResponse.json(
      { error: "Failed to fetch market data from Binance", symbol },
      { status: 502 },
    );
  }

  // 4. Normalize
  const candles = normalizeUiKlinesToFullCandles(rawKlines);

  const stats24h = {
    lastPrice: Number(ticker.lastPrice),
    openPrice: Number(ticker.openPrice),
    highPrice: Number(ticker.highPrice),
    lowPrice: Number(ticker.lowPrice),
    volume: Number(ticker.volume),
    quoteVolume: Number(ticker.quoteVolume),
    priceChange: Number(ticker.priceChange),
    priceChangePercent: Number(ticker.priceChangePercent),
    weightedAvgPrice: Number(ticker.weightedAvgPrice),
    prevClosePrice: Number(ticker.prevClosePrice),
    count: ticker.count,
  };

  const avgPrice = avgPriceRaw
    ? {
        mins: avgPriceRaw.mins,
        price: Number(avgPriceRaw.price),
        closeTime: avgPriceRaw.closeTime,
      }
    : null;

  const bookTicker = bookTickerRaw
    ? {
        bidPrice: Number(bookTickerRaw.bidPrice),
        bidQty: Number(bookTickerRaw.bidQty),
        askPrice: Number(bookTickerRaw.askPrice),
        askQty: Number(bookTickerRaw.askQty),
      }
    : null;

  const depthNormalized = depth
    ? {
        lastUpdateId: depth.lastUpdateId,
        bids: depth.bids.map(([p, q]) => [Number(p), Number(q)] as [number, number]),
        asks: depth.asks.map(([p, q]) => [Number(p), Number(q)] as [number, number]),
      }
    : { lastUpdateId: 0, bids: [], asks: [] };

  // 5. Binance pairs sharing the same baseAsset
  let binancePairsSameBase: Array<{ symbol: string; quoteAsset: string }> = [];
  if (exchangeInfo) {
    binancePairsSameBase = exchangeInfo.symbols
      .filter((s) => s.status === "TRADING" && s.baseAsset === baseAsset)
      .map((s) => ({ symbol: s.symbol, quoteAsset: s.quoteAsset }))
      .sort((a, b) => a.quoteAsset.localeCompare(b.quoteAsset) || a.symbol.localeCompare(b.symbol));
  }

  return NextResponse.json({
    symbol,
    baseAsset,
    quoteAsset,
    precision,
    stats24h,
    avgPrice,
    bookTicker,
    candles,
    depth: depthNormalized,
    aggTrades,
    binancePairsSameBase,
  });
}
