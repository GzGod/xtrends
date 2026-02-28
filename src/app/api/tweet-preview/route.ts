import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OEmbedResponse {
  author_name: string;
  author_url: string;
  html: string;
  url: string;
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  // Remove script tags
  $("script").remove();
  // Get text from blockquote
  const bq = $("blockquote");
  // Remove the last <a> (the "— Author (@handle) Date" link)
  bq.find("a").last().remove();
  return bq.text().trim().replace(/\s+/g, " ");
}

export async function GET(req: NextRequest) {
  const tweetId = req.nextUrl.searchParams.get("id");
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return NextResponse.json({ error: "Invalid tweet ID" }, { status: 400 });
  }

  const tweetUrl = `https://twitter.com/i/status/${tweetId}`;
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&lang=zh`;

  try {
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `oEmbed ${res.status}` }, { status: 502 });
    }

    const data: OEmbedResponse = await res.json();
    const fullText = extractTextFromHtml(data.html);

    return NextResponse.json(
      { text: fullText, author: data.author_name },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
