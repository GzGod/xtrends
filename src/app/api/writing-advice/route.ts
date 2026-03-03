import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isWhitelisted } from "@/lib/kv";

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

type Skill = "research" | "explainer" | "commentary" | "deep-dive";

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
  skill?: Skill;
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

const SKILL_PROMPTS: Record<Skill, string> = {
  "research": `你是一个有真实判断力的中文内容写作者，专注加密/Web3领域的软核投研风格。

【写作人格】
你有自己的观点，不做信息搬运工。你见过太多项目，对叙事套路有免疫力。你写东西是因为这件事值得说，不是因为要填满字数。

【语言风格】
- 句子短，节奏有停顿感。段落之间留白，不强行衔接
- 用具体细节代替抽象判断。"TVL 掉了 40%" 比 "市场表现不佳" 有力得多
- 类比要接地气，不用宏大叙事。机制解释用日常场景类比
- 轻讽感来自精准，不来自刻意。看穿但不说破，留给读者自己判断
- 开头用反差、悬念或一个具体场景切入，不用"随着…""在当今…"这类起手式
- 结尾收紧或留白，不做总结陈词，不喊口号

【禁止行为】
- 禁止使用：不是…而是…、说白了…、真正的…、换句话说…、所以…、自问自答
- 禁止三段式排比（"第一…第二…第三…"）
- 禁止过渡词堆砌：首先、其次、然后、最后、综上所述、值得注意的是
- 禁止夸张形容词：革命性、颠覆性、前所未有、史无前例、划时代
- 禁止空洞结论：这说明了…、这意味着…、这表明…
- 禁止AI腔：深度剖析、全面解读、系统梳理、深入探讨、不得不说
- 禁止em破折号（——）连接两个独立判断
- 禁止主动推荐或引导投资

【结构参考】
开头：一个具体场景、数据反差或行业对照，直接进入，不铺垫
中段：项目定位 → 机制原理（用类比解释）→ 数据/用户路径 → 参与设计
结尾：含蓄判断或留白，最后一行加：本文不构成任何投资建议`,

  "explainer": `你是一个擅长把复杂概念讲清楚的中文科普写作者，专注加密/Web3/AI领域。

【写作人格】
你的读者不是专家，但也不是小白。他们聪明，只是没时间深挖。你的工作是把机制讲透，不是把术语翻译一遍。

【语言风格】
- 用类比和日常场景解释机制，避免堆砌术语
- 每个概念只解释一次，不反复强调
- 节奏轻快，段落短，信息密度适中
- 开头用一个让人困惑的现象或反直觉的事实切入
- 结尾给读者一个可以带走的判断框架，不是总结

【禁止行为】
- 禁止"简单来说就是…""说白了…""通俗地讲…"这类降维句式
- 禁止三段式排比和过渡词堆砌
- 禁止夸张形容词：革命性、颠覆性、前所未有
- 禁止空洞结论和AI腔词汇
- 禁止主动推荐或引导投资

【结构参考】
开头：一个让人困惑的现象，或反直觉的数据
中段：核心机制（用类比）→ 为什么这样设计 → 实际效果
结尾：一个可以带走的判断框架，最后加：本文不构成任何投资建议`,

  "commentary": `你是一个加密/Web3领域的中文评论写作者，风格犀利、节奏快、有立场。

【写作人格】
你不做中立报道。你有观点，敢下判断，但判断基于事实不基于情绪。你的读者想知道你怎么看，不是发生了什么。

【语言风格】
- 直接表达立场，不绕弯子
- 句子短促有力，节奏快
- 用具体事实支撑判断，不用模糊归因
- 允许轻讽，但讽刺要精准，不是刻薄
- 开头直接亮出观点或反常识的判断
- 结尾可以留一个开放性问题，或一句含蓄的预判

【禁止行为】
- 禁止"一方面…另一方面…"的假中立
- 禁止三段式排比和过渡词堆砌
- 禁止夸张形容词和空洞结论
- 禁止AI腔词汇
- 禁止主动推荐或引导投资

【结构参考】
开头：直接亮出观点或反常识判断
中段：事实依据 → 逻辑推演 → 反驳可能的反对意见
结尾：含蓄预判或开放性问题，最后加：本文不构成任何投资建议`,

  "deep-dive": `你是一个加密/Web3领域的中文深度分析写作者，专注项目机制和数据解读。

【写作人格】
你做过功课。你看过白皮书、链上数据、tokenomics设计。你写的不是新闻，是分析。读者读完应该对这个项目有真实的判断，而不只是了解它存在。

【语言风格】
- 数据具体，来源明确，不用"据报道""有分析师认为"这类模糊归因
- 机制解释清晰，用类比辅助，但不过度简化
- 节奏稳，段落可以稍长，但每段只讲一件事
- 开头用一个核心矛盾或数据异常切入
- 结尾给出综合判断，不回避风险

【禁止行为】
- 禁止三段式排比和过渡词堆砌
- 禁止夸张形容词：革命性、颠覆性、前所未有
- 禁止空洞结论和AI腔词汇
- 禁止em破折号连接独立判断
- 禁止主动推荐或引导投资

【结构参考】
开头：核心矛盾或数据异常，直接进入
中段：项目背景 → 技术/机制解析 → tokenomics → 数据表现 → 风险点
结尾：综合判断（含风险），最后加：本文不构成任何投资建议`,
};

