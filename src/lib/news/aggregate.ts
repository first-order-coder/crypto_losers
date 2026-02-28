import { NEWS_SOURCES } from "@/config/newsSources";
import { fetchRssItems } from "./rss";
import { fetchBinanceAnnouncements } from "./binanceAnnouncements";
import type { NewsItem } from "./types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeywords(item: NewsItem, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  for (const kw of keywords) {
    const lower = kw.toLowerCase().trim();
    if (!lower) continue;
    // Symbol-like (short, no spaces): word boundary
    if (lower.length <= 6 && /^[a-z0-9]+$/i.test(lower)) {
      const re = new RegExp(`\\b${escapeRegExp(lower)}\\b`, "i");
      if (re.test(text)) return true;
    } else {
      if (text.includes(lower)) return true;
    }
  }
  return false;
}

export async function getNewsItems(params: {
  keywords: string[];
  limit: number;
  sourceId?: string;
}): Promise<NewsItem[]> {
  const { keywords, limit, sourceId } = params;
  const sources = NEWS_SOURCES.filter((s) => s.enabled && (sourceId == null || s.id === sourceId));
  if (sources.length === 0) return [];

  const results = await Promise.allSettled(
    sources.map((source) => {
      if (source.kind === "rss") {
        return fetchRssItems(source.id, source.name, source.url);
      }
      return fetchBinanceAnnouncements(source.id, source.name, source.url);
    }),
  );

  const all: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      all.push(...result.value);
    }
  }

  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all) {
    const key = item.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!matchesKeywords(item, keywords)) continue;
    deduped.push(item);
  }

  deduped.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  return deduped.slice(0, limit);
}
