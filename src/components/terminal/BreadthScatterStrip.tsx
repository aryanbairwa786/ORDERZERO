"use client";

import React, { useMemo } from "react";
import { TerminalState } from "@/lib/orderblock-engine";
import { Clock, RefreshCw, TrendingUp, TrendingDown, Layers } from "lucide-react";

interface BreadthScatterStripProps {
  terminal: TerminalState;
  onSelectStock: (symbol: string) => void;
  selectedSymbol?: string | null;
}

export function BreadthScatterStrip({
  terminal,
  onSelectStock,
  selectedSymbol,
}: BreadthScatterStripProps) {
  const { advancesCount, declinesCount, breadthScatter, sectorFlows } = terminal;
  const total = advancesCount + declinesCount;
  const advanceRatio = total > 0 ? (advancesCount / total) * 100 : 50;

  // Group scatter points along the -4% to +4% line
  const scatterPoints = useMemo(() => {
    return breadthScatter.map((dot) => {
      // Clamp percent to -4.5% to +4.5% range
      const clampedPct = Math.max(-4.5, Math.min(4.5, dot.changePct));
      // Map to 0% - 100% horizontal coordinate: 0% is at center 50%
      const xPos = ((clampedPct + 4.5) / 9.0) * 100;

      // Vertical jitter relative to zero line
      const hash = dot.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const jitterOffset = (hash % 16) - 8; // -8px to +8px

      // Position above or below center line
      const yBase = dot.changePct >= 0 ? 32 : 68;
      const yPos = yBase + jitterOffset;

      return {
        ...dot,
        xPos,
        yPos,
      };
    });
  }, [breadthScatter]);

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-[#0c1019] p-4 text-white shadow-2xl backdrop-blur-md">
      {/* Top Session Status & Breadth Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-mono">{advancesCount}</span> BULLISH
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="font-mono">{declinesCount}</span> BEARISH
          </div>

          {/* Ratio bar */}
          <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-rose-500/30 sm:block">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${advanceRatio}%` }}
            />
          </div>
        </div>

        {/* Market Status & Countdown */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-mono text-slate-300">IST 09:15 - 15:30</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-medium">TERMINAL READY</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <RefreshCw className="h-3 w-3 text-slate-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span>60s refresh</span>
          </div>
        </div>
      </div>

      {/* Zero-Line Scatter Plot (Dots around Zero) */}
      <div className="relative mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span className="text-rose-400 flex items-center gap-1">
            <span>◀ BEARISH EXTENSION</span>
            <span className="font-mono text-slate-400 text-[10px]">(-4%)</span>
          </span>
          <span className="font-mono text-xs font-semibold text-slate-300 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">
            0.00% OPEN BASELINE
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="font-mono text-slate-400 text-[10px]">(+4%)</span>
            <span>BULLISH EXTENSION ▶</span>
          </span>
        </div>

        {/* Scatter Canvas Box */}
        <div className="relative h-28 w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#080b12] shadow-inner select-none">
          {/* Grid lines */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r-2 border-slate-400/80 h-full w-[11.1%]"></div> {/* Center 0% */}
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
            <div className="border-r border-slate-600 h-full w-[11.1%]"></div>
          </div>

          {/* Central Zero Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-b border-dashed border-slate-700/60 pointer-events-none" />

          {/* Plotted Stock Dots */}
          {scatterPoints.map((point) => {
            const isSelected = selectedSymbol === point.symbol;
            return (
              <button
                key={point.symbol}
                onClick={() => onSelectStock(point.symbol)}
                title={`${point.symbol}: ${point.changePct >= 0 ? "+" : ""}${point.changePct}% (Strength: ${point.strengthScore}x)${point.pickLabel ? ` • ${point.pickLabel}` : ""}`}
                style={{
                  left: `${point.xPos}%`,
                  top: `${point.yPos}%`,
                }}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 focus:outline-none ${
                  point.isTopPick ? "z-20 scale-125" : "z-10 hover:scale-150"
                } ${isSelected ? "ring-2 ring-cyan-400 scale-150 z-30" : ""}`}
              >
                {/* Glowing ring for top filtered picks */}
                {point.isTopPick && (
                  <span
                    className={`absolute -inset-1.5 rounded-full opacity-75 blur-xs animate-pulse ${
                      point.board === "bullish" ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                )}

                <div
                  className={`relative flex items-center justify-center rounded-full transition-all ${
                    point.isTopPick
                      ? point.board === "bullish"
                        ? "h-4 w-4 border-2 border-white bg-emerald-400 shadow-[0_0_10px_#10b981]"
                        : "h-4 w-4 border-2 border-white bg-rose-500 shadow-[0_0_10px_#f43f5e]"
                      : point.board === "bullish"
                      ? "h-2 w-2 bg-emerald-500/80 hover:bg-emerald-300"
                      : point.board === "bearish"
                      ? "h-2 w-2 bg-rose-500/80 hover:bg-rose-300"
                      : "h-1.5 w-1.5 bg-slate-500/60"
                  }`}
                >
                  {/* Subtle label for top picks */}
                  {point.isTopPick && (
                    <span className="absolute -top-5 whitespace-nowrap rounded bg-slate-900/90 px-1 py-0.2 text-[9px] font-mono font-bold text-white border border-slate-700 pointer-events-none shadow">
                      {point.symbol}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>-4.0%</span>
          <span>-3.0%</span>
          <span>-2.0%</span>
          <span>-1.0%</span>
          <span className="text-slate-300 font-bold">0.0%</span>
          <span>+1.0%</span>
          <span>+2.0%</span>
          <span>+3.0%</span>
          <span>+4.0%</span>
        </div>
      </div>

      {/* Sector Flow Strip */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 pt-3 pb-1 scrollbar-none">
        <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-800">
          <Layers className="h-3 w-3 text-cyan-400" />
          <span>Sectors</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {sectorFlows.slice(0, 10).map((sec) => (
            <div
              key={sec.sector}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                sec.changePct >= 0
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                  : "border-rose-500/20 bg-rose-500/5 text-rose-300"
              }`}
            >
              <span className="text-slate-300">{sec.sector}</span>
              <span className="font-mono font-bold text-[10px]">
                {sec.changePct >= 0 ? "+" : ""}
                {sec.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
