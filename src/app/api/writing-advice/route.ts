import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TweetSummary {
  rank: number;
  author: string;
  content: string;
  views: string;
  likes: string;
  heatScore: number;
  tags: string[];
}

interface RequestBody {
  tweets: TweetSummary[];
  domainTags: { name: string; count: number }[];
  hotTags: { name: string; count: number }[];
  group: string;
  hours: number;
}

function buildPrompt(body: RequestBody): string {
  const { tweets, domainTags, hotTags, group, hours } = body;

  const groupLabel = group === "cn" ? "中文推特圈" : group === "en" ? "英文推特圈" : "全球推特";
  const top20 = tweets.slice(0, 20);

  const tweetLines = top20
    .map(
      (t, i) =>
        `${i + 1}. [热度${t.heatScore.toFixed(0)}|${t.views}浏览] ${t.content}（@${t.author}）`
    )
    .join("\n");

  const domainStr = domainTags.map((t) => `${t.name}(${t.count}条)`).join("、");
  const hotStr = hotTags
    .slice(0, 8)
    .map((t) => `#${t.name}(${t.count})`)
    .join(" ");

  return `你是一位专业的社交媒体内容策略师，擅长分析推特热点并给出写作建议。

当前数据：${groupLabel}，过去 ${hours} 小时热门推文 TOP 20：

${tweetLines}

领域分布：${domainStr}
热门话题标签：${hotStr}

请基于以上数据，给出一份简洁实用的写作建议报告，包含以下四个部分：

## 🔥 当前最热选题方向（3个）
列出3个最值得写的选题方向，每个说明为什么热、适合什么角度切入。

## 📝 内容创作建议（3条）
针对当前热点，给出具体的内容创作策略建议。

## 💡 推荐标题示例（5个）
给出5个可以直接用或参考的推文/文章标题，要有吸引力、符合当前热点。

## ⚡ 快速行动建议
1-2句话，告诉创作者现在最应该做什么。

要求：语言简洁有力，避免废话，每条建议要具体可执行。`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY;
  const apiBase = process.env.AI_API_BASE || "https://max.openai365.top/v1";
  const model = process.env.AI_MODEL || "claude-3-7-sonnet";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = buildPrompt(body);

  // Stream response from AI
  const aiRes = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 1200,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the SSE stream directly to client
  return new Response(aiRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
