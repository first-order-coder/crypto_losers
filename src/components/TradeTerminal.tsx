"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CandleChart, type CandleChartHandle, type FullCandle } from "@/components/CandleChart";

// ── Types ─────────────────────────────────────────────────────────────

type BinanceKlineInterval =
  | "1m" | "3m" | "5m" | "15m" | "30m"
  | "1h" | "2h" | "4h" | "1d" | "1w";

interface Stats24h {
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  count: number;
}

interface BookTicker {
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
}

interface TradeEntry {
  id: number;
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean;
}

interface TradeSnapshot {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  precision: {
    tickSize: string | null;
    stepSize: string | null;
    minNotional: string | null;
  };
  stats24h: Stats24h;
  avgPrice: { mins: number; price: number } | null;
  bookTicker: BookTicker | null;
  candles: FullCandle[];
  depth: { lastUpdateId: number; bids: [number, number][]; asks: [number, number][] };
  aggTrades: TradeEntry[];
  binancePairsSameBase: { symbol: string; quoteAsset: string }[];
}

interface OrderBook {
  bids: [number, number][];
  asks: [number, number][];
}

// ── Intervals config ──────────────────────────────────────────────────

const INTERVALS: { label: string; value: BinanceKlineInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

// ── Number formatting ─────────────────────────────────────────────────

function fmtPrice(v: number | null | undefined, decimals = 2): string {
  if (v == null || !isFinite(v)) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: decimals });
  if (v >= 1) return v.toFixed(Math.max(2, decimals));
  return v.toPrecision(5);
}

function fmtQty(v: number, decimals = 4): string {
  if (!isFinite(v)) return "—";
  return v.toFixed(decimals);
}

