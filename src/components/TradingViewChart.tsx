"use client";

import React, { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: (config: unknown) => void;
    };
  }
}

type TvTheme = "dark" | "light";

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  theme: TvTheme;
  fallback?: React.ReactNode;
}

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

let tvScriptLoading: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("TradingView script can only be loaded in the browser"));
  }

  if (window.TradingView) {
    return Promise.resolve();
  }

  if (tvScriptLoading) {
    return tvScriptLoading;
  }

  tvScriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TV_SCRIPT_SRC}"]`,
    );

    const handleLoaded = () => {
      if (window.TradingView) {
        resolve();
      } else {
        reject(new Error("TradingView global not available after script load"));
      }
    };

    if (existing) {
      existing.addEventListener("load", handleLoaded, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load TradingView script")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.onload = handleLoaded;
    script.onerror = () => reject(new Error("Failed to load TradingView script"));
    document.head.appendChild(script);
  });

  return tvScriptLoading;
}

export function TradingViewChart({
  symbol,
  interval = "60",
  height = 560,
  theme,
  fallback,
}: TradingViewChartProps) {
  const containerId = useId().replace(/:/g, "-");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    const timeoutId = window.setTimeout(() => {
      if (!window.TradingView && !cancelled) {
        setFailed(true);
      }
    }, 5000);

    loadTradingViewScript()
      .then(() => {
        if (cancelled) return;
        if (!window.TradingView) {
          setFailed(true);
          return;
        }

        try {
          // Clear again just in case
          container.innerHTML = "";
          window.TradingView.widget({
            autosize: true,
            symbol: `BINANCE:${symbol}`,
            interval,
            timezone: "Etc/UTC",
            theme,
            style: "1",
            locale: "en",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: false,
            save_image: false,
            container_id: containerId,
          });
        } catch {
          if (!cancelled) {
            setFailed(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      const el = document.getElementById(containerId);
      if (el) {
        el.innerHTML = "";
      }
    };
  }, [symbol, interval, theme, containerId]);

  if (failed && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="w-full" style={{ height }}>
      <div id={containerId} className="w-full h-full" />
    </div>
  );
}

