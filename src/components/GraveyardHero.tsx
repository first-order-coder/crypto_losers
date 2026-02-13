export function GraveyardHero() {
  return (
    <section className="flex flex-col items-center text-center py-16 md:py-24">
      {/* Badge */}
      <div className="ink-border rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-6 bg-white">
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
          className="btn-ink inline-flex items-center justify-center bg-orange-400 hover:bg-orange-500 text-black font-bold px-8 py-3 rounded-lg text-sm uppercase tracking-wider"
        >
          Explore Now
        </a>
        <a
          href="#email"
          className="btn-ink inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-lg text-sm uppercase tracking-wider"
        >
          Email Me This List
        </a>
      </div>
    </section>
  );
}
