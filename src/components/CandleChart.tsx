"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

export interface FullCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  takerBuyBase?: number;
  takerBuyQuote?: number;
  closeTime?: number;
}

export interface CandleChartHandle {
  setData: (candles: FullCandle[]) => void;
  updateCandle: (candle: FullCandle) => void;
}

interface LegendState {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  change: string;
  changePct: string;
  volume: string;
  trades: string;
  isUp: boolean;
}

interface CandleChartProps {
  initialCandles: FullCandle[];
  height?: number;
  quoteAsset?: string;
}

// format a number with commas and fixed decimals
function fmtPrice(v: number, maxDec = 8): string {
  if (!isFinite(v)) return "—";
  const s = v.toPrecision(6);
  return parseFloat(s).toLocaleString("en-US", {
    maximumFractionDigits: maxDec,
    minimumFractionDigits: 0,
  });
}
function fmtVol(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return v.toFixed(2);
}

const UP_COLOR = "#22c55e";
const DOWN_COLOR = "#ef4444";
const UP_ALPHA = "#22c55e55";
const DOWN_ALPHA = "#ef444455";

const CandleChart = React.forwardRef<CandleChartHandle, CandleChartProps>(
  function CandleChart({ initialCandles, height = 420, quoteAsset = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const csRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const candlesRef = useRef<FullCandle[]>(initialCandles);
    const [legend, setLegend] = useState<LegendState | null>(null);

    // Build chart on mount only
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const getCss = (name: string, fallback: string) =>
        typeof document !== "undefined"
          ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
          : fallback;

      const bg = getCss("--card", "#ffffff");
      const ink = getCss("--ink", "#111111");
      const border = getCss("--border", "#e2e8f0");
      const gridColor = border + "80";

      const chart = createChart(container, {
        layout: { background: { color: bg }, textColor: ink, fontSize: 11 },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        rightPriceScale: { borderColor: border, scaleMargins: { top: 0.05, bottom: 0.25 } },
        timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
        crosshair: { mode: 1 },
        height,
        width: container.clientWidth,
      });
      chartRef.current = chart;

      // Candlestick series
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: UP_COLOR,
        borderUpColor: UP_COLOR,
        wickUpColor: UP_COLOR,
        downColor: DOWN_COLOR,
        borderDownColor: DOWN_COLOR,
        wickDownColor: DOWN_COLOR,
        priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
      });
      csRef.current = cs;

      // Volume histogram overlaid at bottom 22% of same pane
      const vol = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      });
      volRef.current = vol;

      // Seed with initial data
      if (candlesRef.current.length > 0) {
        cs.setData(
          candlesRef.current.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
        vol.setData(
          candlesRef.current.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? UP_ALPHA : DOWN_ALPHA,
          })),
        );
        chart.timeScale().fitContent();
      }

      // Hover legend
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.seriesData) { setLegend(null); return; }
        const cData = param.seriesData.get(cs) as
          | { open: number; high: number; low: number; close: number }
          | undefined;
        const vData = param.seriesData.get(vol) as { value: number } | undefined;
        if (!cData) { setLegend(null); return; }

        const d = new Date((param.time as number) * 1000);
        const timeStr = d.toLocaleString("en-US", {
          month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: false,
        });

        // Find matching candle for extra fields
        const matched = candlesRef.current.find((c) => c.time === (param.time as number));
        const change = cData.close - cData.open;
        const changePct = cData.open !== 0 ? (change / cData.open) * 100 : 0;
        const isUp = change >= 0;

        setLegend({
          time: timeStr,
          open: fmtPrice(cData.open),
          high: fmtPrice(cData.high),
          low: fmtPrice(cData.low),
          close: fmtPrice(cData.close),
          change: (isUp ? "+" : "") + fmtPrice(change),
          changePct: (isUp ? "+" : "") + changePct.toFixed(2) + "%",
          volume: fmtVol(vData?.value ?? matched?.volume ?? 0),
          trades: matched?.trades != null ? matched.trades.toLocaleString() : "—",
          isUp,
        });
      });

      // ResizeObserver
      const ro = new ResizeObserver(() => {
        if (container && chartRef.current) {
          chartRef.current.applyOptions({ width: container.getBoundingClientRect().width });
        }
      });
      ro.observe(container);

      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        csRef.current = null;
        volRef.current = null;
      };
    }, [height]); // only rebuild on height change

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        setData: (candles: FullCandle[]) => {
          candlesRef.current = candles;
          if (!csRef.current || !volRef.current) return;
          csRef.current.setData(
            candles.map((c) => ({
              time: c.time as UTCTimestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            })),
          );
          volRef.current.setData(
            candles.map((c) => ({
              time: c.time as UTCTimestamp,
              value: c.volume,
              color: c.close >= c.open ? UP_ALPHA : DOWN_ALPHA,
            })),
          );
          chartRef.current?.timeScale().fitContent();
        },
        updateCandle: (candle: FullCandle) => {
          // Update candlesRef last entry or append
          const arr = candlesRef.current;
          if (arr.length > 0 && arr[arr.length - 1].time === candle.time) {
            arr[arr.length - 1] = candle;
          } else if (arr.length === 0 || arr[arr.length - 1].time < candle.time) {
            arr.push(candle);
          }
          if (!csRef.current || !volRef.current) return;
          csRef.current.update({
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          });
          volRef.current.update({
            time: candle.time as UTCTimestamp,
            value: candle.volume,
            color: candle.close >= candle.open ? UP_ALPHA : DOWN_ALPHA,
          });
        },
      }),
      [],
    );

    // Sync initialCandles when prop changes (interval switch handled by parent via ref.setData)
    const prevInitRef = useRef<FullCandle[]>([]);
    const onNewInitialCandles = useCallback(
      (candles: FullCandle[]) => {
        if (candles === prevInitRef.current) return;
        prevInitRef.current = candles;
        candlesRef.current = candles;
        if (!csRef.current || !volRef.current) return;
        csRef.current.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
        volRef.current.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? UP_ALPHA : DOWN_ALPHA,
          })),
        );
        chartRef.current?.timeScale().fitContent();
      },
      [],
    );

    useEffect(() => {
      onNewInitialCandles(initialCandles);
    }, [initialCandles, onNewInitialCandles]);

    if (!initialCandles.length) {
      return (
        <div
          className="flex items-center justify-center bg-card text-muted-foreground text-sm"
          style={{ height }}
        >
          No chart data available
        </div>
      );
    }

    return (
      <div className="relative w-full select-none">
        {/* Hover legend */}
        <div className="absolute top-2 left-3 z-10 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-mono pointer-events-none">
          {legend ? (
            <>
              <span className="text-muted-foreground">{legend.time}</span>
              <span>
                <span className="text-muted-foreground">O </span>
                <span>{legend.open}</span>
              </span>
              <span>
                <span className="text-muted-foreground">H </span>
                <span>{legend.high}</span>
              </span>
              <span>
                <span className="text-muted-foreground">L </span>
                <span>{legend.low}</span>
              </span>
              <span>
                <span className="text-muted-foreground">C </span>
                <span>{legend.close}</span>
              </span>
              <span className={legend.isUp ? "text-green-500" : "text-red-500"}>
                {legend.change} ({legend.changePct})
              </span>
              <span>
                <span className="text-muted-foreground">Vol </span>
                <span>{legend.volume}{quoteAsset ? " " + quoteAsset : ""}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Trades </span>
                <span>{legend.trades}</span>
              </span>
            </>
          ) : null}
        </div>
        <div ref={containerRef} className="w-full" />
      </div>
    );
  },
);

CandleChart.displayName = "CandleChart";
export { CandleChart };
