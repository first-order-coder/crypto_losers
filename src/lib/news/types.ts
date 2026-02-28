export type NewsItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string | null; // ISO string if available
  summary: string | null;
  tags: string[]; // optional categories/labels
  kind: "rss" | "binance_announcements";
};
