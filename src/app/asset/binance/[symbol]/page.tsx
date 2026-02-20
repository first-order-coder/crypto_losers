import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
import { PageShell } from "@/components/PageShell";
import { KpiCard } from "@/components/KpiCard";
import { TradeTerminal } from "@/components/TradeTerminal";
import { formatPrice, formatCompact } from "@/lib/number";

// ── Types ───────────────────────────────────────────────────────────

interface AssetData {
  symbol: string;
  baseAsset: string | null;
  quoteAsset: string | null;
  coin: {
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
  } | null;
  externalTickers: Array<{
    marketName: string;
    base: string;
    target: string;
    last: number | null;
    volume: number | null;
    tradeUrl: string | null;
  }>;
  mappingConfidence: "high" | "medium" | "low";
  updatedAt: string;
}

// ── Data fetching ────────────────────────────────────────────────────

async function getAssetData(symbol: string): Promise<AssetData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    symbol,
    interval: "1h",
    limit: "1",          // we only need metadata + coin info – chart handled by TradeTerminal
    includeAth: "false",
    includeBinancePairs: "false",
  });
  const url = `${baseUrl}/api/asset?${params}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json() as Promise<AssetData>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return "—"; }
}

// ── Page ─────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} – Crypto Losers`,
    description: `Live Binance trading terminal for ${symbol.toUpperCase()}`,
  };
}

export default async function AssetPage({ params }: PageProps) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const data = await getAssetData(sym);

  if (!data) return notFound();

  return (
    <PageShell>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span aria-hidden>←</span> Back to dashboard
      </Link>

      {/* Coin header (image + name) – rendered server-side from CoinGecko if available */}
      <header className="mb-4 flex items-center gap-3">
        {data.coin?.imageUrl && (
          <Image
            src={data.coin.imageUrl}
            alt={data.coin.name}
            width={36}
            height={36}
            className="rounded-full ink-border"
            unoptimized
          />
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl uppercase tracking-tight">
              {sym}
            </h1>
            {data.coin && (
              <span className="text-sm text-muted-foreground">{data.coin.name}</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Trade Terminal (all Binance, live) ─────────────────────── */}
      <TradeTerminal symbol={sym} />

      {/* ── CoinGecko supplemental data ──────────────────────────── */}

      {/* ATH (global) + Market Cap */}
      {data.coin?.athGlobal && (
        <section className="mb-6">
          <h2 className="font-display text-base uppercase tracking-tight mb-3">
            Global Stats (CoinGecko)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard
              label="ATH (Global)"
              value={data.coin.athGlobal.price != null ? `$${formatPrice(data.coin.athGlobal.price)}` : "—"}
              subtext={data.coin.athGlobal.dateIso ? formatDate(data.coin.athGlobal.dateIso) : undefined}
            />
            {data.coin.marketCap != null && (
              <KpiCard
                label="Market Cap"
                value={`$${formatCompact(data.coin.marketCap)}`}
                subtext="CoinGecko"
              />
            )}
          </div>
        </section>
      )}

      {/* Project info */}
      <section className="mb-6">
        <h2 className="font-display text-base uppercase tracking-tight mb-3">
          Project
        </h2>
        <div className="ink-border-2 ink-shadow rounded-md bg-card p-5">
          {data.coin ? (
            <div className="flex flex-col gap-3">
              {data.coin.descriptionHtml ? (
                <div
                  className="prose prose-sm max-w-none text-sm text-foreground/80 leading-relaxed [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: data.coin.descriptionHtml }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No description available.</p>
              )}
              {data.coin.homepage && (
                <a
                  href={data.coin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ink inline-flex items-center gap-1 self-start rounded-md bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-muted"
                >
                  <span aria-hidden>🌐</span> Official Website
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Coin info unavailable.</p>
          )}
        </div>
      </section>

      {/* External listings */}
      {data.externalTickers.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-base uppercase tracking-tight mb-3">
            Across Exchanges
          </h2>
          <div className="ink-border-2 rounded-sm bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ink bg-muted/50">
                  <th className="text-left font-bold text-xs uppercase tracking-wider py-2 px-3">Exchange</th>
                  <th className="text-left font-bold text-xs uppercase tracking-wider py-2 px-3">Pair</th>
                  <th className="text-right font-bold text-xs uppercase tracking-wider py-2 px-3">Last</th>
                  <th className="text-right font-bold text-xs uppercase tracking-wider py-2 px-3">Volume</th>
                  <th className="text-right font-bold text-xs uppercase tracking-wider py-2 px-3">Trade</th>
                </tr>
              </thead>
              <tbody>
                {data.externalTickers.map((row) => (
                  <tr key={`${row.marketName}-${row.base}-${row.target}`} className="border-b border-border hover:bg-muted/30">
                    <td className="py-1.5 px-3 font-medium">{row.marketName}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">{row.base}/{row.target}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{row.last != null ? `$${formatPrice(row.last)}` : "—"}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{row.volume != null ? `$${formatCompact(row.volume)}` : "—"}</td>
                    <td className="py-1.5 px-3 text-right">
                      {row.tradeUrl ? (
                        <a href={row.tradeUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Open</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="mt-4 ink-border-2 rounded-md bg-card py-3 px-5">
        <p className="text-xs text-muted-foreground">
          Chart, order book, and trades from Binance WebSocket API.
          Global coin info from CoinGecko. Mapping confidence is heuristic — verify independently.
        </p>
      </div>
    </PageShell>
  );
}
