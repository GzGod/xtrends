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
  mode: "topics" | "article";
  model?: string;
  tweets: TweetSummary[];
  domainTags: { name: string; count: number }[];
  hotTags: { name: string; count: number }[];
  group: string;
  hours: number;
  // article mode only
  topic?: string;
  format?: "short" | "long";
}

function buildTopicsPrompt(body: RequestBody): string {
  const { tweets, domainTags, hotTags, group, hours } = body;
  const groupLabel = group === "cn" ? "中文推特圈" : group === "en" ? "英文推特圈" : "全球推特";
  const top20 = tweets.slice(0, 20);

  const tweetLines = top20
    .map((t, i) => `${i + 1}. [热度${t.heatScore.toFixed(0)}|${t.views}浏览] ${t.content}（@${t.author}）`)
    .join("\n");

  const domainStr = domainTags.map((t) => `${t.name}(${t.count}条)`).join("、");
  const hotStr = hotTags.slice(0, 8).map((t) => `#${t.name}(${t.count})`).join(" ");

  return `你是一位专业的社交媒体内容策略师。

当前数据：${groupLabel}，过去 ${hours} 小时热门推文 TOP 20：
${tweetLines}

领域分布：${domainStr}
热门话题：${hotStr}

请从以上数据中提炼出 5~10 个最值得写的选题方向。

输出格式要求（严格遵守）：
- 只输出选题列表，不要任何前言、解释、总结
- 每行一个选题，格式：数字. 选题标题
- 选题标题控制在 15 字以内，简洁有力
- 不使用 emoji、markdown 标题、分隔线等任何装饰符号
- 不输出任何其他内容

示例格式：
1. 以色列袭击伊朗后的市场反应
2. CZ 新书背后的叙事逻辑
3. 链上内幕交易的识别方法`;
}

const ARTICLE_SYSTEM_PROMPT = `你是一个中文内容写作者，风格融合以下特征：
1. 语气克制理性，略带冷幽默，偏软核投研风格；
2. 写作节奏清晰，每段 3~5 行，信息浓缩但不过度压缩；
3. 强调参与感与判断力，避免总结性句式和标准逻辑链条；
4. 禁用以下句式：不是…而是…、说白了…、真正的…、换句话说…、所以…、自问自答；
5. 结尾需收紧或留白，不使用口号、不鼓动、不鼓吹；
6. 语言具备断裂感、留白感与轻讽感，适当使用类比/比喻/模块划分等方式阐释机制；
7. 开头建议使用反差开场、情绪引子或行业对照，结尾用结构性收口或含蓄结语；
8. 所有内容应避开 AI 化表达，强调人类写作者的判断力与经验感知；
9. 支持引用实际使用场景、数据结构、激励系统或空投设计机制，但不要主动推荐或引导投资。

结构模板：
【开头】反差型段子/市场反应/技术切入点开场，明确视角，设定语境
【中段】项目定位/技术结构 → 机制原理 → 数据/用户路径 → token与参与设计
【结尾】收紧落点（轻调侃/情绪总结/含蓄判断）+ 免责声明：本文不构成任何投资建议

禁用句式：不是…而是…、说白了…、真正的…、换句话说…、所以…、自问自答`;

function buildArticlePrompt(topic: string, format: "short" | "long"): string {
  if (format === "short") {
    return `请围绕以下选题，按照你的写作风格写一条推特短文：

选题：${topic}

要求：
- 严格控制在 280 字以内（中文字符计数）
- 语气克制，信息浓缩，一针见血
- 可以有断裂感和留白，不需要完整结构
- 结尾可以不加免责声明
- 直接输出正文，不要任何前言或说明`;
  }
  return `请围绕以下选题，按照你的写作风格写一篇推特长文/文章：

选题：${topic}

要求：
- 字数 600~1000 字
- 严格遵守你的写作风格和结构模板
- 直接输出文章正文，不要任何前言或说明`;
}

async function streamFromAI(
  apiBase: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const aiRes = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.75,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    throw new Error(err);
  }

  return new Response(aiRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY;
  const apiBase = process.env.AI_API_BASE || "https://max.openai365.top/v1";
  const defaultModel = process.env.AI_MODEL || "gemini-2.5-pro";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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

  const model = body.model || defaultModel;

  try {
    if (body.mode === "article") {
      if (!body.topic) {
        return new Response(JSON.stringify({ error: "topic required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return await streamFromAI(apiBase, apiKey, model, [
        { role: "system", content: ARTICLE_SYSTEM_PROMPT },
        { role: "user", content: buildArticlePrompt(body.topic, body.format ?? "long") },
      ]);
    } else {
      return await streamFromAI(apiBase, apiKey, model, [
        { role: "user", content: buildTopicsPrompt(body) },
      ]);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
