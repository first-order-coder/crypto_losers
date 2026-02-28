import type { NewsItem } from "./types";

const BINANCE_ORIGIN = "https://www.binance.com";
const FALLBACK_LIMIT = 30;
const FETCH_TIMEOUT_MS = 10000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; CryptoLosers/1.0; +https://github.com/first-order-coder/crypto_losers)";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isObject(v: JsonValue): v is Record<string, JsonValue> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function isString(v: JsonValue): v is string {
  return typeof v === "string";
}

function isNumber(v: JsonValue): v is number {
  return typeof v === "number";
}

/** Recursively find arrays of objects that have title + (releaseDate|publishDate) + (code|id|url). */
function findAnnouncementsArray(node: JsonValue): Array<{ title: string; date: number | string; url: string }> | null {
  if (Array.isArray(node)) {
    const out: Array<{ title: string; date: number | string; url: string }> = [];
    for (const item of node) {
      if (!isObject(item)) continue;
      const title = item.title ?? item.name;
      const date = item.releaseDate ?? item.publishDate ?? item.date;
      const code = item.code ?? item.id ?? item.slug;
      const urlVal = item.url;
      if (isString(title) && title.trim() && (isNumber(date) || isString(date))) {
        let url = "";
        if (isString(urlVal) && urlVal.startsWith("http")) {
          url = urlVal;
        } else if (isString(code)) {
          url = `${BINANCE_ORIGIN}/en/support/announcement/${encodeURIComponent(code)}`;
        } else {
          continue;
        }
        out.push({ title: title.trim(), date, url });
      }
    }
    if (out.length > 0) return out;
    return null;
  }
  if (isObject(node)) {
    for (const key of Object.keys(node)) {
      const found = findAnnouncementsArray(node[key]);
      if (found) return found;
    }
  }
  return null;
}

/** Extract __NEXT_DATA__ JSON and try to find announcements list. */
function tryNextData(html: string): NewsItem[] {
  const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"\s*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return [];

  try {
    const data = JSON.parse(match[1]) as JsonValue;
    const list = findAnnouncementsArray(data);
    if (!list) return [];

    const items: NewsItem[] = list.slice(0, FALLBACK_LIMIT).map((a) => {
      let publishedAt: string | null = null;
      if (typeof a.date === "number") {
        const d = a.date < 1e12 ? new Date(a.date * 1000) : new Date(a.date);
        if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
      } else if (typeof a.date === "string") {
        const d = new Date(a.date);
        if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
      }
      return {
        sourceId: "binance_ann",
        sourceName: "Binance Announcements",
        title: a.title,
        url: a.url,
        publishedAt,
        summary: null,
        tags: [],
        kind: "binance_announcements",
      };
    });
    return items;
  } catch {
    return [];
  }
}

/** Fallback: parse anchors with /support/announcement/ in href. */
function fallbackAnchors(html: string, sourceId: string, sourceName: string): NewsItem[] {
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  // Match <a ... href="...support/announcement/...">...text...</a> (allow relative paths)
  const regex = /<a\s+[^>]*href=["']([^"']*\/support\/announcement\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null && items.length < FALLBACK_LIMIT) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const url = href.startsWith("http") ? href : `${BINANCE_ORIGIN}${href.startsWith("/") ? "" : "/"}${href}`;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({
      sourceId,
      sourceName,
      title: text,
      url,
      publishedAt: null,
      summary: null,
      tags: [],
      kind: "binance_announcements",
    });
  }
  return items;
}

export async function fetchBinanceAnnouncements(
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
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const html = await res.text();

    const fromNext = tryNextData(html);
    if (fromNext.length > 0) return fromNext;

    return fallbackAnchors(html, sourceId, sourceName);
  } catch {
    return [];
  }
}
