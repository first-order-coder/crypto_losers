export type NewsSource =
  | { id: string; name: string; kind: "rss"; url: string; enabled: boolean }
  | { id: string; name: string; kind: "binance_announcements"; url: string; enabled: boolean };

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "binance_ann",
    name: "Binance Announcements",
    kind: "binance_announcements",
    url: "https://www.binance.com/en/support/announcement",
    enabled: true,
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    kind: "rss",
    url: "https://cointelegraph.com/rss",
    enabled: true,
  },
  {
    id: "cryptoslate",
    name: "CryptoSlate",
    kind: "rss",
    url: "https://cryptoslate.com/feed/",
    enabled: true,
  },
  {
    id: "cryptopotato",
    name: "CryptoPotato",
    kind: "rss",
    url: "https://cryptopotato.com/feed/",
    enabled: true,
  },
  {
    id: "thedefiant",
    name: "The Defiant",
    kind: "rss",
    url: "https://thedefiant.io/feed/",
    enabled: true,
  },
];
