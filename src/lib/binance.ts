const BINANCE_24H_URL = "https://api.binance.com/api/v3/ticker/24hr";

export interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

/**
 * Fetch all 24-hour ticker data from Binance Spot.
 * Uses Next.js fetch caching (revalidate every 30 seconds).
 */
export async function fetch24hTickers(): Promise<Ticker24h[]> {
  const res = await fetch(BINANCE_24H_URL, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(
      `Binance API error: ${res.status} ${res.statusText}`
    );
  }

  const data: unknown = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("Binance API did not return an array");
  }

  return data as Ticker24h[];
}
