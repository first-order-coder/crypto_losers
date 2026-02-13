import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-8 pb-6">
      <Separator className="mb-4" />
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
        <p>Informational only. Not financial advice.</p>
        <p>
          Data sources:{" "}
          <a
            href="https://www.binance.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Binance
          </a>
          {" · "}
          <a
            href="https://www.coingecko.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            CoinGecko
          </a>
        </p>
      </div>
    </footer>
  );
}
