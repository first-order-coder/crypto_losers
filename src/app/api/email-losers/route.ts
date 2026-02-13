import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { computeLosers } from "@/lib/losers";
import { rateLimit } from "@/lib/rateLimit";
import { getRequestIp } from "@/lib/ip";
import { buildLosersEmailHtml } from "@/lib/emailTemplates";

// ── Request body schema ─────────────────────────────────────────────
const BodySchema = z.object({
  email: z.string().email("Invalid email address"),
  quote: z.string().toUpperCase().default("USDT"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  minQuoteVolume: z.coerce.number().min(0).default(1_000_000),
  excludeLeveraged: z.boolean().default(true),
});

// ── POST handler ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Rate limiting (runs first to block abusive clients before any work)
  const ip = getRequestIp(request);
  const rl = await rateLimit(`email:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });

  if (!rl.allowed) {
    const retryAfterSec = Math.ceil(rl.resetMs / 1000);
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Try again in ${retryAfterSec}s.` },
      { status: 429 }
    );
  }

  // Check env vars
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!apiKey || !emailFrom) {
    return NextResponse.json(
      { ok: false, error: "Email service is not configured" },
      { status: 500 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, ...losersParams } = parsed.data;

  try {
    // Compute losers using shared logic
    const losers = await computeLosers(losersParams);

    if (losers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No losers found for the given parameters" },
        { status: 404 }
      );
    }

    // Build email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const html = buildLosersEmailHtml({
      updatedAt: new Date().toISOString(),
      losers,
      quote: losersParams.quote,
      exchange: "Binance Spot",
      siteUrl,
    });

    // Send via Resend
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `Crypto Losers Snapshot – ${losersParams.quote} (${losers.length} tokens)`,
      html,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
