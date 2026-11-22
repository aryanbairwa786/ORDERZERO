"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { BreadthScatterStrip } from "@/components/terminal/BreadthScatterStrip";
import { BullBearBoards } from "@/components/terminal/BullBearBoards";
import { OrderBlockPopup } from "@/components/terminal/OrderBlockPopup";
import { PlaybookFlowchart } from "@/components/terminal/PlaybookFlowchart";
import { 
  generateTerminalData, 
  TerminalState, 
  StockOrderBlockCard 
} from "@/lib/orderblock-engine";
import { 
  Zap, 
  AlertCircle, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import Link from "next/link";

const ENGINE_URL = process.env.NEXT_PUBLIC_SMC_ENGINE_URL || "https://orderzero-lzpv.onrender.com";

export default function TerminalDashboardPage() {
  const [terminalData, setTerminalData] = useState<TerminalState>(() => generateTerminalData());
  const [selectedStock, setSelectedStock] = useState<StockOrderBlockCard | null>(null);
  const [showPlaybookGuide, setShowPlaybookGuide] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(60);

  // Auto-refresh countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real backend data if available, fallback gracefully to authentic client engine
  useEffect(() => {
    fetch(`${ENGINE_URL}/api/v1/orderblock/terminal`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bullishBoard && data?.bearishBoard) {
          setTerminalData(data);
        }
      })
      .catch(() => {
        // Client engine fallback works 100% offline & free
      });
  }, []);

  // Handler when stock dot or row is clicked
  const handleSelectSymbol = (symbol: string) => {
    const found =
      terminalData.bullishBoard.find((s) => s.symbol === symbol) ||
      terminalData.bearishBoard.find((s) => s.symbol === symbol);

    if (found) {
      setSelectedStock(found);
    } else {
      // Look in breadth scatter
      const defaultMatch = terminalData.bullishBoard[0];
      if (defaultMatch) setSelectedStock(defaultMatch);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-white">
      <AppNavbar />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
        {/* Terminal Header & Overview */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                OrderBlock Terminal
              </h1>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                200+ F&O STOCKS
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Live one-directional strength rankings, 2:1 direction-gated contenders & 5-minute price action order blocks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlaybookGuide(!showPlaybookGuide)}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{showPlaybookGuide ? "Hide Playbook" : "How to Read Flowchart"}</span>
            </button>
            <Link
              href="/playbook"
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Full Playbook
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Playbook Flowchart Drawer (if opened) */}
        {showPlaybookGuide && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <PlaybookFlowchart />
          </div>
        )}

        {/* 1. TOP MARKET BREADTH SCATTER STRIP (Dots around Zero) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase tracking-wider font-semibold text-slate-300">
              Stage 1 · Market Breadth & Flow (Dots around 0% Line)
            </span>
            <span className="font-mono text-[11px] text-cyan-400">
              Tap any dot to inspect Order Block zone
            </span>
          </div>

          <BreadthScatterStrip
            terminal={terminalData}
            onSelectStock={handleSelectSymbol}
            selectedSymbol={selectedStock?.symbol}
          />
        </section>

        {/* 2. THE PICKS HIGHLIGHT STRIP (Top 3 Bullish + Top 3 Bearish) */}
        <section className="rounded-xl border border-slate-800/80 bg-[#0d121f] p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Today's Filtered Top Picks (Max 2 Per Sector · Event-Risk Protected)
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              6 Picks Selected from 40 Contenders
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {/* Top 3 Bullish Picks */}
            {terminalData.topBullishPicks.slice(0, 3).map((pick, i) => (
              <div
                key={pick.symbol}
                onClick={() => setSelectedStock(pick)}
                className="group relative cursor-pointer rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5 transition hover:border-emerald-400 hover:bg-emerald-900/30"
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-emerald-400">
                  <span>PICK #{i + 1}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
                <div className="mt-1 font-bold text-white group-hover:text-emerald-300 text-sm">
                  {pick.symbol}
                </div>
                <div className="flex items-center justify-between text-xs font-mono mt-1">
                  <span className="text-slate-300 font-semibold">{pick.changePct >= 0 ? "+" : ""}{pick.changePct}%</span>
                  <span className="text-cyan-400 font-bold">{pick.strengthScore}x</span>
                </div>
                <div className="mt-1 text-[9px] text-slate-400 truncate">
                  Z: {pick.zoneLevelZ} · R:R {pick.riskRewardRatio}
                </div>
              </div>
            ))}

            {/* Top 3 Bearish Picks */}
            {terminalData.topBearishPicks.slice(0, 3).map((pick, i) => (
              <div
                key={pick.symbol}
                onClick={() => setSelectedStock(pick)}
                className="group relative cursor-pointer rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 transition hover:border-rose-400 hover:bg-rose-900/30"
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-rose-400">
                  <span>PICK #{i + 1}</span>
                  <ArrowDownRight className="h-3 w-3" />
                </div>
                <div className="mt-1 font-bold text-white group-hover:text-rose-300 text-sm">
                  {pick.symbol}
                </div>
                <div className="flex items-center justify-between text-xs font-mono mt-1">
                  <span className="text-slate-300 font-semibold">{pick.changePct}%</span>
                  <span className="text-cyan-400 font-bold">{pick.strengthScore}x</span>
                </div>
                <div className="mt-1 text-[9px] text-slate-400 truncate">
                  Z: {pick.zoneLevelZ} · R:R {pick.riskRewardRatio}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. DUAL BOARDS (BULLISH & BEARISH BOARDS) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase tracking-wider font-semibold text-slate-300">
              Stage 2 & 3 · Contender Boards (Normalized Strength Ranking)
            </span>
            <span className="text-slate-400">
              strength = move from open ÷ 50-day average daily move
            </span>
          </div>

          <BullBearBoards
            bullishBoard={terminalData.bullishBoard}
            bearishBoard={terminalData.bearishBoard}
            onSelectStock={(stock) => setSelectedStock(stock)}
            selectedSymbol={selectedStock?.symbol}
          />
        </section>

        {/* Methodology Notes & Disclosures Callout */}
        <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>How OrderBlock Rankings Work</span>
          </div>
          <p>
            Each stock is scored as <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">strength = today's one-directional move from open ÷ average daily move</code>.
            A move counts only when one side exceeds twice the distance on the other side (2:1 direction gate); choppy stocks score zero.
            Order block price zones and structural levels (Z, S1, R1/R2) update on completed 5-minute candles.
          </p>
        </div>
      </main>

      {/* DIAGNOSTIC ORDER BLOCK POPUP MODAL */}
      <OrderBlockPopup
        card={selectedStock}
        onClose={() => setSelectedStock(null)}
      />

      {/* SEBI Educational Bar */}
      <SebiDisclaimerBar />
    </div>
  );
}
