"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it's a chunk loading failure after new deployment, auto-reload once
    const msg = error.message || "";
    if (
      msg.includes("Loading chunk") ||
      msg.includes("ChunkLoadError") ||
      error.name === "ChunkLoadError" ||
      msg.includes("Failed to fetch")
    ) {
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem("last_chunk_reload", String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090d16] text-white p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f1422] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Terminal Feed Update</h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          The terminal received a live update. Click below to reload the latest institutional OrderBlock feed.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Terminal
          </button>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            <Home className="h-4 w-4" />
            Terminal Home
          </Link>
        </div>
      </div>
    </div>
  );
}
