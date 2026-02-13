import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
import { PageShell } from "@/components/PageShell";
import { KpiCard } from "@/components/KpiCard";
import { AssetTabs } from "./AssetTabs";
import { formatPrice, formatPct, formatCompact } from "@/lib/number";

// ── Types ───────────────────────────────────────────────────────────

interface AssetData {
  symbol: string;
  binance: {
    lastPrice: number;
    changePct24h: number;
    quoteVolume24h: number;
    highPrice24h: number;
    lowPrice24h: number;
  };
  background: {
    name: string;
    symbol: string;
    imageUrl: string | null;
    descriptionHtml: string;
    homepage: string | null;
    twitter: string | null;
  } | null;
  mappingConfidence: "high" | "medium" | "low";
}

// ── Data fetching ───────────────────────────────────────────────────

async function getAssetData(symbol: string): Promise<AssetData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/api/asset?symbol=${encodeURIComponent(symbol)}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) return null;
  return res.json() as Promise<AssetData>;
}

// ── Page ────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} – Crypto Losers`,
    description: `Binance market stats for ${symbol.toUpperCase()}`,
  };
}

export default async function AssetPage({ params }: PageProps) {
  const { symbol } = await params;
  const data = await getAssetData(symbol.toUpperCase());

  if (!data) return notFound();

  const { binance, background, mappingConfidence } = data;
  const isNegative = binance.changePct24h < 0;

  // Confidence badge ink styles
  const confidenceStyles: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-zinc-100 text-zinc-600",
  };

  // Updated-at time
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return (
    <PageShell>
      {/* Back link */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span aria-hidden>←</span> Back to dashboard
      </Link>

      {/* Header */}
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {background?.imageUrl && (
            <Image
              src={background.imageUrl}
              alt={background.name}
              width={44}
              height={44}
              className="rounded-full ink-border-2"
              unoptimized
            />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl md:text-4xl uppercase tracking-tight">
                {data.symbol}
              </h1>
              {background && (
                <span className="text-base text-muted-foreground">
                  {background.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="tabular-nums text-xl font-bold">
                ${formatPrice(binance.lastPrice)}
              </span>
              <span
                className={`tabular-nums text-sm font-semibold ${
                  isNegative ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatPct(binance.changePct24h)}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence badge — ink-styled pill */}
        <span
          className={`ink-border rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${confidenceStyles[mappingConfidence]}`}
        >
          Mapping: {mappingConfidence}
        </span>
      </header>

      {/* Yellow stat strip */}
      <div className="ink-border-2 bg-yellow-300 py-2 px-4 mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-bold uppercase tracking-wider text-black rounded-md">
        <span
          className={`tabular-nums ${isNegative ? "text-red-800" : "text-emerald-800"}`}
        >
          {formatPct(binance.changePct24h)} 24h
        </span>
        <span className="text-yellow-700/60" aria-hidden>
          /
        </span>
        <span className="tabular-nums">
          ${formatCompact(binance.quoteVolume24h)} Volume
        </span>
        <span className="text-yellow-700/60" aria-hidden>
          /
        </span>
        <span className="tabular-nums">Updated {time} UTC</span>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="24h High"
          value={`$${formatPrice(binance.highPrice24h)}`}
        />
        <KpiCard
          label="24h Low"
          value={`$${formatPrice(binance.lowPrice24h)}`}
        />
        <KpiCard
          label="24h Volume"
          value={`$${formatCompact(binance.quoteVolume24h)}`}
          subtext="Quote volume (USDT)"
        />
        <KpiCard
          label="24h Change"
          value={formatPct(binance.changePct24h)}
        />
      </div>

      {/* Tabs: Overview / Market */}
      <AssetTabs binance={binance} background={background} />

      {/* Footer disclaimer */}
      <div className="mt-6 ink-border-2 ink-shadow rounded-md bg-white py-3 px-6">
        <p className="text-xs text-muted-foreground">
          Market data from Binance. Background info from CoinGecko.
          Mapping confidence is determined heuristically — verify independently.
        </p>
      </div>
    </PageShell>
  );
}
