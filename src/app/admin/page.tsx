"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [handles, setHandles] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/whitelist");
    const data = (await res.json()) as { handles: string[] };
    setHandles(data.handles ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const add = async () => {
    const h = input.trim().replace(/^@/, "");
    if (!h) return;
    setMsg("");
    await fetch("/api/admin/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: h }),
    });
    setInput("");
    setMsg(`已添加 @${h}`);
    await load();
  };

  const remove = async (handle: string) => {
    setMsg("");
    await fetch("/api/admin/whitelist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle }),
    });
    setMsg(`已移除 @${handle}`);
    await load();
  };

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-sm font-semibold text-white/80">白名单管理</h1>
        <span className="ml-auto text-xs text-white/30">{handles.length} 个用户</span>
      </div>

      {msg && (
        <p className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2 mb-4">
          {msg}
        </p>
      )}

      <div className="flex gap-2 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
          placeholder="Twitter handle（不含 @）"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
        />
        <button
          onClick={() => void add()}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm rounded-lg transition-all cursor-pointer"
        >
          添加
        </button>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm">加载中...</p>
      ) : handles.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-8">白名单为空</p>
      ) : (
        <ul className="space-y-2">
          {handles.map((h) => (
            <li key={h} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-white/20 text-xs">@</span>
                <span className="text-sm text-white/80">{h}</span>
              </div>
              <button
                onClick={() => void remove(h)}
                className="text-xs text-red-400/50 hover:text-red-400 transition-colors cursor-pointer"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
