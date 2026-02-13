import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
import { PageShell } from "@/components/PageShell";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
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

  // Confidence badge colors
  const confidenceColor: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-zinc-100 text-zinc-600",
  };

  return (
    <PageShell>
      {/* Back link */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span aria-hidden>←</span> Back to dashboard
      </Link>

      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {background?.imageUrl && (
            <Image
              src={background.imageUrl}
              alt={background.name}
              width={40}
              height={40}
              className="rounded-full"
              unoptimized
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {data.symbol}
              </h1>
              {background && (
                <span className="text-lg text-muted-foreground">
                  {background.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-xl font-semibold">
                ${formatPrice(binance.lastPrice)}
              </span>
              <span
                className={`tabular-nums text-sm font-medium ${
                  isNegative ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatPct(binance.changePct24h)}
              </span>
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`${confidenceColor[mappingConfidence]} border-0 text-xs`}
        >
          Mapping: {mappingConfidence}
        </Badge>
      </header>

      <Separator className="mb-6" />

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
          className={isNegative ? "border-red-200" : "border-emerald-200"}
        />
      </div>

      {/* Tabs: Overview / Market */}
      <AssetTabs binance={binance} background={background} />

      {/* Footer disclaimer */}
      <Card className="mt-6 py-3">
        <CardContent className="text-xs text-muted-foreground">
          Market data from Binance. Background info from CoinGecko.
          Mapping confidence is determined heuristically — verify independently.
        </CardContent>
      </Card>
    </PageShell>
  );
}
