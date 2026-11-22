"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { formatINR } from "@/lib/format-inr";
import {
  BookOpen,
  PlusCircle,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Trash2,
  Tag,
  CheckCircle2,
  DollarSign
} from "lucide-react";

interface JournalEntry {
  id: string;
  dateIst: string;
  dateKey: string; // YYYY-MM-DD for calendar heatmap
  symbol: string;
  side: "LONG" | "SHORT";
  setupTag: string;
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  rMultiple: number;
  notes: string;
}

const INITIAL_ENTRIES: JournalEntry[] = [
  {
    id: "j1",
    dateIst: "20 Nov 2026, 11:25 IST",
    dateKey: "2026-11-20",
    symbol: "HDFCBANK",
    side: "LONG",
    setupTag: "Order Block Retest",
    qty: 550,
    entry: 1741.0,
    exit: 1765.0,
    pnl: 13200,
    rMultiple: 2.18,
    notes: "5m Bullish OB retest at Z level. Clean bounce with IT & Bank sector tailwind.",
  },
  {
    id: "j2",
    dateIst: "19 Nov 2026, 13:10 IST",
    dateKey: "2026-11-19",
    symbol: "TCS",
    side: "SHORT",
    setupTag: "Liquidity Sweep",
    qty: 175,
    entry: 4120.0,
    exit: 4075.0,
    pnl: 7875,
    rMultiple: 1.85,
    notes: "Bearish OB rejection after taking out early morning highs.",
  },
  {
    id: "j3",
    dateIst: "18 Nov 2026, 10:45 IST",
    dateKey: "2026-11-18",
    symbol: "TATAMOTORS",
    side: "LONG",
    setupTag: "Order Block Retest",
    qty: 700,
    entry: 810.0,
    exit: 824.0,
    pnl: 9800,
    rMultiple: 2.4,
    notes: "Auto sector pick #1. Hit R1 target cleanly.",
  },
];

