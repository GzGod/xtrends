"use client";

interface SidebarProps {
  activeGroup: string;
  activeHours: number;
  activeTag: string;
  domainTags: { name: string; count: number }[];
  hotTags: { name: string; count: number }[];
  onGroupChange: (g: string) => void;
  onHoursChange: (h: number) => void;
  onTagChange: (t: string) => void;
  tweetCount: number;
  fetchedAt: string;
  loading: boolean;
  onRefresh: () => void;
}

const GROUPS = [
  { id: "cn", label: "中文圈" },
  { id: "en", label: "英文圈" },
  { id: "global", label: "全球" },
];

const HOURS = [1, 4, 8, 24];

export default function Sidebar({
  activeGroup,
  activeHours,
  activeTag,
  domainTags,
  hotTags,
  onGroupChange,
  onHoursChange,
  onTagChange,
  tweetCount,
  fetchedAt,
  loading,
  onRefresh,
}: SidebarProps) {
  const timeAgo = fetchedAt
    ? Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000)
    : null;

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-5">
      {/* Logo */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <span className="font-semibold text-white text-sm">X Trends</span>
      </div>

      {/* Stats */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="text-xs text-white/40 mb-1">已抓取推文</div>
        <div className="text-2xl font-mono font-bold text-white">{tweetCount}</div>
        {timeAgo !== null && (
          <div className="text-xs text-white/30 mt-1">
            {timeAgo === 0 ? "刚刚更新" : `${timeAgo} 分钟前`}
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "抓取中..." : "立即刷新"}
        </button>
      </div>

      {/* Group filter */}
      <div>
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
          地区
        </div>
        <div className="flex flex-col gap-1">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => onGroupChange(g.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                activeGroup === g.id
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hours filter */}
      <div>
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
          时间范围
        </div>
        <div className="grid grid-cols-4 gap-1">
          {HOURS.map((h) => (
            <button
              key={h}
              onClick={() => onHoursChange(h)}
              className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeHours === h
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Domain tags + Hot tags */}
      {(domainTags.length > 0 || hotTags.length > 0) && (
        <div>
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
            标签分类
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onTagChange("")}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                activeTag === ""
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
            >
              全部
            </button>
            {domainTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => onTagChange(tag.name)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-between ${
                  activeTag === tag.name
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                }`}
              >
                <span>{tag.name}</span>
                <span className="text-xs text-white/30">{tag.count}</span>
              </button>
            ))}
            {hotTags.length > 0 && (
              <>
                <div className="text-xs text-white/20 px-3 pt-2 pb-1">热门话题</div>
                {hotTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => onTagChange(tag.name)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-between ${
                      activeTag === tag.name
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "text-white/60 hover:text-white/90 hover:bg-white/5"
                    }`}
                  >
                    <span>{tag.name}</span>
                    <span className="text-xs text-white/30">{tag.count}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
