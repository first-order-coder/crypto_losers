"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/SectionCard";
import { formatPrice, formatPct, formatCompact } from "@/lib/number";

interface BinanceStats {
  lastPrice: number;
  changePct24h: number;
  quoteVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
}

interface Background {
  name: string;
  symbol: string;
  imageUrl: string | null;
  descriptionHtml: string;
  homepage: string | null;
  twitter: string | null;
}

interface AssetTabsProps {
  binance: BinanceStats;
  background: Background | null;
}

export function AssetTabs({ binance, background }: AssetTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="market">Market</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview">
        <SectionCard title="About">
          {background ? (
            <div className="flex flex-col gap-4">
              {/* Description */}
              {background.descriptionHtml ? (
                <div
                  className="prose prose-sm max-w-none text-sm text-foreground/80 leading-relaxed [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{
                    __html: background.descriptionHtml,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description available.
                </p>
              )}

              {/* Links */}
              <div className="flex flex-wrap gap-3 text-sm">
                {background.homepage && (
                  <a
                    href={background.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <span aria-hidden>🌐</span> Website
                  </a>
                )}
                {background.twitter && (
                  <a
                    href={background.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <span aria-hidden>𝕏</span> Twitter
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No background information found for this asset.
            </p>
          )}
        </SectionCard>
      </TabsContent>

      {/* Market Tab */}
      <TabsContent value="market">
        <SectionCard title="Market Stats">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatRow label="Last Price" value={`$${formatPrice(binance.lastPrice)}`} />
            <StatRow label="24h Change" value={formatPct(binance.changePct24h)} negative={binance.changePct24h < 0} />
            <StatRow label="24h High" value={`$${formatPrice(binance.highPrice24h)}`} />
            <StatRow label="24h Low" value={`$${formatPrice(binance.lowPrice24h)}`} />
            <StatRow label="24h Volume" value={`$${formatCompact(binance.quoteVolume24h)}`} />
            <StatRow
              label="24h Range"
              value={`$${formatPrice(binance.lowPrice24h)} – $${formatPrice(binance.highPrice24h)}`}
            />
          </div>
        </SectionCard>
      </TabsContent>
    </Tabs>
  );
}

function StatRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums text-sm font-semibold ${
          negative === true
            ? "text-red-600"
            : negative === false
            ? "text-emerald-600"
            : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