function fmtCompact(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return v.toFixed(2);
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ── Sub-components ────────────────────────────────────────────────────

function OrderBookPanel({
  bids,
  asks,
  lastPrice,
  quoteAsset,
}: {
  bids: [number, number][];
  asks: [number, number][];
  lastPrice: number;
  quoteAsset: string;
}) {
  const displayAsks = asks.slice(0, 14).reverse();
  const displayBids = bids.slice(0, 14);

  const maxAskVol = displayAsks.reduce((m, [, q]) => Math.max(m, q), 0.0001);
  const maxBidVol = displayBids.reduce((m, [, q]) => Math.max(m, q), 0.0001);

  const spread =
    asks.length && bids.length ? asks[0][0] - bids[0][0] : null;
  const spreadPct =
    spread != null && bids.length ? (spread / bids[0][0]) * 100 : null;

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
        <span className="text-right">Price ({quoteAsset})</span>
        <span className="text-right">Qty</span>
      </div>

      {/* Asks (sells) – reversed so best ask is nearest the middle */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        {displayAsks.map(([p, q], i) => {
          const widthPct = (q / maxAskVol) * 100;
          return (
            <div
              key={i}
              className="relative grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 px-2 h-6 items-center overflow-hidden"
            >
              <div
                className="absolute inset-y-0 right-0 bg-red-500/10"
                style={{ width: `${widthPct}%` }}
              />
              <span className="relative z-10 text-red-500 tabular-nums text-right whitespace-nowrap">
                {fmtPrice(p)}
              </span>
              <span className="relative z-10 text-muted-foreground tabular-nums text-right whitespace-nowrap">
                {fmtQty(q)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread / mid row */}
      <div className="px-2 py-1 border-y border-border bg-muted/20 flex flex-col gap-0.5">
        <span className="text-xs font-semibold tabular-nums text-center">
          {fmtPrice(lastPrice)}
        </span>
        {spread != null && (
          <span className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
            Spread {fmtPrice(spread)} ({spreadPct?.toFixed(3)}%)
          </span>
        )}
      </div>

      {/* Bids (buys) */}
      <div className="flex-1 overflow-y-auto">
        {displayBids.map(([p, q], i) => {
          const widthPct = (q / maxBidVol) * 100;
          return (
            <div
              key={i}
              className="relative grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 px-2 h-6 items-center overflow-hidden"
            >
              <div
                className="absolute inset-y-0 right-0 bg-green-500/10"
                style={{ width: `${widthPct}%` }}
              />
              <span className="relative z-10 text-green-500 tabular-nums text-right whitespace-nowrap">
                {fmtPrice(p)}
              </span>
              <span className="relative z-10 text-muted-foreground tabular-nums text-right whitespace-nowrap">
                {fmtQty(q)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TradesTapePanel({
  trades,
  quoteAsset,
}: {
  trades: TradeEntry[];
  quoteAsset: string;
}) {
  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30 sticky top-0">
        <span className="text-left">Time</span>
        <span className="text-right">Price ({quoteAsset})</span>
        <span className="text-right">Qty</span>
      </div>
      <div className="overflow-y-auto flex-1">
        {trades.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-2 h-6 items-center hover:bg-muted/30"
          >
            <span className="text-muted-foreground text-left whitespace-nowrap">
              {fmtTime(t.time)}
            </span>
            <span
              className={`tabular-nums text-right whitespace-nowrap ${
                t.isBuyerMaker ? "text-red-500" : "text-green-500"
              }`}
            >
              {fmtPrice(t.price)}
            </span>
            <span className="text-muted-foreground tabular-nums text-right whitespace-nowrap">
              {fmtQty(t.qty)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

interface TradeTerminalProps {
  symbol: string;
}

const TRADES_MAX = 200;
const WS_BASE = "wss://stream.binance.com:9443";

export function TradeTerminal({ symbol }: TradeTerminalProps) {
  const [snap, setSnap] = useState<TradeSnapshot | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [interval, setIntervalVal] = useState<BinanceKlineInterval>("1h");

  // Live state – kept in refs for WS callbacks to avoid stale closures, mirrored to state for render
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [bestBid, setBestBid] = useState<{ price: number; qty: number } | null>(null);
  const [bestAsk, setBestAsk] = useState<{ price: number; qty: number } | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "open" | "closed">("closed");

  // livePct is a derived value – no separate state needed
  const livePct =
    livePrice != null && snap != null && snap.stats24h.openPrice > 0
      ? ((livePrice - snap.stats24h.openPrice) / snap.stats24h.openPrice) * 100
      : null;

  const chartRef = useRef<CandleChartHandle | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);
  const intervalRef = useRef(interval);

  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  // ── Snapshot fetch ──────────────────────────────────────────────────

  const fetchSnap = useCallback(async (sym: string, iv: BinanceKlineInterval) => {
    const params = new URLSearchParams({ symbol: sym, interval: iv, limit: "500", depthLimit: "50", tradesLimit: "80" });
    const res = await fetch(`/api/trade?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<TradeSnapshot>;
  }, []);

  // ── WebSocket ───────────────────────────────────────────────────────

  // openWsImpl stored in a ref so ws.onclose can call it without stale closure issues
  const openWsRef = useRef<((sym: string, iv: BinanceKlineInterval) => void) | null>(null);

  // State-free close – safe to call from within effects
  const rawCloseWs = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const closeWs = useCallback(() => {
    rawCloseWs();
    setWsStatus("closed");
  }, [rawCloseWs]);

  const openWs = useCallback((sym: string, iv: BinanceKlineInterval) => {
    closeWs();
    const sl = sym.toLowerCase();
    const streams = [
      `${sl}@kline_${iv}`,
      `${sl}@bookTicker`,
      `${sl}@aggTrade`,
      `${sl}@depth20@100ms`,
    ].join("/");
    const url = `${WS_BASE}/stream?streams=${streams}`;

    setWsStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("open");
      retryDelay.current = 1000;
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      let msg: { stream: string; data: unknown };
      try { msg = JSON.parse(ev.data) as { stream: string; data: unknown }; }
      catch { return; }

      const { stream, data } = msg;

      if (stream.includes("@kline_")) {
        const kd = (data as { k: {
          t: number; o: string; h: string; l: string; c: string;
          v: string; x: boolean; q: string; n: number; V: string; Q: string;
        } }).k;
        const candle: FullCandle = {
          time: Math.floor(kd.t / 1000),
          open: Number(kd.o),
          high: Number(kd.h),
          low: Number(kd.l),
          close: Number(kd.c),
          volume: Number(kd.v),
          quoteVolume: Number(kd.q),
          trades: kd.n,
          takerBuyBase: Number(kd.V),
          takerBuyQuote: Number(kd.Q),
          closeTime: 0,
        };
        chartRef.current?.updateCandle(candle);
        setLivePrice(candle.close);
      }

      if (stream.endsWith("@bookTicker")) {
        const bt = data as { b: string; B: string; a: string; A: string };
        setBestBid({ price: Number(bt.b), qty: Number(bt.B) });
        setBestAsk({ price: Number(bt.a), qty: Number(bt.A) });
      }

      if (stream.endsWith("@aggTrade")) {
        const at = data as { a: number; p: string; q: string; T: number; m: boolean };
        const trade: TradeEntry = {
          id: at.a,
          price: Number(at.p),
          qty: Number(at.q),
          time: at.T,
          isBuyerMaker: at.m,
        };
        setLivePrice(trade.price);
        setTrades((prev) => {
          const next = [trade, ...prev];
          return next.length > TRADES_MAX ? next.slice(0, TRADES_MAX) : next;
        });
      }

      if (stream.endsWith("@depth20@100ms")) {
        const dd = data as { bids: [string, string][]; asks: [string, string][] };
        setOrderBook({
          bids: dd.bids.map(([p, q]) => [Number(p), Number(q)]),
          asks: dd.asks.map(([p, q]) => [Number(p), Number(q)]),
        });
      }
    };

    ws.onerror = () => { ws.close(); };

    ws.onclose = () => {
      setWsStatus("closed");
      if (wsRef.current !== ws) return;
      const delay = Math.min(retryDelay.current, 10000);
      retryDelay.current = delay * 2;
      // Use the ref to avoid stale closure
      retryTimer.current = setTimeout(
        () => openWsRef.current?.(sym, intervalRef.current),
        delay,
      );
    };
  }, [closeWs]);

  // Keep ref in sync so retry callbacks always have the latest openWs
  useEffect(() => { openWsRef.current = openWs; }, [openWs]);

  // ── Bootstrap on symbol / interval change ─────────────────────────

  useEffect(() => {
    let cancelled = false;
    rawCloseWs();

    void (async () => {
      if (cancelled) return;
      setLoadState("loading");
      setLivePrice(null);
      setBestBid(null);
      setBestAsk(null);
      setOrderBook({ bids: [], asks: [] });
      setTrades([]);

      try {
        const data = await fetchSnap(symbol, interval);
        if (cancelled) return;
        setSnap(data);
        setLoadState("ok");
        setOrderBook({ bids: data.depth.bids, asks: data.depth.asks });
        setTrades(data.aggTrades.slice().reverse().slice(0, TRADES_MAX));
        setLivePrice(data.stats24h.lastPrice);
        if (data.bookTicker) {
          setBestBid({ price: data.bookTicker.bidPrice, qty: data.bookTicker.bidQty });
          setBestAsk({ price: data.bookTicker.askPrice, qty: data.bookTicker.askQty });
        }
        setTimeout(() => chartRef.current?.setData(data.candles), 50);
        openWs(symbol, interval);
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
      rawCloseWs();
    };
  }, [symbol, interval, fetchSnap, openWs, rawCloseWs]);

  // ── Render ─────────────────────────────────────────────────────────

  if (loadState === "error") {
    return (
      <div className="ink-border-2 rounded-md bg-card p-8 text-center text-sm text-muted-foreground">
        Failed to load market data for <strong>{symbol}</strong>. Binance may be unavailable.
      </div>
    );
  }

  const stats = snap?.stats24h;
  const isNeg = (livePct ?? 0) < 0;
  const displayPrice = livePrice ?? stats?.lastPrice;

  return (
    <div className="ink-border-2 ink-shadow rounded-md overflow-hidden mb-6">
      {/* ── Header strip ───────────────────────────────────────────── */}
      <div className="bg-card border-b-2 border-ink px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-bold">
        {/* Symbol + price */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base uppercase tracking-tight">{symbol}</span>
          {displayPrice != null && (
            <span
              className={`tabular-nums text-lg ${isNeg ? "text-red-500" : "text-green-500"}`}
            >
              {fmtPrice(displayPrice)}
            </span>
          )}
          {livePct != null && (
            <span className={`tabular-nums text-xs ${isNeg ? "text-red-500" : "text-green-500"}`}>
              {isNeg ? "" : "+"}{livePct.toFixed(2)}%
            </span>
          )}
        </div>

        {loadState === "loading" && (
          <span className="text-muted-foreground animate-pulse">Loading…</span>
        )}

        {stats && (
          <>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>24h High</span>
              <span className="text-foreground">{fmtPrice(stats.highPrice)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>24h Low</span>
              <span className="text-foreground">{fmtPrice(stats.lowPrice)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>24h Vol</span>
              <span className="text-foreground">{fmtCompact(stats.quoteVolume)} {snap?.quoteAsset}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Trades</span>
              <span className="text-foreground">{stats.count.toLocaleString()}</span>
            </div>
          </>
        )}

        {/* Bid / Ask */}
        {bestBid && bestAsk && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-green-500">B {fmtPrice(bestBid.price)}</span>
            <span className="text-red-500">A {fmtPrice(bestAsk.price)}</span>
          </div>
        )}

        {/* WS indicator */}
        <div className="flex items-center gap-1 ml-auto">
          <div
            className={`w-2 h-2 rounded-full ${
              wsStatus === "open" ? "bg-green-500" : wsStatus === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-muted-foreground uppercase text-[10px]">{wsStatus}</span>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px] bg-card">
        {/* Left: chart + timeframe selector */}
        <div className="border-b-2 border-ink lg:border-b-0 lg:border-r-2">
          {/* Timeframe row */}
          <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border bg-muted/20">
            {INTERVALS.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setIntervalVal(tf.value)}
                className={`px-2.5 py-0.5 text-xs font-bold rounded transition-colors ${
                  interval === tf.value
                    ? "bg-foreground text-background"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="min-h-[420px] lg:min-h-[520px] xl:min-h-[600px]">
            {snap ? (
              <CandleChart
                ref={chartRef}
                initialCandles={snap.candles}
                height={520}
                quoteAsset={snap.quoteAsset}
              />
            ) : (
              <div className="flex items-center justify-center text-muted-foreground text-sm h-[320px] lg:h-[520px] xl:h-[600px]">
                {loadState === "loading" ? "Loading chart…" : "—"}
              </div>
            )}
          </div>
        </div>

        {/* Right: order book + trades */}
        <div className="flex flex-col gap-4">
          {/* Order book */}
          <div className="border border-border rounded-sm bg-card overflow-hidden lg:h-[360px] xl:h-[420px]">
            {snap ? (
              <OrderBookPanel
                bids={orderBook.bids}
                asks={orderBook.asks}
                lastPrice={livePrice ?? stats?.lastPrice ?? 0}
                quoteAsset={snap.quoteAsset}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                {loadState === "loading" ? "Loading…" : "—"}
              </div>
            )}
          </div>

          {/* Trades tape */}
          <div className="border border-border rounded-sm bg-card h-[220px] xl:h-[240px]">
            {snap ? (
              <TradesTapePanel trades={trades} quoteAsset={snap.quoteAsset} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                {loadState === "loading" ? "Loading…" : "—"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Binance pairs footer */}
      {snap && snap.binancePairsSameBase.length > 0 && (
        <div className="border-t-2 border-ink bg-muted/20 px-4 py-2 flex flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
            {snap.baseAsset} on Binance:
          </span>
          {snap.binancePairsSameBase.map((p) => (
            <a
              key={p.symbol}
              href={`/asset/binance/${p.symbol}`}
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                p.symbol === symbol
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.symbol}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
