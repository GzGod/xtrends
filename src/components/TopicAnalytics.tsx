"use client";

import { useMemo } from "react";
import { Tweet } from "@/lib/scraper";

interface TopicAnalyticsProps {
  tweets: Tweet[];
  domainTags: { name: string; count: number }[];
}

function parseMetric(val: string): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/,/g, ""));
  if (val.toLowerCase().endsWith("k")) return n * 1000;
  if (val.toLowerCase().endsWith("m")) return n * 1000000;
  return n || 0;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

interface TagStat {
  name: string;
  count: number;
  totalViews: number;
  totalLikes: number;
  avgHeat: number;
}

export default function TopicAnalytics({ tweets, domainTags }: TopicAnalyticsProps) {
  const stats = useMemo<TagStat[]>(() => {
    // Build stats per domain tag
    const tagMap = new Map<string, TagStat>();

    // Initialize from domainTags
    for (const dt of domainTags) {
      tagMap.set(dt.name, {
        name: dt.name,
        count: dt.count,
        totalViews: 0,
        totalLikes: 0,
        avgHeat: 0,
      });
    }

    // Also add an "全部" aggregate
    const all: TagStat = { name: "全部", count: tweets.length, totalViews: 0, totalLikes: 0, avgHeat: 0 };

    for (const tweet of tweets) {
      const views = parseMetric(tweet.views);
      const likes = parseMetric(tweet.likes);
      all.totalViews += views;
      all.totalLikes += likes;
      all.avgHeat += tweet.heatScore;

      for (const tag of tweet.tags) {
        if (tagMap.has(tag)) {
          const s = tagMap.get(tag)!;
          s.totalViews += views;
          s.totalLikes += likes;
          s.avgHeat += tweet.heatScore;
        }
      }
    }

    if (tweets.length > 0) all.avgHeat = all.avgHeat / tweets.length;

    // Finalize averages
    for (const [, s] of tagMap) {
      if (s.count > 0) s.avgHeat = s.avgHeat / s.count;
    }

    // If no tweet has tags, use domainTags count to estimate views proportionally
    const result: TagStat[] = [all, ...Array.from(tagMap.values())];

    // If all tags have 0 views (tweets don't have tag info), distribute proportionally by count
    const hasTaggedViews = result.slice(1).some((s) => s.totalViews > 0);
    if (!hasTaggedViews && all.totalViews > 0) {
      const totalCount = domainTags.reduce((a, b) => a + b.count, 0) || 1;
      for (const s of result.slice(1)) {
        s.totalViews = Math.round((s.count / totalCount) * all.totalViews);
        s.totalLikes = Math.round((s.count / totalCount) * all.totalLikes);
        s.avgHeat = all.avgHeat;
      }
    }

    return result.sort((a, b) => b.totalViews - a.totalViews);
  }, [tweets, domainTags]);

  const maxViews = Math.max(...stats.map((s) => s.totalViews), 1);

  const COLORS = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-sm font-semibold text-white/80">话题流量分析</span>
        <span className="text-xs text-white/30 ml-auto">{tweets.length} 条推文</span>
      </div>

      <div className="space-y-3">
        {stats.map((s, i) => {
          const barPct = (s.totalViews / maxViews) * 100;
          const color = COLORS[i % COLORS.length];
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs text-white/70 font-medium">{s.name}</span>
                  <span className="text-xs text-white/30">{s.count} 条</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span title="总浏览量" className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {fmt(s.totalViews)}
                  </span>
                  <span title="总点赞" className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {fmt(s.totalLikes)}
                  </span>
                  <span title="平均热度" className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                    {s.avgHeat.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color} opacity-70`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