function JournalContent() {
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orderzero_journal");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return INITIAL_ENTRIES;
        }
      }
    }
    return INITIAL_ENTRIES;
  });

  // Form states with URL param prefill
  const [symbol, setSymbol] = useState(searchParams?.get("symbol") || "HDFCBANK");
  const [side, setSide] = useState<"LONG" | "SHORT">(
    searchParams?.get("direction") === "bearish" ? "SHORT" : "LONG"
  );
  const [setupTag, setSetupTag] = useState("Order Block Retest");
  const [qty, setQty] = useState(550);
  const [entry, setEntry] = useState(
    searchParams?.get("entry") ? Number(searchParams.get("entry")) : 1741.0
  );
  const [exit, setExit] = useState(
    searchParams?.get("target") ? Number(searchParams.get("target")) : 1765.0
  );
  const [notes, setNotes] = useState("");

  // Persist to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orderzero_journal", JSON.stringify(entries));
    }
  }, [entries]);

  const addJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const pnl = side === "LONG" ? (exit - entry) * qty : (entry - exit) * qty;
    const risk = Math.abs(entry * 0.007); // ~0.7% default risk per share
    const rMultiple = Number(((exit - entry) * (side === "LONG" ? 1 : -1) / Math.max(risk, 0.1)).toFixed(2));

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];

    const newEntry: JournalEntry = {
      id: `j_${Date.now()}`,
      dateIst: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      dateKey,
      symbol: symbol.toUpperCase().trim(),
      side,
      setupTag,
      qty,
      entry,
      exit,
      pnl: Math.round(pnl),
      rMultiple,
      notes,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setNotes("");
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totalPnl = entries.reduce((acc, e) => acc + e.pnl, 0);
  const winCount = entries.filter((e) => e.pnl > 0).length;
  const winRate = entries.length > 0 ? ((winCount / entries.length) * 100).toFixed(1) : "0";

  // Group P&L by calendar date
  const datePnlMap = entries.reduce((acc, e) => {
    acc[e.dateKey] = (acc[e.dateKey] || 0) + e.pnl;
    return acc;
  }, {} as Record<string, number>);

  // Render 30-day Calendar Heatmap
  const calendarDays = Array.from({ length: 28 }, (_, i) => {
    const dayNum = i + 1;
    const dateKey = `2026-11-${dayNum < 10 ? `0${dayNum}` : dayNum}`;
    const pnl = datePnlMap[dateKey];
    return { dayNum, dateKey, pnl };
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Trading Journal & P&L Calendar
            </h1>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
              STAGE 5
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Log your Order Block retests, track realized R-multiples & review your monthly P&L heatmap.
          </p>
        </div>

        {/* Stats Pill Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-[#0d121f] px-4 py-2">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Net P&L</div>
            <div className={`font-mono text-lg font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalPnl >= 0 ? "+" : ""}{formatINR(totalPnl)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0d121f] px-4 py-2">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Win Rate</div>
            <div className="font-mono text-lg font-bold text-cyan-400">
              {winRate}% ({winCount}/{entries.length})
            </div>
          </div>
        </div>
      </div>

      {/* Monthly P&L Calendar Heatmap */}
      <section className="rounded-2xl border border-slate-800 bg-[#0a0e17] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              November 2026 P&L Heatmap
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Profit Day
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Loss Day
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center font-mono text-[10px] font-bold text-slate-400 py-1">
              {d}
            </div>
          ))}

          {calendarDays.map((cd) => (
            <div
              key={cd.dateKey}
              className={`flex flex-col items-center justify-center rounded-lg p-2 h-16 border transition ${
                cd.pnl === undefined
                  ? "border-slate-800/80 bg-slate-900/40 text-slate-400"
                  : cd.pnl > 0
                  ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                  : "border-rose-500/40 bg-rose-950/30 text-rose-300"
              }`}
            >
              <span className="font-mono text-xs text-slate-400 font-semibold self-start">{cd.dayNum}</span>
              {cd.pnl !== undefined && (
                <span className="font-mono text-[11px] font-bold mt-1">
                  {cd.pnl > 0 ? "+" : ""}{formatINR(cd.pnl)}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Log Trade Form & Entry History */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* New Trade Form */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-5 shadow-xl">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <PlusCircle className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Log Executed Setup
            </h2>
          </div>

          <form onSubmit={addJournalEntry} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">F&O Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-bold text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-900 p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSide("LONG")}
                    className={`rounded py-1 text-center font-bold ${
                      side === "LONG" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("SHORT")}
                    className={`rounded py-1 text-center font-bold ${
                      side === "SHORT" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Lot Quantity</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Entry Price (Z)</label>
                <input
                  type="number"
                  step="any"
                  value={entry}
                  onChange={(e) => setEntry(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  value={exit}
                  onChange={(e) => setExit(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Setup Rule Tag</label>
              <select
                value={setupTag}
                onChange={(e) => setSetupTag(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="Order Block Retest">Order Block Retest (Z Level)</option>
                <option value="Liquidity Sweep">Liquidity Sweep & Reversal</option>
                <option value="BOS Continuation">BOS Structural Continuation</option>
                <option value="15m ORB Breakout">15m ORB Breakout</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Trade Notes & Mindset</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Why did you take this setup? Did you wait for completed candle?"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Save to Journal
            </button>
          </form>
        </div>

        {/* Trade Entries List */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-5 shadow-xl lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Recorded Trades ({entries.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Saved locally in browser
            </span>
          </div>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No trades logged yet. Click &quot;Log in Journal&quot; from the terminal or add your first setup above.
              </div>
            ) : (
              entries.map((trade) => {
                const isProfitable = trade.pnl >= 0;
                return (
                  <div
                    key={trade.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono font-bold text-xs border ${
                          trade.side === "LONG"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {trade.side === "LONG" ? "L" : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{trade.symbol}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                            {trade.setupTag}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Entry: {formatINR(trade.entry)} → Exit: {formatINR(trade.exit)} ({trade.qty} shares)
                        </div>
                        {trade.notes && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">
                            &quot;{trade.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div
                          className={`font-mono text-base font-bold ${
                            isProfitable ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isProfitable ? "+" : ""}{formatINR(trade.pnl)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {trade.rMultiple > 0 ? `+${trade.rMultiple}R` : `${trade.rMultiple}R`}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteEntry(trade.id)}
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function JournalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-white">
      <AppNavbar />
      <Suspense fallback={<div className="p-10 text-center text-xs text-slate-400">Loading journal...</div>}>
        <JournalContent />
      </Suspense>
      <SebiDisclaimerBar />
    </div>
  );
}
