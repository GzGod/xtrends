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
  timestamp?: string;
}

export interface TrendData {
  tweets: Tweet[];
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
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  return parseTrends(html, group, hours);
}

function parseTrends(html: string, group: string, hours: number): TrendData {
  const $ = cheerio.load(html);
  const tweets: Tweet[] = [];
  const hotTags: { name: string; count: number }[] = [];

  // Parse hot tags
  $("[class*='tag'], [class*='Tag']").each((_, el) => {
    const text = $(el).text().trim();
    const countEl = $(el).find("[class*='count'], span").last();
    const count = parseInt(countEl.text().replace(/\D/g, "")) || 0;
    if (text && count > 0) {
      hotTags.push({ name: text, count });
    }
  });

  // Parse tweet cards - try multiple selectors
  const tweetSelectors = [
    "article",
    "[class*='tweet']",
    "[class*='Tweet']",
    "[class*='card']",
    "li[class*='item']",
    "div[class*='item']",
  ];

  let tweetEls = $("");
  for (const sel of tweetSelectors) {
    const found = $(sel);
    if (found.length > 5) {
      tweetEls = found;
      break;
    }
  }

  tweetEls.each((index, el) => {
    const $el = $(el);

    // Extract text content
    const allText = $el.text().trim();
    if (!allText || allText.length < 10) return;

    // Try to find author/handle
    const handleEl = $el.find("[class*='handle'], [class*='username'], a[href*='twitter.com'], a[href*='x.com']").first();
    const handle = handleEl.text().trim().replace(/^@/, "") || "";

    const nameEl = $el.find("[class*='name'], [class*='author']").first();
    const author = nameEl.text().trim() || handle;

    // Avatar
    const avatarEl = $el.find("img").first();
    const avatar = avatarEl.attr("src") || "";

    // Content - find the main text block
    const contentEl = $el.find("p, [class*='content'], [class*='text'], [class*='body']").first();
    const content = contentEl.text().trim() || allText.slice(0, 200);

    // Metrics
    const numbers = allText.match(/[\d,.]+[KkMm]?/g) || [];
    const views = numbers[0] || "0";
    const likes = numbers[1] || "0";
    const retweets = numbers[2] || "0";

    // Heat score
    const heatEl = $el.find("[class*='heat'], [class*='score'], [class*='rank']").first();
    const heatText = heatEl.text().trim();
    const heatScore = parseFloat(heatText) || (100 - index) / 100;

    // Tags from data attributes or class names
    const tags: string[] = [];
    const tagEls = $el.find("[class*='tag'], [data-tag]");
    tagEls.each((_, t) => {
      const tagText = $(t).text().trim();
      if (tagText && tagText.length < 20) tags.push(tagText);
    });

    // Tweet URL
    const linkEl = $el.find("a[href*='twitter.com/'], a[href*='x.com/']").first();
    const tweetUrl = linkEl.attr("href") || "";
    const tweetId = tweetUrl.match(/status\/(\d+)/)?.[1] || String(index);

    if (content.length > 10) {
      tweets.push({
        id: tweetId,
        rank: index + 1,
        author: author || `User ${index + 1}`,
        handle,
        avatar,
        content,
        views,
        likes,
        retweets,
        heatScore: Math.min(1, Math.max(0, heatScore)),
        tags,
        url: tweetUrl,
      });
    }
  });

  return {
    tweets: tweets.slice(0, 100),
    hotTags: hotTags.slice(0, 20),
    fetchedAt: new Date().toISOString(),
    group,
    hours,
  };
}
