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
      tagline: "Example workflow only; the times shown are illustrative and do not indicate when to trade.",
      actions: [
        "Check top strip: Are F&O stock dots distributed heavily above or below zero?",
        "Compare the generated bullish and bearish counts as a breadth-reading exercise.",
        "Inspect the generated sector examples and note how they differ.",
        "Describe the sample as broad, mixed, or concentrated; this is not a trading signal.",
      ],
      ruleQuote: "Sample review question: does participation look broad or concentrated?",
    },
    {
      num: 2,
      title: "Choose Your Side",
      timing: "09:22 AM IST",
      badge: "Stage 2: Directional Alignment",
      icon: GitFork,
      tagline: "Use the separate boards to study how directional ranking is displayed.",
      actions: [
        "Compare both boards; neither board is a recommendation.",
        "The demo ranks generated examples independently by direction.",
        "Public material describes normalized movement relative to an average daily move.",
        "This demo applies an illustrative 2:1 direction gate to synthetic inputs.",
      ],
      ruleQuote: "A ranking organizes review; it does not predict future price movement.",
    },
    {
      num: 3,
      title: "Shortlist from Board",
      timing: "09:25 AM IST",
      badge: "Stage 3: 20 Contenders → Top 3 Picks",
      icon: Filter,
      tagline: "Use the generated boards to practice a structured review.",
      actions: [
        "Inspect the Top 20 ranked leaders on your chosen side.",
        "Review the generated sample rankings; they are not recommendations.",
        "The demo does not apply a verified sector-concentration filter.",
        "The extreme-move flag is synthetic and does not use news or event data.",
      ],
      ruleQuote: "The demo limits generated picks to two per sector; this is not a live diversification control.",
    },
    {
      num: 4,
      title: "Inspect Zone & Wait",
      timing: "09:30–14:30 IST",
      badge: "Stage 4: Diagnostic Popup & Retest",
      icon: Crosshair,
      tagline: "Inspect example zones and levels from the selected chart candles.",
      actions: [
        "Tap the stock to open its Order Block Diagnostic Popup.",
        "Review 'Z' (zone reference), 'S1' (invalidation example), and the other generated levels.",
        "Treat the displayed reward-to-risk value as a calculation example, not a target or threshold.",
        "Compare the generated VWAP reference with the generated sample candles.",
        "The popup is a chart-study aid; it does not provide an entry, exit, or execution instruction.",
      ],
      ruleQuote: "The sample marks a close beyond S1 as an invalidation example; verify calculations independently.",
    },
    {
      num: 5,
      title: "Size and Log Trade",
      timing: "Post-Execution & EOD",
      badge: "Stage 5: Risk Control & Learning",
      icon: BookOpen,
      tagline: "The journal can store observations for later review in this browser.",
      actions: [
        "No portfolio allocation or fixed risk percentage is prescribed by this demo.",
        "Use the journal to record an observation and the assumptions behind it.",
        "Setup tags are labels for organizing personal notes.",
        "The P&L calendar reflects only entries you record in this browser.",
      ],
      ruleQuote: "A journal is a record-keeping feature; it does not validate a trading strategy.",
    },
  ];

  return (
    <div className="w-full space-y-8 rounded-2xl border border-slate-800 bg-[#0a0e17] p-4 text-white sm:p-8 shadow-2xl">
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-400">
          <Zap className="h-3.5 w-3.5" />
          SAMPLE REVIEW WORKFLOW
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          From a Sample Scan to an SMC Review
        </h2>
        <p className="text-xs text-slate-400 sm:text-sm">
          Example educational workflow. The scan uses generated values and a limited reference list.
        </p>
      </div>

      {/* The OrderBlock Funnel Diagram */}
      <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5 shadow-inner">
        <div className="text-center mb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
            Example Review Flow
          </span>
          <p className="text-[11px] text-slate-500">Illustrative steps; this is not a live market screener</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="relative rounded-xl border border-slate-700/80 bg-slate-900/80 p-3.5 text-center">
            <div className="font-mono text-2xl font-extrabold text-cyan-400">222</div>
            <div className="text-xs font-bold text-white mt-1">Reference Entries</div>
            <div className="text-[10px] text-slate-400 mt-1">Static symbols and generated demo metrics</div>
            <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 z-10" />
          </div>

          {/* Step 2 */}
          <div className="relative rounded-xl border border-slate-700/80 bg-slate-900/80 p-3.5 text-center">
            <div className="font-mono text-2xl font-extrabold text-emerald-400">40</div>
            <div className="text-xs font-bold text-white mt-1">Demo Rankings</div>
            <div className="text-[10px] text-slate-400 mt-1">Example strength filters over static inputs</div>
            <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 z-10" />
          </div>

          {/* Step 3 */}
          <div className="relative rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 text-center">
            <div className="font-mono text-2xl font-extrabold text-amber-400">6</div>
            <div className="text-xs font-bold text-white mt-1">Review Examples</div>
            <div className="text-[10px] text-slate-400 mt-1">Not recommendations; no news filter is connected</div>
            <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 z-10" />
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-emerald-500 bg-emerald-950/30 p-3.5 text-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="font-mono text-2xl font-extrabold text-emerald-400">1</div>
            <div className="text-xs font-bold text-white mt-1">One Clear Zone</div>
            <div className="text-[10px] text-slate-400 mt-1">Illustrative Z/S1/R1/R2 reference levels</div>
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
