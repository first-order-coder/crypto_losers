import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeLosers } from "@/lib/losers";

// ── Query-param schema (coerces strings from URL search params) ─────
const QuerySchema = z.object({
  quote: z
    .string()
    .toUpperCase()
    .default("USDT"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  minQuoteVolume: z.coerce
    .number()
    .min(0)
    .default(1_000_000),
  excludeLeveraged: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

// ── GET handler ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const losers = await computeLosers(parsed.data);

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      exchange: "binance",
      quote: parsed.data.quote,
      limit: parsed.data.limit,
      losers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch tickers", detail: message },
      { status: 502 }
    );
  }
}
