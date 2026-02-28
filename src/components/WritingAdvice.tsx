"use client";

import { useState } from "react";
import { TrendData } from "@/lib/scraper";

interface WritingAdviceProps {
  data: TrendData;
}

// Minimal markdown renderer for the AI output
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={key++} className="text-sm font-bold text-white/90 mt-4 mb-2 first:mt-0">
          {line.replace(/^## /, "")}
        </h3>
      );
    } else if (/^\d+\.\s/.test(line)) {
      nodes.push(
        <p key={key++} className="text-sm text-white/70 leading-relaxed mb-1 pl-3 border-l border-blue-500/30">
          {line}
        </p>
      );
    } else if (line.startsWith("- ")) {
      nodes.push(
        <p key={key++} className="text-sm text-white/70 leading-relaxed mb-1 pl-3">
          • {line.slice(2)}
        </p>
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={key++} className="h-1" />);
    } else {
      nodes.push(
        <p key={key++} className="text-sm text-white/70 leading-relaxed mb-1">
          {line}
        </p>
      );
    }
  }
  return nodes;
}

export default function WritingAdvice({ data }: WritingAdviceProps) {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const generate = async () => {
    setLoading(true);
    setAdvice("");
    setError("");
    setOpen(true);

    try {
      const res = await fetch("/api/writing-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: data.tweets.slice(0, 30).map((t) => ({
            rank: t.rank,
            author: t.author,
            content: t.content,
            views: t.views,
            likes: t.likes,
            heatScore: t.heatScore,
            tags: t.tags,
          })),
          domainTags: data.domainTags,
          hotTags: data.hotTags,
          group: data.group,
          hours: data.hours,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `HTTP ${res.status}`);
      }

      // Parse SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) setAdvice((prev) => prev + delta);
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm font-semibold text-white/80">AI 写作建议</span>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            基于当前热榜
          </span>
        </div>
        <div className="flex items-center gap-2">
          {advice && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              {open ? "收起" : "展开"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {advice ? "重新生成" : "生成建议"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="px-5 pb-5 border-t border-white/5">
          {error && (
            <p className="text-xs text-red-400 mt-3">{error}</p>
          )}
          {(advice || loading) && (
            <div className="mt-4">
              {renderMarkdown(advice)}
              {loading && (
                <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
          {!advice && !loading && !error && (
            <p className="text-xs text-white/30 mt-3 text-center py-4">
              点击「生成建议」，AI 将分析当前热榜数据给出写作方向
            </p>
          )}
        </div>
      )}
    </div>
  );
}