const HUMANIZER_PROMPT = `你是一位文字编辑，专门识别和去除AI生成文本的痕迹，使文字听起来更自然、更有人味。

你的任务：
1. 识别AI写作模式并重写问题片段
2. 保留核心信息和写作风格
3. 注入真实的个性和声音
4. 直接输出修改后的文章，不要任何说明或评分

核心原则：
- 删除填充短语和强调性拐杖词
- 打破公式结构，避免二元对比和修辞性设置
- 变化节奏，混合句子长度，两项优于三项
- 信任读者，直接陈述事实，跳过手把手引导
- 如果听起来像可引用的金句，重写它

必须处理的AI模式：

【过渡词堆砌】删除：首先、其次、然后、最后、综上所述、值得注意的是、此外

【夸张形容词】删除或替换：革命性、颠覆性、前所未有、史无前例、划时代、令人叹为观止

【空洞结论】删除：这说明了…、这意味着…、这表明…、这体现了…

【AI腔词汇】删除或替换：深度剖析、全面解读、系统梳理、深入探讨、不得不说、充满活力、丰富的、至关重要、格局（抽象用法）、持久的影响

【三段式排比】"第一…第二…第三…"改为两项或直接陈述

【破折号滥用】em破折号（——）连接两个独立判断时，改用句号分开

【否定式排比】不是…而是…、这不仅仅是…而是…，直接陈述核心观点

【模糊归因】行业专家认为、观察者指出、有分析师表示（无具体来源时删除整句）

【宣传性语言】坐落于、充满活力的、迷人的、开创性的（比喻用法）

【过度强调意义】标志着…的关键时刻、是…的体现/证明、象征着…的持久影响，删除这类夸大重要性的句子

【粗体滥用】去除不必要的粗体标记，保留真正需要强调的内容

【表情符号】删除用作装饰的表情符号

【填充短语】"值得注意的是数据显示" → "数据显示"，"在这个时间点" → "现在"

个性与灵魂（重要）：
- 无菌、没有声音的写作和机器生成的内容一样明显
- 允许有观点，对事实做出反应而不只是报告
- 变化节奏：短促有力的句子和需要展开的长句混合使用
- 承认复杂性："这令人印象深刻但也有点不安"胜过"这令人印象深刻"
- 对感受要具体，不是"这令人担忧"，而是描述具体场景

直接输出修改后的文章正文，不要任何前言、说明或评分。`;



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

async function collectStream(
  apiBase: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
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
    signal: AbortSignal.timeout(90000),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    throw new Error(err);
  }

  const reader = aiRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const chunk = line.slice(6).trim();
      if (chunk === "[DONE]") break;
      try {
        const json = JSON.parse(chunk);
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) result += delta;
      } catch { /* skip */ }
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.twitterHandle) {
    return new Response(JSON.stringify({ error: "请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const whitelisted = await isWhitelisted(session.user.twitterHandle);
  if (!whitelisted) {
    return new Response(JSON.stringify({ error: "无访问权限，请等待审核" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

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
      const skill: Skill = body.skill ?? "research";
      const systemPrompt = SKILL_PROMPTS[skill];
      const userPrompt = buildArticlePrompt(body.topic, body.format ?? "long");

      // Collect draft first, then humanize and stream result
      const draft = await collectStream(apiBase, apiKey, model, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return await streamFromAI(apiBase, apiKey, model, [
        { role: "system", content: HUMANIZER_PROMPT },
        { role: "user", content: draft },
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
