"use client";

import { useState } from "react";
import { TrendData } from "@/lib/scraper";

interface WritingAdviceProps {
  data: TrendData;
}

const MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { id: "gemini-3-pro-preview-maxthinking", label: "Gemini 3 Pro (深思)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "[普克]claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "[普克]claude-opus-4-6", label: "Claude Opus 4.6" },
];

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
  const [model, setModel] = useState(MODELS[0].id);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  const generate = async () => {
    setLoading(true);
    setAdvice("");
    setError("");
    setOpen(true);
    setShowModelPicker(false);

    try {
      const res = await fetch("/api/writing-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
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
          const chunk = line.slice(6).trim();
          if (chunk === "[DONE]") break;
          try {
            const json = JSON.parse(chunk);
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
        </div>

        <div className="flex items-center gap-2">
          {/* Model picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker((v) => !v)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 text-xs rounded-lg transition-all cursor-pointer disabled:opacity-40"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="max-w-[120px] truncate">{selectedModel.label}</span>
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showModelPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-[#0f1629] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setModel(m.id); setShowModelPicker(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      model === m.id
                        ? "bg-purple-500/20 text-purple-300"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    <span>{m.label}</span>
                    {model === m.id && (
                      <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
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
