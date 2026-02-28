import Parser from "rss-parser";
import type { NewsItem } from "./types";

const FETCH_TIMEOUT_MS = 8000;
const SUMMARY_MAX_LEN = 240;
const USER_AGENT =
  "Mozilla/5.0 (compatible; CryptoLosers/1.0; +https://github.com/first-order-coder/crypto_losers)";

function trimSummary(text: string | undefined): string | null {
  if (text == null || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length <= SUMMARY_MAX_LEN) return trimmed;
  return trimmed.slice(0, SUMMARY_MAX_LEN).trim() + "…";
}

function parsePubDate(pubDate: string | undefined, isoDate: string | undefined): string | null {
  const raw = isoDate ?? pubDate;
  if (raw == null || typeof raw !== "string") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function fetchRssItems(
  sourceId: string,
  sourceName: string,
  url: string,
): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new Parser();
    const feed = await parser.parseString(xml);
    const items: NewsItem[] = [];

    for (const entry of feed.items ?? []) {
      const title = entry.title?.trim();
      const link = entry.link?.trim();
      if (!title || !link) continue;

      const publishedAt = parsePubDate(entry.pubDate, entry.isoDate);
      const summary = trimSummary(entry.contentSnippet ?? entry.content);

      let tags: string[] = [];
      const rawCats = entry.categories;
      if (Array.isArray(rawCats)) {
        tags = rawCats
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.trim())
          .filter(Boolean);
      } else if (rawCats != null) {
        const s = String(rawCats).trim();
        if (s) tags = [s];
      }

      items.push({
        sourceId,
        sourceName,
        title,
        url: link,
        publishedAt,
        summary,
        tags,
        kind: "rss",
      });
    }

    return items;
  } catch {
    return [];
  }
}
