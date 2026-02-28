import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getNewsItems } from "@/lib/news/aggregate";

const QuerySchema = z.object({
  q: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  source: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      source: searchParams.get("source") ?? undefined,
    });

    const limit = parsed.success ? parsed.data.limit : 20;
    const source = parsed.success ? parsed.data.source : undefined;
    const qRaw = parsed.success ? parsed.data.q : "";
    const q = qRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const items = await getNewsItems({ keywords: q, limit, sourceId: source });
    const updatedAt = new Date().toISOString();

    return NextResponse.json({
      updatedAt,
      q,
      items,
    });
  } catch {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        q: [],
        items: [],
      },
      { status: 200 },
    );
  }
}
