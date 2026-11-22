"use client";

import React, { useState } from "react";
import { 
  BarChart2, 
  GitFork, 
  Filter, 
  Crosshair, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  ShieldAlert,
  Clock,
  Zap
} from "lucide-react";

export function PlaybookFlowchart() {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      num: 1,
      title: "Read the Market",
      timing: "09:20 AM IST",
      badge: "Stage 1: Breadth & Flow",
      icon: BarChart2,
      tagline: "Avoid the chaotic 09:15–09:20 opening auction driven by overnight emotion.",
      actions: [
        "Check top strip: Are F&O stock dots distributed heavily above or below zero?",
        "Read Bullish vs Bearish count (e.g. 124 Advancing vs 78 Declining).",
        "Inspect Strongest and Weakest sector pills (e.g. IT +2.4%, Auto +1.8%).",
        "Verdict: Decide if session is broad-based trending or choppy/mixed before opening charts.",
      ],
      ruleQuote: "Never trade against the broad market breadth tide on Indian F&O stocks.",
    },
    {
      num: 2,
      title: "Choose Your Side",
      timing: "09:22 AM IST",
      badge: "Stage 2: Directional Alignment",
      icon: GitFork,
      tagline: "Cut screen clutter and decision fatigue in half.",
      actions: [
        "If market breadth is heavily Bullish (>60% advances), discard the Bearish board entirely.",
        "If breadth is Bearish, focus exclusively on the Bearish board.",
        "Both boards score stocks independently using normalized intraday strength.",
        "Direction Gate: Only stocks moving >2.0x in one direction vs opposite excursion qualify.",
      ],
      ruleQuote: "Pick one side and master it for the day. Trying to trade both sides creates confusion.",
    },
    {
      num: 3,
      title: "Shortlist from Board",
      timing: "09:25 AM IST",
      badge: "Stage 3: 20 Contenders → Top 3 Picks",
      icon: Filter,
      tagline: "Turn 200+ noisy stocks into an ultra-clean 3-symbol review list.",
      actions: [
        "Inspect the Top 20 ranked leaders on your chosen side.",
        "Look for the official 'PICK · BULLISH #1 / #2 / #3' tags.",
        "Sector Cap Filter: Max 2 picks allowed from any single sector (prevents overconcentration).",
        "Event Risk Filter: Uncharacteristic news spikes without structure are labeled 'NOT PICKED · event risk'.",
      ],
      ruleQuote: "No more than 2 picks from one sector. If IT is flying, pick the top 2 and leave the rest.",
    },
    {
      num: 4,
      title: "Inspect Zone & Wait",
      timing: "09:30–14:30 IST",
      badge: "Stage 4: Diagnostic Popup & Retest",
      icon: Crosshair,
      tagline: "Define the exact entry, invalidation stop, and targets in under 10 seconds.",
      actions: [
        "Tap the stock to open its Order Block Diagnostic Popup.",
        "Identify 'Z' (Zone Level) entry reference price and 'S1' invalidation level.",
        "Check Risk-Reward: Verify R:R is at least 1:2.0 toward R1 or R2 targets.",
        "VWAP Confirmation: Price should be on the correct side of the session VWAP.",
        "Patience: Wait for price to pull back and test the Order Block zone. Never chase market orders.",
      ],
      ruleQuote: "A 5-minute candle close beyond S1 ends the setup immediately. Honor the invalidation.",
    },
    {
      num: 5,
      title: "Size and Log Trade",
      timing: "Post-Execution & EOD",
      badge: "Stage 5: Risk Control & Learning",
      icon: BookOpen,
      tagline: "Consistency comes from execution discipline, not crystal balls.",
      actions: [
        "Calculate position size using: Position = (Total Capital × 1% Risk) ÷ |Z - S1|.",
        "Click 'Log in Journal' directly from the popup to save entry, stop, and targets.",
        "Tag setup: 'OB Retest', 'Liquidity Sweep', or 'BOS Continuation'.",
        "Review daily performance on the P&L Calendar Heatmap.",
      ],
      ruleQuote: "Size every trade from your stop-loss distance, never by lot budget alone.",
    },
  ];

  return (
    <div className="w-full space-y-8 rounded-2xl border border-slate-800 bg-[#0a0e17] p-4 text-white sm:p-8 shadow-2xl">
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-400">
          <Zap className="h-3.5 w-3.5" />
          THE ORDERBLOCK METHODOLOGY
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          From 200+ F&O Stocks to One Clear Zone
        </h2>
        <p className="text-xs text-slate-400 sm:text-sm">
          Consistent institutional traders repeat the exact same five-step routine every single trading session.
        </p>
      </div>

      {/* The OrderBlock Funnel Diagram */}
      <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5 shadow-inner">
        <div className="text-center mb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
            The OrderBlock Funnel
          </span>
          <p className="text-[11px] text-slate-500">Each step removes noise so you never suffer from decision fatigue</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="relative rounded-xl border border-slate-700/80 bg-slate-900/80 p-3.5 text-center">
            <div className="font-mono text-2xl font-extrabold text-cyan-400">200+</div>
            <div className="text-xs font-bold text-white mt-1">Every F&O Stock</div>
            <div className="text-[10px] text-slate-400 mt-1">Scanned live for one-directional strength & OB zones</div>
            <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 z-10" />
          </div>

          {/* Step 2 */}
          <div className="relative rounded-xl border border-slate-700/80 bg-slate-900/80 p-3.5 text-center">
            <div className="font-mono text-2xl font-extrabold text-emerald-400">40</div>
            <div className="text-xs font-bold text-white mt-1">Contenders</div>
            <div className="text-[10px] text-slate-400 mt-1">Top 20 Bullish & Top 20 Bearish passed 2:1 direction gate</div>
            <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 z-10" />
          </div>

          {/* Step 3 */}
          <div className="relative rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 text-center">
            <div className="font-mono text-2xl font-extrabold text-amber-400">6</div>
            <div className="text-xs font-bold text-white mt-1">Top Picks</div>
            <div className="text-[10px] text-slate-400 mt-1">Filtered by sector cap (max 2) & event risk protection</div>
            <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 z-10" />
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-emerald-500 bg-emerald-950/30 p-3.5 text-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="font-mono text-2xl font-extrabold text-emerald-400">1</div>
            <div className="text-xs font-bold text-white mt-1">One Clear Zone</div>
            <div className="text-[10px] text-slate-400 mt-1">Exact Z entry, S1 invalidation, targets R1/R2, R:R ≥ 1:2</div>
          </div>
        </div>
      </div>

      {/* Interactive 5-Step Process Flow */}
      <div className="space-y-4">
        {/* Step Navigation Pills */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 border-b border-slate-800">
          {steps.map((st) => {
            const Icon = st.icon;
            const isCurrent = activeStep === st.num;
            return (
              <button
                key={st.num}
                onClick={() => setActiveStep(st.num)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  isCurrent
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono ${
                  isCurrent ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"
                }`}>
                  {st.num}
                </div>
                <span>{st.title}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Step Detail Card */}
        {(() => {
          const current = steps[activeStep - 1];
          const Icon = current.icon;
          return (
            <div className="rounded-2xl border border-slate-700/80 bg-[#0e1424] p-6 shadow-xl animate-in fade-in duration-200">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-cyan-400">
                        {current.badge}
                      </span>
                      <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {current.timing}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      Step {current.num}: {current.title}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-sm font-medium text-slate-300">
                  {current.tagline}
                </p>

                {/* Action Items List */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {current.actions.map((act, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-900/60 p-3 border border-slate-800/80">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                      <span className="text-xs text-slate-300 leading-relaxed">{act}</span>
                    </div>
                  ))}
                </div>

                {/* Institutional Golden Rule Banner */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 flex items-center gap-3 text-xs text-amber-300">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <strong className="text-amber-200 font-semibold uppercase tracking-wider text-[10px] block">
                      Execution Rule:
                    </strong>
                    {current.ruleQuote}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
