"use client";

import { useEffect, useRef, useState } from "react";
import { TrendData } from "@/lib/scraper";

interface WritingAdviceProps {
  data: TrendData;
}

const MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { id: "gemini-3-pro-preview-maxthinking", label: "Gemini 3 Pro 深思" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "[普克]claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "[普克]claude-opus-4-6", label: "Claude Opus 4.6" },
];

type Step = "idle" | "loading-topics" | "pick-topic" | "loading-article" | "done";

async function streamText(
  body: object,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch("/api/writing-advice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
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
      if (chunk === "[DONE]") return;
      try {
        const json = JSON.parse(chunk);
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) onChunk(delta);
      } catch {
        // skip
      }
    }
  }
}

export default function WritingAdvice({ data }: WritingAdviceProps) {
  const [step, setStep] = useState<Step>("idle");
  const [model, setModel] = useState(MODELS[0].id);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, right: 0 });
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Close picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (modelBtnRef.current && !modelBtnRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelPicker]);

  const openModelPicker = () => {
    if (modelBtnRef.current) {
      const rect = modelBtnRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setShowModelPicker((v) => !v);
  };

  const basePayload = {
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
  };

  const generateTopics = async () => {
    setStep("loading-topics");
    setTopics([]);
    setArticle("");
    setSelectedTopic("");
    setError("");
    setOpen(true);
    setShowModelPicker(false);

    let raw = "";
    try {
      await streamText({ ...basePayload, mode: "topics" }, (chunk) => {
        raw += chunk;
      });
      // Parse numbered list lines
      const parsed = raw
        .split("\n")
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l) => l.length > 2 && l.length < 60);
      setTopics(parsed.slice(0, 10));
      setStep("pick-topic");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
      setStep("idle");
    }
  };

  const generateArticle = async (topic: string) => {
    setSelectedTopic(topic);
    setStep("loading-article");
    setArticle("");
    setError("");

    try {
      await streamText({ ...basePayload, mode: "article", topic }, (chunk) => {
        setArticle((prev) => prev + chunk);
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
      setStep("pick-topic");
    }
  };

  const reset = () => {
    setStep("idle");
    setTopics([]);
    setArticle("");
    setSelectedTopic("");
    setError("");
  };

  const isLoading = step === "loading-topics" || step === "loading-article";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm font-semibold text-white/80">AI 写作助手</span>
          {selectedTopic && step !== "idle" && (
            <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full max-w-[160px] truncate">
              {selectedTopic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Model picker */}
          <div>
            <button
              ref={modelBtnRef}
              onClick={openModelPicker}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 text-xs rounded-lg transition-all cursor-pointer disabled:opacity-40"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="max-w-[100px] truncate">{selectedModel.label}</span>
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelPicker && (
              <div
                className="fixed z-[9999] w-52 bg-[#0f1629] border border-white/15 rounded-xl shadow-2xl overflow-hidden"
                style={{ top: pickerPos.top, right: pickerPos.right }}
              >
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setModel(m.id); setShowModelPicker(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      model === m.id ? "bg-purple-500/20 text-purple-300" : "text-white/60 hover:bg-white/5 hover:text-white/90"
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

          {/* Toggle open/close when has content */}
          {(step === "pick-topic" || step === "done") && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              {open ? "收起" : "展开"}
            </button>
          )}

          {/* Reset */}
          {step !== "idle" && !isLoading && (
            <button
              onClick={reset}
              className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              重置
            </button>
          )}

          {/* Main action */}
          {(step === "idle" || step === "pick-topic") && (
            <button
              onClick={generateTopics}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {step === "pick-topic" ? "换一批选题" : "获取选题"}
            </button>
          )}

          {isLoading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-purple-300/60 text-xs">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {step === "loading-topics" ? "分析热榜..." : "生成文章..."}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-white/5">
          {error && (
            <p className="text-xs text-red-400 px-5 py-3">{error}</p>
          )}

          {/* Step 1: topic list */}
          {(step === "pick-topic" || step === "done") && topics.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs text-white/30 mb-3">
                {step === "done" ? "选择其他选题重新生成" : "选择一个选题，AI 将为你生成例文"}
              </p>
              <div className="flex flex-col gap-1.5">
                {topics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => generateArticle(topic)}
                    disabled={isLoading}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer border ${
                      selectedTopic === topic
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-200"
                        : "bg-white/3 border-white/8 text-white/70 hover:bg-white/8 hover:border-white/15 hover:text-white/90"
                    } disabled:opacity-40`}
                  >
                    <span className="text-white/30 font-mono text-xs mr-2">{String(i + 1).padStart(2, "0")}</span>
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: article output */}
          {(step === "loading-article" || step === "done") && (
            <div className="px-5 pb-5 border-t border-white/5">
              <div className="flex items-center gap-2 py-3 mb-1">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-white/40">例文</span>
                {step === "done" && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(article);
                    }}
                    className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制
                  </button>
                )}
              </div>
              <div className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap break-words">
                {article}
                {step === "loading-article" && (
                  <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          )}

          {step === "idle" && !error && (
            <p className="text-xs text-white/30 text-center py-6">
              点击「获取选题」，AI 分析当前热榜后给出选题方向
            </p>
          )}
        </div>
      )}
    </div>
  );
}
