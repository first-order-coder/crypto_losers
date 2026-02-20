const BASE_URL = "https://api.binance.com/api/v3";

const REVALIDATE_EXCHANGE_INFO = 60 * 60 * 6; // 6 hours
const REVALIDATE_TICKER_24H = 30;
const REVALIDATE_KLINES = 60;
const REVALIDATE_SHORT = 5;

// ── Interval type ─────────────────────────────────────────────────────

export type BinanceKlineInterval =
  | "1s" | "1m" | "3m" | "5m" | "15m" | "30m"
  | "1h" | "2h" | "4h" | "6h" | "8h" | "12h"
  | "1d" | "3d" | "1w" | "1M";

// ── ExchangeInfo types ────────────────────────────────────────────────

export interface ExchangeInfoSymbolFilter {
  filterType: string;
  tickSize?: string;
  stepSize?: string;
  minNotional?: string;
  minQty?: string;
  maxQty?: string;
  [key: string]: string | undefined;
}

export interface ExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision?: number;
  quoteAssetPrecision?: number;
  filters?: ExchangeInfoSymbolFilter[];
}

interface ExchangeInfoResponse {
  symbols: ExchangeInfoSymbol[];
}

export interface SymbolMeta {
  baseAsset: string;
  quoteAsset: string;
}

// ── Ticker types ──────────────────────────────────────────────────────

export interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

export interface FullTicker24h extends BinanceTicker24h {
  priceChange: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  volume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// ── Kline types ───────────────────────────────────────────────────────

export type RawKline = [
  number, // 0 openTime
  string, // 1 open
  string, // 2 high
  string, // 3 low
  string, // 4 close
  string, // 5 volume
  number, // 6 closeTime
  string, // 7 quoteAssetVolume
  number, // 8 numberOfTrades
  string, // 9 takerBuyBaseAssetVolume
  string, // 10 takerBuyQuoteAssetVolume
  string, // 11 ignore
];

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FullCandle extends Candle {
  quoteVolume: number;
  trades: number;
  takerBuyBase: number;
  takerBuyQuote: number;
  closeTime: number; // unix seconds
}

// ── Depth types ───────────────────────────────────────────────────────

export interface DepthSnapshot {
  lastUpdateId: number;
  bids: [string, string][]; // [price, qty]
  asks: [string, string][]; // [price, qty]
}

// ── AggTrade types ────────────────────────────────────────────────────

export interface RawAggTrade {
  a: number;  // Aggregate trade ID
  p: string;  // Price
  q: string;  // Quantity
  T: number;  // Trade time (ms)
  m: boolean; // Is buyer maker?
}

export interface AggTrade {
  id: number;
  price: number;
  qty: number;
  time: number; // ms
  isBuyerMaker: boolean;
}

// ── AvgPrice / BookTicker types ───────────────────────────────────────

export interface AvgPriceResponse {
  mins: number;
  price: string;
  closeTime: number;
}

export interface BookTickerResponse {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

// ── Fetch helpers ─────────────────────────────────────────────────────

export async function fetchExchangeInfo(): Promise<ExchangeInfoResponse> {
  const res = await fetch(`${BASE_URL}/exchangeInfo`, {
    next: { revalidate: REVALIDATE_EXCHANGE_INFO },
  });
  if (!res.ok) throw new Error(`Binance exchangeInfo error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<ExchangeInfoResponse>;
}

export async function fetchSymbolExchangeInfo(
  symbol: string,
): Promise<ExchangeInfoSymbol | null> {
  const url = `${BASE_URL}/exchangeInfo?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_EXCHANGE_INFO } });
  if (!res.ok) return null;
  const data = (await res.json()) as ExchangeInfoResponse;
  return data.symbols?.[0] ?? null;
}

export async function getSymbolMeta(symbol: string): Promise<SymbolMeta | null> {
  const info = await fetchExchangeInfo();
  const match = info.symbols.find((s) => s.symbol === symbol && s.status === "TRADING");
  if (!match) return null;
  return { baseAsset: match.baseAsset, quoteAsset: match.quoteAsset };
}

