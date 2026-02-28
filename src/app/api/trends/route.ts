import { NextRequest, NextResponse } from "next/server";
import { scrapeTrends } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const group = searchParams.get("group") || "cn";
  const hours = parseInt(searchParams.get("hours") || "4");
  const tag = searchParams.get("tag") || undefined;

  try {
    const data = await scrapeTrends(group, hours, tag);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
