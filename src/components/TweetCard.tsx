"use client";

import { useRef, useState } from "react";
import { Tweet } from "@/lib/scraper";

interface TweetCardProps {
  tweet: Tweet;
}

function HeatBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score));
  const color =
    pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-white/50 w-8 text-right">
        {pct}
      </span>
    </div>
  );
}

interface PreviewState {
  status: "idle" | "loading" | "done" | "error";
  text?: string;
}

export default function TweetCard({ tweet }: TweetCardProps) {
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [showTooltip, setShowTooltip] = useState(false);
  const fetchedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tweetUrl =
    tweet.url ||
    (tweet.handle
      ? `https://x.com/${tweet.handle}/status/${tweet.id}`
      : "#");

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        setPreview({ status: "loading" });
        fetch(`/api/tweet-preview?id=${tweet.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.text) setPreview({ status: "done", text: d.text });
            else setPreview({ status: "error" });
          })
          .catch(() => setPreview({ status: "error" }));
      }
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer"
      >
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xs font-mono text-white/30 w-5 shrink-0 pt-0.5">
              {tweet.rank}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 overflow-hidden">
              {tweet.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tweet.avatar}
                  alt={tweet.author}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">
                  {tweet.author.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-white/90 truncate">
                  {tweet.author}
                </span>
                {tweet.handle && (
                  <span className="text-xs text-white/40">@{tweet.handle}</span>
                )}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <p className="text-sm text-white/75 leading-relaxed line-clamp-2 mb-3 pl-8">
            {tweet.content}
          </p>

          {/* Heat bar */}
          <div className="pl-8 mb-3">
            <HeatBar score={tweet.heatScore} />
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4 pl-8 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {tweet.views}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {tweet.likes}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {tweet.retweets}
            </span>
          </div>
        </div>
      </a>

      {/* Hover tooltip with full tweet */}
      {showTooltip && (
        <div className="absolute left-full top-0 ml-3 z-50 w-80 pointer-events-none">
          <div className="bg-[#0f1629] border border-white/15 rounded-xl p-4 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-white/40 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-xs text-white/40 font-medium">原文</span>
            </div>

            {preview.status === "loading" && (
              <div className="flex items-center gap-2 text-xs text-white/30">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                加载中...
              </div>
            )}

            {preview.status === "done" && preview.text && (
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
                {preview.text}
              </p>
            )}

            {preview.status === "error" && (
              <p className="text-xs text-white/30">无法加载原文</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
