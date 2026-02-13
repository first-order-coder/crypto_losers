"use client";

import { useState } from "react";
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

type TabId = "overview" | "market";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "market", label: "Market" },
];

export function AssetTabs({ binance, background }: AssetTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div>
      {/* Tab triggers — ink pill buttons */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ink-border rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview panel */}
      {activeTab === "overview" && (
        <div className="ink-border-2 ink-shadow rounded-md bg-white p-6">
          <h3 className="font-display text-lg uppercase tracking-tight mb-4">
            About
          </h3>
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
                    className="btn-ink inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-50"
                  >
                    <span aria-hidden>🌐</span> Website
                  </a>
                )}
                {background.twitter && (
                  <a
                    href={background.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ink inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-50"
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
        </div>
      )}

      {/* Market panel */}
      {activeTab === "market" && (
        <div className="ink-border-2 ink-shadow rounded-md bg-white p-6">
          <h3 className="font-display text-lg uppercase tracking-tight mb-4">
            Market Stats
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatRow
              label="Last Price"
              value={`$${formatPrice(binance.lastPrice)}`}
            />
            <StatRow
              label="24h Change"
              value={formatPct(binance.changePct24h)}
              negative={binance.changePct24h < 0}
            />
            <StatRow
              label="24h High"
              value={`$${formatPrice(binance.highPrice24h)}`}
            />
            <StatRow
              label="24h Low"
              value={`$${formatPrice(binance.lowPrice24h)}`}
            />
            <StatRow
              label="24h Volume"
              value={`$${formatCompact(binance.quoteVolume24h)}`}
            />
            <StatRow
              label="24h Range"
              value={`$${formatPrice(binance.lowPrice24h)} – $${formatPrice(binance.highPrice24h)}`}
            />
          </div>
        </div>
      )}
    </div>
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
    <div className="flex items-center justify-between ink-border rounded-md px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`tabular-nums text-sm font-bold ${
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
