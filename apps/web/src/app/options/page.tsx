"use client";

import { useEffect, useState } from "react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { formatINR, formatIndianCompact } from "@/lib/format-inr";

const ENGINE_URL =
  process.env.NEXT_PUBLIC_SMC_ENGINE_URL || "http://localhost:8000";

interface OptionRow {
  strike: number;
  is_atm: boolean;
  ce_oi: number;
  ce_chg_oi: number;
  ce_iv: number;
  ce_ltp: number;
  pe_ltp: number;
  pe_iv: number;
  pe_chg_oi: number;
  pe_oi: number;
}

interface OptionChainData {
  symbol: string;
  spot: number;
  atm_strike: number;
  total_ce_oi: number;
  total_pe_oi: number;
  pcr: number;
  max_pain: number;
  strikes: OptionRow[];
}

export default function OptionsPage() {
  const [symbol, setSymbol] = useState("NIFTY 50");
  const [chain, setChain] = useState<OptionChainData | null>(null);

  useEffect(() => {
    fetch(`${ENGINE_URL}/api/v1/options/chain?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.strikes) setChain(json);
      })
      .catch(() => {});
  }, [symbol]);

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">NSE / BSE Options Chain Analytics</h1>
            <p className="text-xs text-zinc-400">
              Open Interest (OI), Change in OI, Put-Call Ratio (PCR), and Max Pain
            </p>
          </div>
          <div className="flex items-center gap-2">
            {["NIFTY 50", "BANK NIFTY", "FIN NIFTY", "SENSEX"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  symbol === s
                    ? "bg-[#10B981] text-[#09090B]"
                    : "border border-zinc-800 bg-[#141417] text-zinc-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {chain && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Spot Price</div>
                <div className="mt-1 font-mono text-lg font-bold">{formatINR(chain.spot)}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">PCR (OI)</div>
                <div className="mt-1 font-mono text-lg font-bold text-[#10B981]">
                  {chain.pcr}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Max Pain Strike</div>
                <div className="mt-1 font-mono text-lg font-bold text-[#8B5CF6]">
                  {formatINR(chain.max_pain, 0)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Total CE / PE OI</div>
                <div className="mt-1 font-mono text-sm font-semibold">
                  {formatIndianCompact(chain.total_ce_oi, false)} /{" "}
                  {formatIndianCompact(chain.total_pe_oi, false)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#141417]">
              <table className="w-full text-center font-mono text-xs">
                <thead className="border-b border-zinc-800 bg-[#09090B] text-[11px] text-zinc-400">
                  <tr>
                    <th className="px-2 py-2">CE OI</th>
                    <th className="px-2 py-2">Chg OI</th>
                    <th className="px-2 py-2">IV</th>
                    <th className="px-2 py-2">CE LTP</th>
                    <th className="bg-[#141417] px-3 py-2 text-white">STRIKE</th>
                    <th className="px-2 py-2">PE LTP</th>
                    <th className="px-2 py-2">IV</th>
                    <th className="px-2 py-2">Chg OI</th>
                    <th className="px-2 py-2">PE OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {chain.strikes.map((row) => (
                    <tr
                      key={row.strike}
                      className={row.is_atm ? "bg-[#8B5CF6]/15 font-bold" : ""}
                    >
                      <td className="px-2 py-2 text-zinc-300">
                        {formatIndianCompact(row.ce_oi, false)}
                      </td>
                      <td
                        className={`px-2 py-2 ${
                          row.ce_chg_oi >= 0 ? "text-[#10B981]" : "text-red-400"
                        }`}
                      >
                        {row.ce_chg_oi >= 0 ? "+" : ""}
                        {formatIndianCompact(row.ce_chg_oi, false)}
                      </td>
                      <td className="px-2 py-2 text-zinc-400">{row.ce_iv}%</td>
                      <td className="px-2 py-2 text-white">₹{row.ce_ltp.toFixed(2)}</td>
                      <td className="bg-[#09090B] px-3 py-2 font-bold text-[#8B5CF6]">
                        {row.strike}
                      </td>
                      <td className="px-2 py-2 text-white">₹{row.pe_ltp.toFixed(2)}</td>
                      <td className="px-2 py-2 text-zinc-400">{row.pe_iv}%</td>
                      <td
                        className={`px-2 py-2 ${
                          row.pe_chg_oi >= 0 ? "text-[#10B981]" : "text-red-400"
                        }`}
                      >
                        {row.pe_chg_oi >= 0 ? "+" : ""}
                        {formatIndianCompact(row.pe_chg_oi, false)}
                      </td>
                      <td className="px-2 py-2 text-zinc-300">
                        {formatIndianCompact(row.pe_oi, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
