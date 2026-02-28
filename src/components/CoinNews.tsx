"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string | null;
  tags: string[];
  kind: "rss" | "binance_announcements";
}

interface CoinNewsProps {
  keywords: string[];
  limit?: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export function CoinNews({ keywords, limit = 10 }: CoinNewsProps) {
  const [tab, setTab] = useState<"all" | "binance">("all");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tick = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);
    const q = keywords.join(",");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("limit", String(limit));
    if (tab === "binance") params.set("source", "binance_ann");
    fetch(`/api/news?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(tick);
    };
  }, [keywords, limit, tab]);

  return (
    <section className="mb-6">
      <h2 className="font-display text-base uppercase tracking-tight mb-3">
        News &amp; Announcements
      </h2>
      <div className="ink-border-2 ink-shadow rounded-md bg-card overflow-hidden">
        <div className="flex gap-2 p-3 border-b border-border bg-muted/20">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`ink-border rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === "all"
                ? "bg-foreground text-background"
                : "bg-card text-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("binance")}
            className={`ink-border rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === "binance"
                ? "bg-foreground text-background"
                : "bg-card text-foreground hover:bg-muted"
            }`}
          >
            Binance Announcements
          </button>
        </div>
        <div className="p-4 min-h-[120px]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relevant news found.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={`${item.sourceId}-${item.url}`} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm text-foreground hover:text-primary underline hover:no-underline block"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{item.sourceName}</span>
                    <span>·</span>
                    <span>{formatTime(item.publishedAt)}</span>
                  </div>
                  {item.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
