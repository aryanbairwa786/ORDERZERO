"use client";

import React, { useEffect, useRef } from "react";
import { StockOrderBlockCard } from "@/lib/orderblock-engine";
import { formatINR } from "@/lib/format-inr";
import { X, ExternalLink, BookOpen, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Crosshair } from "lucide-react";
import Link from "next/link";

interface OrderBlockPopupProps {
  card: StockOrderBlockCard | null;
  onClose: () => void;
  onLogTrade?: (card: StockOrderBlockCard) => void;
}

export function OrderBlockPopup({ card, onClose, onLogTrade }: OrderBlockPopupProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!card) return null;

  const isBull = card.boardType === "bullish";
  const primaryColor = isBull ? "#10b981" : "#f43f5e";
  const isPick = card.ruleStatus.includes("PICK");
  const isCapped = card.ruleStatus.includes("sector cap");
  const isEventRisk = card.ruleStatus.includes("event risk");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-150">
      <div 
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0e131f] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div 
          className="h-1.5 w-full"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-[#121826] p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl font-mono text-sm font-bold border ${
                isBull
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-400"
              }`}
            >
              {isBull ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">{card.symbol}</h2>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  {card.sector}
                </span>
                <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  Lot: {card.lotSize}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs">{card.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono text-xl font-bold text-white">
                {formatINR(card.ltp)}
              </div>
              <div
                className={`font-mono text-xs font-semibold ${
                  card.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {card.changePct >= 0 ? "+" : ""}
                {card.changePct.toFixed(2)}%
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Diagnostic Stack Rows (Matching order-block.com anatomy) */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* 1. RANK Row */}
            <div className="rounded-xl border border-slate-800 bg-[#121826]/70 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400">1. RANK</span>
                <span className="font-mono text-xs text-slate-300">
                  {card.percentile} · #{card.rank}/{card.totalBoardCount}
                </span>
              </div>
              <div className="text-xs text-slate-300">
                Stronger than <strong className="text-white">{card.percentile}</strong> of all F&O stocks.
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-400">
                Intraday move: <span className="text-white font-bold">{card.oneDirectionalMovePct}%</span> vs 50D-ADM: <span className="text-white">{card.adm50}%</span> ({card.strengthScore}x)
              </div>
            </div>

            {/* 2. RULE Row */}
            <div className="rounded-xl border border-slate-800 bg-[#121826]/70 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400">2. RULE FILTER</span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold border ${
                    isPick
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : isCapped
                      ? "border-slate-600 bg-slate-800 text-slate-300"
                      : isEventRisk
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-slate-700 bg-slate-800/60 text-slate-300"
                  }`}
                >
                  {card.ruleStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300">{card.ruleExplanation}</p>
            </div>
          </div>

          {/* 3. ORDER BLOCK & Z / S1 Levels Banner */}
          <div className="rounded-xl border border-slate-800 bg-[#131929] p-4">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Crosshair className="h-4 w-4 text-cyan-400" />
                <span>Price Action Structure & Level Ladder</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">5-Minute Bar Confirmation</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {/* OB Box */}
              <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Order Block Box</div>
                <div className="mt-1 font-mono text-xs font-bold text-white">
                  {formatINR(card.obRange.low)} – {formatINR(card.obRange.high)}
                </div>
                <div className="text-[10px] text-slate-400">Last opposite candle</div>
              </div>

              {/* Z Entry */}
              <div className={`rounded-lg p-2.5 border ${isBull ? "border-emerald-500/30 bg-emerald-950/20" : "border-rose-500/30 bg-rose-950/20"}`}>
                <div className="text-[10px] uppercase font-semibold text-slate-300 flex items-center justify-between">
                  <span>Z (Zone Entry)</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${isBull ? "bg-emerald-400" : "bg-rose-400"}`} />
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {formatINR(card.zoneLevelZ)}
                </div>
                <div className="text-[10px] text-slate-400">Order block boundary</div>
              </div>

              {/* S1 Invalidation */}
              <div className="rounded-lg bg-rose-950/20 p-2.5 border border-rose-500/30">
                <div className="text-[10px] uppercase font-semibold text-rose-400 flex items-center justify-between">
                  <span>{isBull ? "S1 (Invalidation)" : "R1 (Invalidation)"}</span>
                  <ShieldAlert className="h-3 w-3 text-rose-400" />
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-rose-300">
                  {formatINR(card.invalidationS1)}
                </div>
                <div className="text-[10px] text-rose-400/80">
                  Risk: {formatINR(card.riskPerShare)}/sh
                </div>
              </div>

              {/* Targets R1 / R2 */}
              <div className="rounded-lg bg-amber-950/20 p-2.5 border border-amber-500/30">
                <div className="text-[10px] uppercase font-semibold text-amber-400">
                  {isBull ? "R1 / R2 (Targets)" : "S1 / S2 (Targets)"}
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-amber-300">
                  {formatINR(card.targetR1)} | {formatINR(card.targetR2)}
                </div>
                <div className="text-[10px] text-amber-400/80 font-mono">
                  R:R = {card.riskRewardRatio}
                </div>
              </div>
            </div>

            {/* VWAP & Amber Dotted Levels */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-semibold">VWAP:</span>
                <span className="font-mono text-slate-200">{formatINR(card.vwap)}</span>
                <span className="font-mono text-[11px] text-slate-400">
                  ({card.vwapDistancePct >= 0 ? "+" : ""}{card.vwapDistancePct}% from VWAP)
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <span className="text-amber-400">Extended Levels:</span>
                {card.additionalLevels.map((lvl) => (
                  <span key={lvl.label} className="rounded bg-slate-900 px-1 py-0.5 border border-slate-800">
                    {lvl.label}: {formatINR(lvl.price)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive 5-Minute Chart Visualizer */}
          <div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">5-Minute Order Block Overlay</span>
              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className={`inline-block h-2 w-2 rounded ${isBull ? "bg-emerald-500" : "bg-rose-500"}`} />
                  Order Block Zone
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3 bg-rose-500" />
                  S1 Stop
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3 bg-amber-400 border-b border-dashed" />
                  R1 Target
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3 bg-purple-400 border-b border-dashed" />
                  VWAP
                </span>
              </div>
            </div>

            {/* SVG Chart Preview */}
            <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#070a12] p-2">
              <svg className="h-full w-full" viewBox="0 0 600 180" preserveAspectRatio="none">
                {/* Horizontal reference lines */}
                {/* VWAP line */}
                <line x1="0" y1="90" x2="600" y2="90" stroke="#a855f7" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.6" />
                
                {/* S1 Invalidation line */}
                <line 
                  x1="0" 
                  y1={isBull ? "145" : "35"} 
                  x2="600" 
                  y2={isBull ? "145" : "35"} 
                  stroke="#f43f5e" 
                  strokeWidth="1.5" 
                />

                {/* Z Line */}
                <line 
                  x1="0" 
                  y1={isBull ? "115" : "65"} 
                  x2="600" 
                  y2={isBull ? "115" : "65"} 
                  stroke={isBull ? "#10b981" : "#f43f5e"} 
                  strokeDasharray="2 2" 
                  strokeWidth="1.5" 
                />

                {/* R1 Target line */}
                <line 
                  x1="0" 
                  y1={isBull ? "40" : "140"} 
                  x2="600" 
                  y2={isBull ? "40" : "140"} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  strokeWidth="1.5" 
                />

                {/* Shaded Order Block Zone */}
                <rect
                  x="180"
                  y={isBull ? "115" : "45"}
                  width="420"
                  height="25"
                  fill={isBull ? "#10b981" : "#f43f5e"}
                  fillOpacity="0.18"
                  stroke={isBull ? "#10b981" : "#f43f5e"}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* 5-minute Candles simulation */}
                {card.candles5m.slice(0, 30).map((c, i) => {
                  const x = 20 + i * 19;
                  const minP = Math.min(...card.candles5m.map((k) => k.low));
                  const maxP = Math.max(...card.candles5m.map((k) => k.high));
                  const scaleY = (p: number) => 170 - ((p - minP) / Math.max(maxP - minP, 0.01)) * 150;
                  
                  const yOpen = scaleY(c.open);
                  const yClose = scaleY(c.close);
                  const yHigh = scaleY(c.high);
                  const yLow = scaleY(c.low);
                  const isUp = c.close >= c.open;

                  return (
                    <g key={i}>
                      {/* Wick */}
                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={isUp ? "#10b981" : "#f43f5e"} strokeWidth="1" />
                      {/* Body */}
                      <rect
                        x={x - 4}
                        y={Math.min(yOpen, yClose)}
                        width="8"
                        height={Math.max(Math.abs(yClose - yOpen), 2)}
                        fill={isUp ? "#10b981" : "#f43f5e"}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* In-chart label badges */}
              <div 
                className="absolute right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 border border-slate-700 text-amber-400"
                style={{ top: isBull ? "30px" : "130px" }}
              >
                TARGET {isBull ? "R1" : "S1"}: {formatINR(card.targetR1)}
              </div>
              <div 
                className="absolute right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 border border-slate-700 text-rose-400"
                style={{ top: isBull ? "135px" : "25px" }}
              >
                INVALIDATION {isBull ? "S1" : "R1"}: {formatINR(card.invalidationS1)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#121826] p-4 sm:px-6">
          <div className="text-xs text-slate-400">
            Rule-based technical price zones. Completely free. No trade execution.
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/chart/${encodeURIComponent(card.symbol)}`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Full Terminal
            </Link>
            <Link
              href={`/journal?symbol=${encodeURIComponent(card.symbol)}&direction=${card.boardType}&entry=${card.zoneLevelZ}&stop=${card.invalidationS1}&target=${card.targetR1}`}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-900/30"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Log in Journal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
