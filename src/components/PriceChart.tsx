"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

export interface ChartDataPoint {
  t: number;
  price: number;
}

interface PriceChartProps {
  data: ChartDataPoint[];
  theme?: "dark" | "light";
  height?: number;
}

export function PriceChart({
  data,
  theme: themeProp,
  height = 320,
}: PriceChartProps) {
  const effectiveTheme = themeProp ?? "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = effectiveTheme === "dark";
    const bg = isDark ? "#0B0F19" : "#ffffff";
    const text = isDark ? "#E5E7EB" : "#111111";
    const grid = isDark ? "#334155" : "#e5e7eb";
    const lineColor =
      typeof document !== "undefined"
        ? getComputedStyle(document.documentElement)
            .getPropertyValue("--accent-blue")
            .trim() || (isDark ? "#22D3EE" : "#3b82f6")
        : isDark
          ? "#22D3EE"
          : "#3b82f6";

    const chart = createChart(container, {
      layout: {
        background: { color: bg },
        textColor: text,
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: {
        borderColor: grid,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: grid,
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    const chartData =
      data?.map((d) => ({
        time: Math.floor(d.t / 1000) as UTCTimestamp,
        value: d.price,
      })) ?? [];

    if (chartData.length > 0) {
      lineSeries.setData(chartData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, effectiveTheme, height]);

  if (!data?.length) {
    return (
      <div
        className="ink-border-2 rounded-md flex items-center justify-center bg-card text-muted-foreground text-sm"
        style={{ minHeight: height }}
      >
        No chart data available
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}