export async function fetchTicker24h(symbol: string): Promise<BinanceTicker24h> {
  const url = `${BASE_URL}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_TICKER_24H } });
  if (!res.ok) throw new Error(`Binance 24h ticker error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<BinanceTicker24h>;
}

export async function fetchFullTicker24h(symbol: string): Promise<FullTicker24h> {
  const url = `${BASE_URL}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_TICKER_24H } });
  if (!res.ok) throw new Error(`Binance 24h ticker error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<FullTicker24h>;
}

export async function fetchKlines(
  symbol: string,
  interval: "15m" | "1h" | "4h" | "1d",
  limit: number,
  startTime?: number,
  endTime?: number,
): Promise<RawKline[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(Math.min(Math.max(limit, 1), 1000)),
  });
  if (typeof startTime === "number") params.set("startTime", String(startTime));
  if (typeof endTime === "number") params.set("endTime", String(endTime));
  const url = `${BASE_URL}/klines?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_KLINES } });
  if (!res.ok) throw new Error(`Binance klines error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("Binance klines did not return an array");
  return data as RawKline[];
}

export async function fetchUiKlines(
  symbol: string,
  interval: BinanceKlineInterval,
  limit: number,
): Promise<RawKline[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(Math.min(Math.max(limit, 1), 1000)),
  });
  const url = `${BASE_URL}/uiKlines?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_KLINES } });
  if (!res.ok) throw new Error(`Binance uiKlines error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("Binance uiKlines did not return an array");
  return data as RawKline[];
}

export async function fetchDepthSnapshot(
  symbol: string,
  limit: number,
): Promise<DepthSnapshot> {
  const params = new URLSearchParams({
    symbol,
    limit: String(Math.min(Math.max(limit, 1), 5000)),
  });
  const url = `${BASE_URL}/depth?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SHORT } });
  if (!res.ok) throw new Error(`Binance depth error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<DepthSnapshot>;
}

export async function fetchAggTrades(
  symbol: string,
  limit: number,
): Promise<AggTrade[]> {
  const params = new URLSearchParams({
    symbol,
    limit: String(Math.min(Math.max(limit, 1), 1000)),
  });
  const url = `${BASE_URL}/aggTrades?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SHORT } });
  if (!res.ok) throw new Error(`Binance aggTrades error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as RawAggTrade[];
  return data.map((t) => ({
    id: t.a,
    price: Number(t.p),
    qty: Number(t.q),
    time: t.T,
    isBuyerMaker: t.m,
  }));
}

export async function fetchAvgPrice(symbol: string): Promise<AvgPriceResponse | null> {
  const url = `${BASE_URL}/avgPrice?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_TICKER_24H } });
  if (!res.ok) return null;
  return res.json() as Promise<AvgPriceResponse>;
}

export async function fetchBookTicker(symbol: string): Promise<BookTickerResponse | null> {
  const url = `${BASE_URL}/ticker/bookTicker?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SHORT } });
  if (!res.ok) return null;
  return res.json() as Promise<BookTickerResponse>;
}

// ── Normalization ─────────────────────────────────────────────────────

export function normalizeKlinesToCandles(klines: RawKline[]): Candle[] {
  return klines.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export function normalizeUiKlinesToFullCandles(klines: RawKline[]): FullCandle[] {
  return klines.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: Math.floor(k[6] / 1000),
    quoteVolume: Number(k[7]),
    trades: k[8],
    takerBuyBase: Number(k[9]),
    takerBuyQuote: Number(k[10]),
  }));
}

export function extractFilters(sym: ExchangeInfoSymbol): {
  tickSize: string | null;
  stepSize: string | null;
  minNotional: string | null;
} {
  const filters = sym.filters ?? [];
  const priceFilter = filters.find((f) => f.filterType === "PRICE_FILTER");
  const lotSize = filters.find((f) => f.filterType === "LOT_SIZE");
  const minNotionalFilter = filters.find(
    (f) => f.filterType === "MIN_NOTIONAL" || f.filterType === "NOTIONAL",
  );
  return {
    tickSize: priceFilter?.tickSize ?? null,
    stepSize: lotSize?.stepSize ?? null,
    minNotional: minNotionalFilter?.minNotional ?? null,
  };
}
