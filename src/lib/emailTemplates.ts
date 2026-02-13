import { type Loser } from "@/lib/losers";
import { formatPrice, formatPct, formatCompact, formatFull } from "@/lib/number";

// ── Shared inline-style constants ───────────────────────────────────
// Gmail strips <style> blocks and <link> tags, so everything must be
// inline. These constants keep the template DRY without external CSS.

const FONT =
  "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO =
  "'SF Mono', 'Cascadia Mono', 'Consolas', 'Liberation Mono', monospace";

const COLOR = {
  bg: "#f4f4f5",
  card: "#ffffff",
  border: "#e4e4e7",
  text: "#18181b",
  muted: "#71717a",
  faint: "#a1a1aa",
  red: "#dc2626",
  green: "#16a34a",
  headerBg: "#fafafa",
  accent: "#3b82f6",
} as const;

const CELL_BASE = `padding:6px 10px;font-family:${MONO};font-size:12px;`;
const TH_BASE = `padding:8px 10px;font-family:${FONT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${COLOR.muted};`;

// ── Public API ──────────────────────────────────────────────────────

export interface BuildLosersEmailHtmlParams {
  updatedAt: string; // ISO string
  losers: Loser[];
  quote: string;
  exchange: string;
  siteUrl: string;
}

export function buildLosersEmailHtml({
  updatedAt,
  losers,
  quote,
  exchange,
  siteUrl,
}: BuildLosersEmailHtmlParams): string {
  const timestamp = new Date(updatedAt).toUTCString();
  const count = losers.length;

  // ── Rows ────────────────────────────────────────────────────────
  const rows = losers
    .map((l, i) => {
      const href = siteUrl
        ? `${siteUrl}/asset/binance/${l.symbol}`
        : `#`;

      const isNeg = l.changePct24h < 0;
      const pctColor = isNeg ? COLOR.red : COLOR.green;
      const stripedBg = i % 2 === 0 ? COLOR.card : "#fafafa";

      return `<tr style="background:${stripedBg};">
  <td style="${CELL_BASE}text-align:right;color:${COLOR.muted};padding-right:6px;">${i + 1}</td>
  <td style="${CELL_BASE}text-align:left;font-family:${FONT};font-weight:600;">
    <a href="${href}" style="color:${COLOR.text};text-decoration:none;">${l.symbol}</a>
  </td>
  <td style="${CELL_BASE}text-align:right;">$${formatPrice(l.lastPrice)}</td>
  <td style="${CELL_BASE}text-align:right;color:${pctColor};font-weight:600;">${formatPct(l.changePct24h)}</td>
  <td style="${CELL_BASE}text-align:right;" title="$${formatFull(l.quoteVolume24h)}">$${formatCompact(l.quoteVolume24h)}</td>
  <td style="${CELL_BASE}text-align:right;">$${formatPrice(l.highPrice24h)}</td>
  <td style="${CELL_BASE}text-align:right;">$${formatPrice(l.lowPrice24h)}</td>
</tr>`;
    })
    .join("\n");

  // ── Full document ───────────────────────────────────────────────
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crypto Losers Snapshot</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};">
<tr><td align="center" style="padding:24px 12px;">

  <!-- Card -->
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:8px;overflow:hidden;">

    <!-- Header -->
    <tr><td style="padding:20px 20px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h1 style="margin:0;font-size:18px;font-weight:700;color:${COLOR.text};line-height:1.3;">
              Crypto Losers Snapshot
            </h1>
          </td>
          <td style="text-align:right;vertical-align:bottom;">
            <span style="font-size:11px;font-weight:600;color:${COLOR.accent};text-transform:uppercase;letter-spacing:0.05em;">
              ${count} tokens
            </span>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Meta bar -->
    <tr><td style="padding:0 20px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.headerBg};border-radius:6px;border:1px solid ${COLOR.border};">
        <tr>
          <td style="padding:8px 12px;font-size:11px;color:${COLOR.muted};">
            <strong style="color:${COLOR.text};">Exchange:</strong> ${exchange}
          </td>
          <td style="padding:8px 12px;font-size:11px;color:${COLOR.muted};">
            <strong style="color:${COLOR.text};">Quote:</strong> ${quote}
          </td>
          <td style="padding:8px 12px;font-size:11px;color:${COLOR.muted};text-align:right;">
            ${timestamp}
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Data table -->
    <tr><td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;color:${COLOR.text};">
        <thead>
          <tr style="border-bottom:2px solid ${COLOR.border};background:${COLOR.headerBg};">
            <th style="${TH_BASE}text-align:right;width:32px;padding-right:6px;">#</th>
            <th style="${TH_BASE}text-align:left;">Symbol</th>
            <th style="${TH_BASE}text-align:right;">Price</th>
            <th style="${TH_BASE}text-align:right;">24h&nbsp;%</th>
            <th style="${TH_BASE}text-align:right;">Volume</th>
            <th style="${TH_BASE}text-align:right;">High</th>
            <th style="${TH_BASE}text-align:right;">Low</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 20px;">
      <div style="border-top:1px solid ${COLOR.border};"></div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:16px 20px 20px;">
      <p style="margin:0 0 6px;font-size:11px;color:${COLOR.muted};text-align:center;line-height:1.5;">
        You requested this snapshot from
        <a href="${siteUrl || "#"}" style="color:${COLOR.accent};text-decoration:none;font-weight:600;">Crypto Losers</a>.
        This is a one-time send &mdash; no subscription was created.
      </p>
      <p style="margin:0;font-size:10px;color:${COLOR.faint};text-align:center;line-height:1.5;">
        Informational only. Not financial advice. Data sourced from Binance and CoinGecko.
        Verify all information independently before making any decisions.
      </p>
    </td></tr>

  </table>
  <!-- /Card -->

</td></tr>
</table>
<!-- /Wrapper -->

</body>
</html>`;
}
