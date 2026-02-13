import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { getSymbolMeta } from "@/lib/exchangeInfo";

// ── Query-param schema ──────────────────────────────────────────────
const QuerySchema = z.object({
  symbol: z.string().min(1, "symbol is required").toUpperCase(),
});

// ── Types ───────────────────────────────────────────────────────────

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

type MappingConfidence = "high" | "medium" | "low";

// ── Helpers ─────────────────────────────────────────────────────────

async function fetchBinanceTicker(symbol: string): Promise<BinanceTicker> {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<BinanceTicker>;
}

async function searchCoinGecko(query: string): Promise<CoinGeckoSearchResult[]> {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.coins ?? []) as CoinGeckoSearchResult[];
}

interface CoinGeckoDetail {
  name: string;
  symbol: string;
  image?: { large?: string; small?: string };
  description?: { en?: string };
  links?: {
    homepage?: string[];
    twitter_screen_name?: string;
  };
}

async function fetchCoinGeckoDetail(id: string): Promise<CoinGeckoDetail | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json() as Promise<CoinGeckoDetail>;
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

  const { symbol } = parsed.data;

  // 1. Resolve base/quote via Binance exchangeInfo
  const meta = await getSymbolMeta(symbol);

  if (!meta) {
    return NextResponse.json(
      {
        error: "Symbol not found",
        detail: `"${symbol}" is not an active trading pair on Binance`,
      },
      { status: 400 }
    );
  }

  const { baseAsset } = meta;

  try {
    // 2. Fetch Binance 24h ticker
    const ticker = await fetchBinanceTicker(symbol);

    const binance = {
      lastPrice: Number(ticker.lastPrice),
      changePct24h: Number(ticker.priceChangePercent),
      quoteVolume24h: Number(ticker.quoteVolume),
      highPrice24h: Number(ticker.highPrice),
      lowPrice24h: Number(ticker.lowPrice),
    };

    // 3. Attempt CoinGecko mapping using the resolved baseAsset
    const searchResults = await searchCoinGecko(baseAsset);

    let background: {
      name: string;
      symbol: string;
      imageUrl: string | null;
      descriptionHtml: string;
      homepage: string | null;
      twitter: string | null;
    } | null = null;
    let mappingConfidence: MappingConfidence = "low";

    if (searchResults.length > 0) {
      // Score each result and pick the best
      const scored = searchResults.map((r) => ({
        result: r,
        confidence: computeConfidence(baseAsset, r),
      }));

      // Priority order: high > medium > low, then by market_cap_rank
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

      // Only fetch details if confidence is medium or high
      if (best.confidence !== "low") {
        const detail = await fetchCoinGeckoDetail(best.result.id);
        if (detail) {
          const rawDesc = detail.description?.en ?? "";
          const homepage =
            detail.links?.homepage?.find((h) => h && h.length > 0) ?? null;
          const twitter = detail.links?.twitter_screen_name
            ? `https://twitter.com/${detail.links.twitter_screen_name}`
            : null;

          background = {
            name: detail.name,
            symbol: detail.symbol,
            imageUrl: detail.image?.large ?? detail.image?.small ?? null,
            descriptionHtml: sanitizeDescription(rawDesc),
            homepage,
            twitter,
          };
        }
      }
    }

    return NextResponse.json({
      symbol,
      binance,
      background,
      mappingConfidence,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch asset data", detail: message },
      { status: 502 }
    );
  }
}
