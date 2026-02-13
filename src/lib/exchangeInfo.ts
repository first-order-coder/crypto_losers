const EXCHANGE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo";

export interface SymbolMeta {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface ExchangeInfoSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface ExchangeInfoResponse {
  symbols: ExchangeInfoSymbol[];
}

/**
 * In-memory cache for the symbol map.
 * Populated on first call, refreshed every 6 hours.
 */
let symbolMap: Map<string, SymbolMeta> | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function loadSymbolMap(): Promise<Map<string, SymbolMeta>> {
  const res = await fetch(EXCHANGE_INFO_URL, {
    next: { revalidate: 21600 }, // 6 hours in seconds
  });

  if (!res.ok) {
    throw new Error(
      `Binance exchangeInfo error: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as ExchangeInfoResponse;

  const map = new Map<string, SymbolMeta>();
  for (const s of data.symbols) {
    if (s.status === "TRADING") {
      map.set(s.symbol, {
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
      });
    }
  }

  return map;
}

/**
 * Look up the base/quote metadata for a Binance symbol.
 * Returns null if the symbol is not found or not actively trading.
 *
 * Uses an in-memory cache that refreshes every 6 hours.
 */
export async function getSymbolMeta(
  symbol: string
): Promise<SymbolMeta | null> {
  const now = Date.now();

  if (!symbolMap || now - lastFetchedAt > CACHE_TTL_MS) {
    symbolMap = await loadSymbolMap();
    lastFetchedAt = now;
  }

  return symbolMap.get(symbol) ?? null;
}
