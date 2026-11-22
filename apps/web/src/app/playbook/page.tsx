"use client";

import React from "react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { PlaybookFlowchart } from "@/components/terminal/PlaybookFlowchart";
import Link from "next/link";
import { Activity, BookOpen, ChevronRight } from "lucide-react";

export default function PlaybookPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-white">
      <AppNavbar />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 sm:p-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Link href="/dashboard" className="hover:text-cyan-400">Terminal</Link>
              <span>/</span>
              <span className="text-cyan-400">Playbook & Flowchart</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              The OrderBlock Daily Playbook
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              The systematic 5-step workflow used by disciplined traders to eliminate decision fatigue.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950"
            >
              <Activity className="h-4 w-4" />
              Open Terminal
            </Link>
          </div>
        </div>

        {/* The Full Flowchart Component */}
        <PlaybookFlowchart />

        {/* Additional Educational Guide on Reading Popups */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c111e] p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">
            How to Read an Order Block Setup in 10 Seconds
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="font-mono text-cyan-400 font-bold mb-1">01. The Zone (Z)</div>
              <p className="text-slate-300">
                The reference price level anchored to the last opposite candle before a forceful breakout. For bullish setups, Z is the top of the demand block.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="font-mono text-rose-400 font-bold mb-1">02. Invalidation (S1)</div>
              <p className="text-slate-300">
                The exact structural failure level. A single completed 5-minute candle closing beyond S1 proves the institutional thesis wrong. The distance |Z - S1| defines your risk.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="font-mono text-amber-400 font-bold mb-1">03. Targets (R1 & R2)</div>
              <p className="text-slate-300">
                High-probability reaction levels derived from untested swing points, day open, and opposing liquidity pools. Always target at least 1:2.0 Risk-Reward.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SebiDisclaimerBar />
    </div>
  );
}
