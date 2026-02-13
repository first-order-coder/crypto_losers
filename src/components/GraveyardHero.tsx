"use client";

import dynamic from "next/dynamic";

const ThemeToggle = dynamic(
  () => import("@/components/ThemeToggle").then((m) => ({ default: m.ThemeToggle })),
  { ssr: false },
);

export function GraveyardHero() {
  return (
    <section className="relative flex flex-col items-center text-center py-16 md:py-24">
      {/* Theme toggle — top-right */}
      <div className="absolute right-0 top-4 md:top-6">
        <ThemeToggle />
      </div>

      {/* Badge */}
      <div className="ink-border rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-6 bg-card">
        Binance Spot &bull; Top Losers
      </div>

      {/* Title */}
      <h1 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase tracking-tight leading-[0.95] font-black mb-4">
        The Crypto Losers
      </h1>

      {/* Subtitle */}
      <p className="text-lg md:text-xl text-muted-foreground mb-10">
        Where 24h losers get buried.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="#results"
          className="btn-ink inline-flex items-center justify-center bg-accent-orange hover:opacity-90 font-bold px-8 py-3 rounded-lg text-sm uppercase tracking-wider"
          style={{ color: "var(--accent-orange-text, #000000)" }}
        >
          Explore Now
        </a>
        <a
          href="#email"
          className="btn-ink inline-flex items-center justify-center bg-accent-blue hover:opacity-90 font-bold px-8 py-3 rounded-lg text-sm uppercase tracking-wider"
          style={{ color: "var(--accent-blue-text, #ffffff)" }}
        >
          Email Me This List
        </a>
      </div>
    </section>
  );
}
