"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { BreadthScatterStrip } from "@/components/terminal/BreadthScatterStrip";
import { generateTerminalData } from "@/lib/orderblock-engine";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Filter,
  GitFork,
  Layers,
  LineChart,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function OrderBlockLandingPage() {
  const [terminalDemo] = useState(() => generateTerminalData());
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const pillars = [
    {
      num: "01",
      title: "Order Block Charts",
      subtitle: "Explore market-structure zones and overlays.",
      points: [
        "Review order-block examples",
        "Explore liquidity and imbalance overlays",
        "Compare zones on the selected chart timeframe",
      ],
      badge: "5m Bar Structure",
    },
    {
      num: "02",
      title: "Liquidity Boards",
      subtitle: "Generated examples on separate Bullish and Bearish boards.",
      points: [
        "Explore generated rankings across a 222-symbol reference universe",
        "See the sample strength and direction rules",
        "Open an example symbol from either board",
      ],
      badge: "2:1 Direction Gate",
    },
    {
      num: "03",
      title: "Playbook & Journal",
      subtitle: "Repeat one disciplined routine every session.",
      points: [
        "From the demo universe to one clear zone example",
        "Automatic Risk-Reward (R:R) and invalidation levels",
        "Monthly P&L calendar heatmap to master consistency",
      ],
      badge: "Zero Decision Fatigue",
    },
  ];

  const faqs = [
    {
      q: "Is this website completely free?",
      a: "The app's demonstration features are free to use without a subscription. Market data is synthetic on the terminal. Optional provider access, data entitlements, and hosting plans are separate and may have costs or limits.",
    },
    {
      q: "What is an Order Block and how is it detected?",
      a: "An Order Block is commonly described as the last opposite-colored candle before a displacement that breaks a prior structure level. The chart engine marks candidate zones from supplied candles; generated and unofficial data can be wrong, so the levels are examples rather than instructions.",
    },
    {
      q: "How does the normalized Strength Score work?",
      a: "Each stock's strength score is calculated as: strength = today's one-directional move from open ÷ 50-day average daily move. To eliminate choppy noise, a stock only qualifies if movement on one side of open exceeds twice (>2.0x) the opposite travel.",
    },
    {
      q: "What are the Top 3 Filtered Picks?",
      a: "The dashboard displays generated sample rankings, not recommendations. Its sector cap is an illustrative code rule; the extreme-move flag uses no news or event data.",
    },
    {
      q: "Does this platform give buy/sell tips or automated algo execution?",
      a: "No. The app displays technical analysis examples for education and does not execute trades. Nothing shown is investment advice or a recommendation.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-white">
      <AppNavbar />

      <main className="flex-1 space-y-20 pb-20">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-14 pb-12 sm:pt-20">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

          <div className="mx-auto max-w-5xl px-4 text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>FREE SYNTHETIC DEMO · ORDER BLOCKS &amp; LIQUIDITY</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl sm:leading-[1.15]">
              See Actual <span className="text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-lg bg-emerald-950/20">Order Block</span> &amp; <span className="underline decoration-cyan-400 decoration-wavy underline-offset-8">Liquidity</span>
            </h1>

            <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-300">
              Explore a 222-symbol reference universe, ranking rules, and order-block examples. Terminal prices and rankings are generated demo values, not exchange data.
            </p>

            {/* Core Value Checklist */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-medium text-slate-300 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Institutional Level Order Block
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Find Liquidity Traps Early
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Confusion-Free Trading
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Works on Any Phone / PC
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-400 hover:scale-105"
              >
                <Activity className="h-4 w-4" />
                <span>Open Demo Terminal</span>
              </Link>
              <Link
                href="/playbook"
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                <span>See How It Works</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* LIVE TERMINAL PREVIEW SECTION */}
        <section className="mx-auto max-w-6xl px-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                Interactive Preview
              </span>
              <h2 className="text-xl font-bold text-white">
                Synthetic Breadth Strip &amp; Dual Contender Boards
              </h2>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              Launch Full Terminal <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <BreadthScatterStrip
            terminal={terminalDemo}
            onSelectStock={() => {}}
          />
        </section>

        {/* THE 3 PILLARS SECTION */}
        <section className="mx-auto max-w-6xl px-4 space-y-8">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
              Complete Trading Architecture
            </span>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Explore Order Blocks &amp; Liquidity Patterns
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pil) => (
              <div
                key={pil.num}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0c111e] p-6 shadow-xl transition hover:border-slate-700 hover:bg-[#0f1526]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-slate-600 group-hover:text-emerald-400 transition">
                      {pil.num}
                    </span>
                    <span className="rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-700">
                      {pil.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-white">{pil.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{pil.subtitle}</p>

                  <ul className="mt-5 space-y-2.5">
                    {pil.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300"
                  >
                    Explore in Terminal <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS / FUNNEL SECTION */}
        <section className="mx-auto max-w-5xl px-4 rounded-3xl border border-slate-800 bg-[#0a0f1c] p-6 sm:p-10 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
              Small Capital. Big Rewards.
            </span>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              How It Works: Repeat One Proven Workflow
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center space-y-2">
              <div className="font-mono text-3xl font-extrabold text-cyan-400">222</div>
              <div className="text-sm font-bold text-white">Every F&amp;O Stock</div>
              <p className="text-xs text-slate-400">
                Static reference symbols with generated demo candles and signals.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center space-y-2">
              <div className="font-mono text-3xl font-extrabold text-emerald-400">20</div>
              <div className="text-sm font-bold text-white">Strongest Ranked First</div>
              <p className="text-xs text-slate-400">
                Top 20 Bullish &amp; Top 20 Bearish contenders. Zero confusion.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center space-y-2">
              <div className="font-mono text-3xl font-extrabold text-amber-400">1</div>
              <div className="text-sm font-bold text-white">One Clear Zone</div>
              <p className="text-xs text-slate-400">
                Spot institutional zone, entry at Z, invalidation at S1, targets at R1/R2.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/playbook"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:underline"
            >
              <span>Read the Complete 5-Step Playbook Guide</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* 100% FREE COMMITMENT */}
        <section className="mx-auto max-w-4xl px-4 text-center space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 shadow-xl space-y-3">
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Free Demo Access
            </h2>
            <p className="mx-auto max-w-xl text-xs sm:text-sm text-slate-300">
              Demo screens and tools are available without a subscription. The terminal uses generated values; live market data requires an authorized provider and may involve separate data or hosting costs.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                Open the Demo Terminal
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="mx-auto max-w-3xl px-4 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">Everything you need to know about OrderBlock</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-[#0d121f] overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-slate-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-emerald-400" : "text-slate-400"
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SebiDisclaimerBar />
    </div>
  );
}
