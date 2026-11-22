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
            How the OrderBlock rankings are produced, where the data comes from, and our non-advisory positioning stated plainly.
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300">
          {/* Section 1: Nature of the service */}
          <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-6 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-400" />
              1. Nature of the Service (100% Free)
            </h2>
            <p className="leading-relaxed">
              OrderBlock is a 100% free browser-based analytical terminal for Indian equity and F&O traders. There are NO paid tiers, NO Razorpay subscription paywalls, and NO hidden fees. Every trader sees the exact same normalized rankings and structural levels simultaneously. We do not provide personalized recommendations, trade execution, portfolio management, or custody of funds.
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
                <strong>Average Daily Move (ADM):</strong> Based on completed sessions over roughly the last 50 calendar sessions and fixed shortly after open.
              </li>
              <li>
                <strong>2:1 Direction Gate:</strong> A move counts only when clearly one-sided: distance travelled on one side of the open must exceed twice (&gt;2.0x) the distance on the adverse side. Otherwise, the score defaults to zero to eliminate choppy two-sided market noise.
              </li>
              <li>
                <strong>Refresh Cadence:</strong> Rankings refresh every minute. Cleanly rising stocks rank on the Bullish Board; cleanly falling stocks rank on the Bearish Board.
              </li>
              <li>
                <strong>Top 3 Picks & Sector Cap:</strong> Top three contenders per board become designated picks, subject to a strict cap of maximum 2 stocks per sector to prevent overconcentration.
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
              Order blocks identify the last opposite-colored candle before a forceful displacement move that breaks market structure on completed 5-minute candles. The reference planning level (Z) marks the entry zone boundary. S1 defines the invalidation level where a 5-minute close terminates the setup thesis.
            </p>
          </div>

          {/* Section 4: SEBI Regulatory Status */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-6 space-y-3">
            <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              4. Regulatory Disclaimer (SEBI Compliance)
            </h2>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              OrderBlock is not registered with SEBI as an investment adviser (IA), research analyst (RA), stock broker, or portfolio manager. All content and rankings are purely algorithmic technical price-action analytics for educational purposes. Trading in derivatives (Futures & Options) involves substantial market risk of loss.
            </p>
          </div>
        </div>
      </main>

      <SebiDisclaimerBar />
    </div>
  );
}
