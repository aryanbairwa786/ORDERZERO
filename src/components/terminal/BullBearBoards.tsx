"use client";

import React, { useState, useMemo } from "react";
import { StockOrderBlockCard } from "@/lib/orderblock-engine";
import { formatINR } from "@/lib/format-inr";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  ShieldAlert,
  ChevronRight
} from "lucide-react";

interface BullBearBoardsProps {
  bullishBoard: StockOrderBlockCard[];
  bearishBoard: StockOrderBlockCard[];
  onSelectStock: (stock: StockOrderBlockCard) => void;
  selectedSymbol?: string | null;
}

export function BullBearBoards({
  bullishBoard,
  bearishBoard,
  onSelectStock,
  selectedSymbol,
}: BullBearBoardsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [boardView, setBoardView] = useState<"both" | "bull" | "bear">("both");

  // Extract all sectors
  const allSectors = useMemo(() => {
    const set = new Set<string>();
    [...bullishBoard, ...bearishBoard].forEach((s) => set.add(s.sector));
    return ["All", ...Array.from(set).sort()];
  }, [bullishBoard, bearishBoard]);

  // Filter helper
  const filterList = (list: StockOrderBlockCard[]) => {
    return list.filter((item) => {
      const matchSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSector =
        selectedSector === "All" || item.sector.toLowerCase() === selectedSector.toLowerCase();
      return matchSearch && matchSector;
    });
  };

  const filteredBull = useMemo(() => filterList(bullishBoard), [bullishBoard, searchQuery, selectedSector]);
  const filteredBear = useMemo(() => filterList(bearishBoard), [bearishBoard, searchQuery, selectedSector]);

  return (
    <div className="w-full space-y-4">
      {/* Controls Bar: Search, Sector Filter & View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1019] p-3 text-white">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search demo reference symbols..."
            className="w-full rounded-lg border border-slate-700/80 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Sector Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            {allSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec} {sec === "All" ? "Sectors" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setBoardView("both")}
            className={`rounded-md px-3 py-1 transition ${
              boardView === "both"
                ? "bg-slate-700 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Dual Boards
          </button>
          <button
            onClick={() => setBoardView("bull")}
            className={`rounded-md px-3 py-1 transition ${
              boardView === "bull"
                ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Bullish Only
          </button>
          <button
            onClick={() => setBoardView("bear")}
            className={`rounded-md px-3 py-1 transition ${
              boardView === "bear"
                ? "bg-rose-600/30 text-rose-400 border border-rose-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Bearish Only
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      <div className={`grid gap-5 ${boardView === "both" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* BULLISH BOARD */}
        {(boardView === "both" || boardView === "bull") && (
          <div className="rounded-xl border border-emerald-500/20 bg-[#0a0e17] overflow-hidden shadow-xl">
            {/* Board Header */}
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                    Bullish Board (Top 20)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Cleanly rising above open · Passed 2:1 direction gate
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
                {filteredBull.length} Leaders
              </span>
            </div>

            {/* Board Content */}
            <div className="divide-y divide-slate-800/60 overflow-x-auto">
              {filteredBull.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No stocks match the selected filter.
                </div>
              ) : (
                filteredBull.map((stock) => {
                  const isSelected = selectedSymbol === stock.symbol;
                  const isPick = stock.ruleStatus.includes("PICK");
                  const isCap = stock.ruleStatus.includes("sector cap");
                  const isRisk = stock.ruleStatus.includes("extreme move");

                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => onSelectStock(stock)}
                      className={`group flex items-center justify-between p-3 transition cursor-pointer hover:bg-slate-800/40 ${
                        isSelected ? "bg-emerald-950/30 border-l-4 border-l-emerald-400" : ""
                      }`}
                    >
                      {/* Rank & Symbol */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-7">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{stock.rank}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400">
                            {stock.percentile}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition">
                              {stock.symbol}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-medium text-slate-400">
                              {stock.sector}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Z: {formatINR(stock.zoneLevelZ)} · S1: {formatINR(stock.invalidationS1)}
                          </div>
                        </div>
                      </div>

                      {/* Sparkline Thumbnail */}
                      <div className="hidden sm:block h-6 w-20">
                        <svg className="h-full w-full" viewBox="0 0 100 30">
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            points="0,25 15,22 30,18 45,20 60,12 75,10 90,6 100,2"
                          />
                        </svg>
                      </div>

                      {/* Strength Score & Status Badge */}
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formatINR(stock.ltp)}
                          </div>
                          <div className="font-mono text-xs font-semibold text-emerald-400">
                            +{stock.changePct.toFixed(2)}%
                          </div>
                        </div>

                        <div className="flex flex-col items-end min-w-[100px]">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {stock.strengthScore}x ADM
                          </span>
                          <span
                            className={`mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-mono font-bold border ${
                              isPick
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                : isCap
                                ? "border-slate-700 bg-slate-800 text-slate-400"
                                : isRisk
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                : "border-slate-800 bg-slate-900 text-slate-400"
                            }`}
                          >
                            {stock.ruleStatus}
                          </span>
                        </div>

                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* BEARISH BOARD */}
        {(boardView === "both" || boardView === "bear") && (
          <div className="rounded-xl border border-rose-500/20 bg-[#0a0e17] overflow-hidden shadow-xl">
            {/* Board Header */}
            <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-950/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                    Bearish Board (Top 20)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Cleanly falling below open · Passed 2:1 direction gate
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-bold text-rose-400 border border-rose-500/30">
                {filteredBear.length} Leaders
              </span>
            </div>

            {/* Board Content */}
            <div className="divide-y divide-slate-800/60 overflow-x-auto">
              {filteredBear.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No stocks match the selected filter.
                </div>
              ) : (
                filteredBear.map((stock) => {
                  const isSelected = selectedSymbol === stock.symbol;
                  const isPick = stock.ruleStatus.includes("PICK");
                  const isCap = stock.ruleStatus.includes("sector cap");
                  const isRisk = stock.ruleStatus.includes("extreme move");

                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => onSelectStock(stock)}
                      className={`group flex items-center justify-between p-3 transition cursor-pointer hover:bg-slate-800/40 ${
                        isSelected ? "bg-rose-950/30 border-l-4 border-l-rose-400" : ""
                      }`}
                    >
                      {/* Rank & Symbol */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-7">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{stock.rank}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400">
                            {stock.percentile}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm group-hover:text-rose-400 transition">
                              {stock.symbol}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-medium text-slate-400">
                              {stock.sector}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Z: {formatINR(stock.zoneLevelZ)} · R1: {formatINR(stock.invalidationS1)}
                          </div>
                        </div>
                      </div>

                      {/* Sparkline Thumbnail */}
                      <div className="hidden sm:block h-6 w-20">
                        <svg className="h-full w-full" viewBox="0 0 100 30">
                          <polyline
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="1.5"
                            points="0,5 15,8 30,14 45,12 60,20 75,22 90,26 100,28"
                          />
                        </svg>
                      </div>

                      {/* Strength Score & Status Badge */}
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formatINR(stock.ltp)}
                          </div>
                          <div className="font-mono text-xs font-semibold text-rose-400">
                            {stock.changePct.toFixed(2)}%
                          </div>
                        </div>

                        <div className="flex flex-col items-end min-w-[100px]">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {stock.strengthScore}x ADM
                          </span>
                          <span
                            className={`mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-mono font-bold border ${
                              isPick
                                ? "border-rose-500/40 bg-rose-500/20 text-rose-300"
                                : isCap
                                ? "border-slate-700 bg-slate-800 text-slate-400"
                                : isRisk
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                : "border-slate-800 bg-slate-900 text-slate-400"
                            }`}
                          >
                            {stock.ruleStatus}
                          </span>
                        </div>

                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
