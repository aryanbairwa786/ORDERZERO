"use client";

import React from "react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { ShieldCheck, Info, CheckCircle2, AlertTriangle, Scale } from "lucide-react";

export default function DisclosuresPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-white">
      <AppNavbar />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-4 sm:p-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            TRANSPARENCY & METHODOLOGY
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Methodology & Disclosures
          </h1>
          <p className="mt-1 text-sm text-slate-400">
              How the demo rankings are produced, where the data comes from, and the limits of this independent educational project.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300">
          {/* Section 1: Nature of the service */}
          <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-6 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-400" />
              1. Nature of the Service and Costs
            </h2>
            <p className="leading-relaxed">
              This repository has no subscription billing and the demo screens can be used without an app subscription. Hosting, optional broker access, and authorized market-data entitlements are controlled by third-party providers and may have costs or limits. The terminal uses generated data; the screener and chart may use unofficial Yahoo Finance data. We do not provide personalized recommendations, trade execution, portfolio management, or custody of funds.
            </p>
          </div>

          {/* Section 2: How rankings are produced */}
          <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-400" />
              2. How the Rankings are Produced
            </h2>
            <div className="rounded-lg bg-slate-900/90 p-4 border border-slate-800 font-mono text-emerald-300 text-xs">
              strength = today&apos;s one-directional move from the open ÷ the stock&apos;s average daily move
            </div>
            <ul className="space-y-2 text-xs text-slate-300 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Average Daily Move (ADM):</strong> The 222-entry terminal uses static demonstration inputs, not a rolling exchange calculation.
              </li>
              <li>
                <strong>2:1 Direction Gate:</strong> The generated terminal example compares one-sided travel with adverse travel. Its output is illustrative and does not evaluate current market conditions.
              </li>
              <li>
                <strong>Refresh Cadence:</strong> This terminal has no scheduled refresh or live feed. Reloading does not turn its fixed example inputs into market data.
              </li>
              <li>
                <strong>Board examples:</strong> Bullish and bearish rankings are generated examples, not picks or recommendations. The extreme-move flag is a synthetic price threshold; no news or event feed is connected.
              </li>
            </ul>
          </div>

          {/* Section 3: Order Block Detection & Levels */}
          <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-6 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
              3. Order Block Detection & Structural Levels
            </h2>
            <p className="leading-relaxed text-xs">
              The SMC engine identifies structure from the candles supplied to it at the selected timeframe. In this web build, chart data may be generated demo candles or unofficial Yahoo Finance history. Zones and reference levels are software calculations, can be wrong, and are not trade instructions. There is no broker connection flow in the web interface.
            </p>
          </div>

          {/* Section 4: SEBI Regulatory Status */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-6 space-y-3">
            <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              4. Educational Use Disclaimer
            </h2>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              This tool is for educational and informational purposes only and is not investment advice. It does not execute trades. Derivatives involve substantial risk, and generated or unofficial data may be incomplete or wrong. Verify data and consider your own circumstances before making financial decisions.
            </p>
          </div>
        </div>
      </main>

      <SebiDisclaimerBar />
    </div>
  );
}
