"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";

export default function FreeAccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center p-4">
        <div className="w-full rounded-2xl border border-[#10B981]/50 bg-[#141417] p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#10B981]" />
          <h1 className="mt-3 text-2xl font-bold">OrderZero is 100% Free</h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            All features—including Multi-Chart Layouts, MTF Order Blocks, NIFTY 500
            Screener, Options Chain, Alerts, Backtester, Trade Journal, Paper Trading,
            and DhanHQ v2 Live Feeds—are completely free with no subscription required.
          </p>
          <Link
            href="/chart/NIFTY%2050"
            className="mt-6 inline-block rounded-lg bg-[#10B981] px-6 py-2.5 text-xs font-bold text-[#09090B] hover:bg-emerald-400"
          >
            Open Chart Terminal
          </Link>
        </div>
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
