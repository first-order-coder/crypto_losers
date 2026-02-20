const BASE = "https://api.coingecko.com/api/v3";

const REVALIDATE = 300; // 5 min

export interface CoinDetail {
  id: string;
  name: string;
  symbol: string;
  image?: { large?: string; small?: string };
  description?: { en?: string };
  links?: {
    homepage?: string[];
    twitter_screen_name?: string;
  };
  market_data?: {
    current_price?: Record<string, number>;
    market_cap?: Record<string, number>;
    ath?: Record<string, number>;
    ath_date?: Record<string, string>;
    atl?: Record<string, number>;
    atl_date?: Record<string, string>;
  };
}

export async function fetchCoin(id: string): Promise<CoinDetail | null> {
  const url = `${BASE}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return null;
  return res.json() as Promise<CoinDetail>;
}

export interface MarketChartResponse {
  prices: [number, number][];
}

export async function fetchMarketChart(
  id: string,
  vsCurrency = "usd",
  days = 30,
): Promise<MarketChartResponse | null> {
  const url = `${BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${encodeURIComponent(vsCurrency)}&days=${days}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return null;
  return res.json() as Promise<MarketChartResponse>;
}

export interface TickerItem {
  base: string;
  target: string;
  last?: number;
  volume?: number;
  converted_volume?: number;
  trade_url?: string | null;
  market?: { name: string; identifier?: string };
}

export interface TickersResponse {
  tickers: TickerItem[];
}

export async function fetchTickers(
  id: string,
  page = 1,
  order = "volume_desc",
  perPage = 25,
): Promise<TickersResponse | null> {
  const url = `${BASE}/coins/${encodeURIComponent(id)}/tickers?page=${page}&order=${encodeURIComponent(order)}&per_page=${perPage}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return null;
  return res.json() as Promise<TickersResponse>;
}
