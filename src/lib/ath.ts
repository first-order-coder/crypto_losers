import { fetchKlines, normalizeKlinesToCandles } from "./binanceMarket";

interface AthResult {
  ath: number | null;
  athTime: number | null; // unix seconds
  scannedDays: number;
}

const MAX_PAGES = 6;
const PAGE_LIMIT = 1000;

// Simple in-memory cache per symbol so we don't recompute ATH constantly.
const cache = new Map<string, { value: AthResult; expiresAt: number }>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function computeAthFromBinanceDaily(
  symbol: string,
): Promise<AthResult> {
  const now = Date.now();
  const cached = cache.get(symbol);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let endTime: number | undefined = undefined;
  let globalMax = -Infinity;
  let globalTime: number | null = null;
  let scanned = 0;

  for (let i = 0; i < MAX_PAGES; i++) {
    const raw = await fetchKlines(symbol, "1d", PAGE_LIMIT, undefined, endTime);
    if (!raw.length) break;

    const candles = normalizeKlinesToCandles(raw);
    scanned += candles.length;

    for (const c of candles) {
      if (c.high > globalMax) {
        globalMax = c.high;
        globalTime = c.time;
      }
    }

    // page backwards: next endTime is before earliest open time
    const first = candles[0];
    endTime = first ? first.time * 1000 - 1 : undefined;
    if (!endTime) break;
  }

  const result: AthResult =
    scanned === 0 || !isFinite(globalMax)
      ? { ath: null, athTime: null, scannedDays: 0 }
      : { ath: globalMax, athTime: globalTime, scannedDays: scanned };

  cache.set(symbol, { value: result, expiresAt: now + ONE_DAY_MS });
  return result;
}

