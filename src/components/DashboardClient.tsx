"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { ControlsBar } from "@/components/ControlsBar";
import { YellowStatStrip } from "@/components/YellowStatStrip";
import { LosersGrid } from "@/components/LosersGrid";
import { LosersTable } from "@/components/LosersTable";
import { SectionCard } from "@/components/SectionCard";
import type { LoserRow } from "@/components/LosersTable";

const PAGE_SIZE = 50;

interface DashboardClientProps {
  initialLosers: LoserRow[];
  initialUpdatedAt: string;
  initialTotal: number;
}

export function DashboardClient({
  initialLosers,
  initialUpdatedAt,
  initialTotal,
}: DashboardClientProps) {
  // ── Core data state ────────────────────────────────────────────────
  const [losers, setLosers] = useState(initialLosers);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [loading, setLoading] = useState(false);

  // ── Paging state ───────────────────────────────────────────────────
  const [hasMore, setHasMore] = useState(
    initialLosers.length < initialTotal,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(initialTotal);

  // Refs for stable IntersectionObserver callback
  const nextCursorRef = useRef<number | null>(
    initialLosers.length < initialTotal ? initialLosers.length : null,
  );
  const isLoadingMoreRef = useRef(false);

  // ── Controls state ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [minQuoteVolume, setMinQuoteVolume] = useState(1_000_000);
  const [excludeLeveraged, setExcludeLeveraged] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Sentinel ref for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Skip initial filter-change fetch (server data already loaded)
  const isFirstRender = useRef(true);

  // ── Build query params helper ──────────────────────────────────────
  const buildParams = useCallback(
    (cursor: number) =>
      new URLSearchParams({
        quote: "USDT",
        cursor: String(cursor),
        pageSize: String(PAGE_SIZE),
        minQuoteVolume: String(minQuoteVolume),
        excludeLeveraged: String(excludeLeveraged),
      }),
    [minQuoteVolume, excludeLeveraged],
  );

  // ── Filter change → reset and load first page ─────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/losers?${buildParams(0)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLosers(data.losers);
        setUpdatedAt(data.updatedAt);
        setHasMore(data.hasMore);
        setTotal(data.total);
        nextCursorRef.current = data.nextCursor;
      })
      .catch((err) => console.error("Failed to fetch losers:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildParams]);

  // ── Load next page (called by IntersectionObserver) ────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || nextCursorRef.current === null) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/losers?${buildParams(nextCursorRef.current)}`,
      );
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();

      setLosers((prev) => [...prev, ...data.losers]);
      setUpdatedAt(data.updatedAt);
      setHasMore(data.hasMore);
      setTotal(data.total);
      nextCursorRef.current = data.nextCursor;
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      isLoadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Stable ref so the observer always calls the latest loadMore
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // ── IntersectionObserver for infinite scroll (table view only) ─────
  useEffect(() => {
    if (viewMode !== "table") return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreRef.current();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, hasMore]);

  // ── Client-side search filter ──────────────────────────────────────
  const filteredLosers = useMemo(() => {
    if (!searchTerm.trim()) return losers;
    const term = searchTerm.toUpperCase();
    return losers.filter((l) => l.symbol.includes(term));
  }, [losers, searchTerm]);

  // ── Stats for yellow strip ─────────────────────────────────────────
  const loserCount = searchTerm.trim() ? filteredLosers.length : total;
  const totalQuoteVolume = filteredLosers.reduce(
    (sum, l) => sum + l.quoteVolume24h,
    0,
  );

  return (
    <>
      <YellowStatStrip
        loserCount={loserCount}
        totalQuoteVolume={totalQuoteVolume}
        updatedAt={updatedAt}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6 mt-8">
        {/* Controls */}
        <div className="mb-6">
          <ControlsBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeMinVolume={minQuoteVolume}
            onMinVolumeChange={setMinQuoteVolume}
            excludeLeveraged={excludeLeveraged}
            onExcludeLeveragedChange={setExcludeLeveraged}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Results */}
        <section id="results" className="scroll-mt-24">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <span className="ml-3 text-sm text-muted-foreground">
                Loading…
              </span>
            </div>
          ) : viewMode === "grid" ? (
            <LosersGrid losers={filteredLosers} />
          ) : (
            <>
              <SectionCard title="Top Losers — Binance Spot (24h)">
                <LosersTable losers={filteredLosers} />
              </SectionCard>

              {/* Sentinel + loading indicator */}
              {hasMore && !searchTerm.trim() && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-8"
                >
                  {loadingMore ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span className="ml-2 text-xs text-muted-foreground uppercase tracking-wider">
                        Loading more…
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Scroll for more
                    </span>
                  )}
                </div>
              )}

              {!hasMore && losers.length > PAGE_SIZE && (
                <div className="py-6 text-center text-xs text-muted-foreground uppercase tracking-wider">
                  All {total} losers loaded
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
