import * as cheerio from "cheerio";

export interface Tweet {
  id: string;
  rank: number;
  author: string;
  handle: string;
  avatar: string;
  content: string;
  views: string;
  likes: string;
  retweets: string;
  heatScore: number;
  tags: string[];
  url: string;
}

export interface TrendData {
  tweets: Tweet[];
  domainTags: { name: string; count: number }[];
  hotTags: { name: string; count: number }[];
  fetchedAt: string;
  group: string;
  hours: number;
}

const BASE_URL = "https://trends.xhunt.ai";

export async function scrapeTrends(
  group = "cn",
  hours = 4,
  tag?: string
): Promise<TrendData> {
  const params = new URLSearchParams({ group, hours: String(hours) });
  if (tag) params.set("tag", tag);

  const url = `${BASE_URL}/zh/tweets?${params}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: BASE_URL,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  return parseTrends(html, group, hours);
}

function parseTrends(html: string, group: string, hours: number): TrendData {
  const $ = cheerio.load(html);
  const tweets: Tweet[] = [];

  // Each tweet: li > a[href*="twitter.com/*/status/"]
  $("li").each((_, li) => {
    const $a = $(li).find('a[href*="twitter.com/"][href*="/status/"]').first();
    if (!$a.length) return;

    const url = $a.attr("href") || "";
    const tweetId = url.match(/status\/(\d+)/)?.[1] || "";
    if (!tweetId) return;

    // Rank from aria-label="Rank N"
    const rankText = $a.find('[aria-label^="Rank"]').first().text().trim();
    const rank = parseInt(rankText) || 0;

    // Avatar
    const avatar = $a.find("img").first().attr("src") || "";

    // Author name: p with text-slate-100 class
    const author = $a.find("p.text-slate-100").first().text().trim();

    // Handle: p.text-slate-500 starting with @
    let handle = "";
    $a.find("p.text-slate-500").each((_, p) => {
      const t = $(p).text().trim();
      if (t.startsWith("@")) {
        handle = t.replace(/^@/, "");
        return false;
      }
    });

    // Tweet content: p.text-slate-400
    const content = $a.find("p.text-slate-400").first().text().trim();

    // Metrics
    const views =
      $a.find('span[title="Views"] .tabular-nums').first().text().trim() || "0";
    const likes =
      $a.find('span[title="Likes"] .tabular-nums').first().text().trim() || "0";
    const retweets =
      $a.find('span[title="Retweets"] .tabular-nums').first().text().trim() || "0";

    // Heat score: span[title^="热度"]
    const heatText = $a
      .find('span[title^="热度"] .tabular-nums')
      .first()
      .text()
      .trim();
    const heatScore = parseFloat(heatText) || 0;

    if (author && content) {
      tweets.push({
        id: tweetId,
        rank,
        author,
        handle,
        avatar,
        content,
        views,
        likes,
        retweets,
        heatScore,
        tags: [],
        url,
      });
    }
  });

  // Parse domain tags and hot tags from filter area
  const domainTags: { name: string; count: number }[] = [];
  const hotTags: { name: string; count: number }[] = [];

  $('a[href*="/zh/tweets?"][href*="tag="]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href") || "";
    const tagMatch = href.match(/tag=([^&]+)/);
    if (!tagMatch) return;

    const tagName = decodeURIComponent(tagMatch[1]);
    const spans = $el.find("span");
    const countText = spans.last().text().replace(/[()]/g, "").trim();
    const count = parseInt(countText) || 0;

    // Hot tags have inline rgba style, domain tags don't
    const style = $el.attr("style") || "";
    if (style.includes("rgba")) {
      hotTags.push({ name: tagName, count });
    } else {
      domainTags.push({ name: tagName, count });
    }
  });

  return {
    tweets: tweets.slice(0, 200),
    domainTags,
    hotTags,
    fetchedAt: new Date().toISOString(),
    group,
    hours,
  };
}
