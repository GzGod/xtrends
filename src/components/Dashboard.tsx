"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrendData } from "@/lib/scraper";
import TweetCard from "@/components/TweetCard";
import Sidebar from "@/components/Sidebar";

const SORT_OPTIONS = [
  { id: "rank", label: "热度排名" },
  { id: "views", label: "浏览量" },
  { id: "likes", label: "点赞数" },
];

function parseMetric(val: string): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/,/g, ""));
  if (val.toLowerCase().endsWith("k")) return n * 1000;
  if (val.toLowerCase().endsWith("m")) return n * 1000000;
  return n || 0;
}

export default function Dashboard() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState("cn");
  const [hours, setHours] = useState(4);
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("rank");
  const [search, setSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ group, hours: String(hours) });
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/trends?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TrendData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "抓取失败");
    } finally {
      setLoading(false);
    }
  }, [group, hours, tag]);

  // Fetch on param change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    timerRef.current = setInterval(fetchData, 30 * 60 * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  const tweets = data?.tweets ?? [];

  const filtered = tweets
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.content.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.handle.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "views") return parseMetric(b.views) - parseMetric(a.views);
      if (sort === "likes") return parseMetric(b.likes) - parseMetric(a.likes);
      return a.rank - b.rank;
    });

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <Sidebar
          activeGroup={group}
          activeHours={hours}
          activeTag={tag}
          domainTags={data?.domainTags ?? []}
          hotTags={data?.hotTags ?? []}
          onGroupChange={(g) => { setGroup(g); setTag(""); }}
          onHoursChange={(h) => setHours(h)}
          onTagChange={(t) => setTag(t)}
          tweetCount={tweets.length}
          fetchedAt={data?.fetchedAt ?? ""}
          loading={loading}
          onRefresh={fetchData}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5">
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索推文、作者..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    sort === s.id
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between mb-4 text-xs text-white/30">
            <span>
              {loading
                ? "正在抓取..."
                : error
                ? `错误: ${error}`
                : `共 ${filtered.length} 条推文`}
            </span>
            <span>数据来源: trends.xhunt.ai</span>
          </div>

          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-sm text-red-400">
              抓取失败: {error}。xhunt.ai 可能需要登录或已更改页面结构。
            </div>
          )}

          {/* Loading skeleton */}
          {loading && tweets.length === 0 && (
            <div className="grid gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse"
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-1/4" />
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tweet grid */}
          {!loading || tweets.length > 0 ? (
            <div className="grid gap-3">
              {filtered.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
              ))}
              {filtered.length === 0 && !loading && (
                <div className="text-center py-16 text-white/30 text-sm">
                  没有找到匹配的推文
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
