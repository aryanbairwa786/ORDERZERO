"use client";

import type React from "react";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, RefreshCw, Star } from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { formatINR, formatIndianCompact } from "@/lib/format-inr";

const ENGINE_URL =
  process.env.NEXT_PUBLIC_SMC_ENGINE_URL || "https://orderzero-lzpv.onrender.com";

interface ScreenerRow {
  symbol: string;
  exchange: string;
  sector: string;
  market_cap: string;
  is_fno: boolean;
  ltp: number;
  change_pct: number;
  volume: number;
  trend: string;
  nearest_ob_direction: string;
  nearest_ob_zone: string | null;
  distance_to_ob_pct: number | null;
  ob_strength: number;
  unfilled_fvgs: number;
  signals: string[];
  sparkline: number[];
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(max - min, 0.01);
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 72;
      const y = 20 - ((v - min) / span) * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={72} height={22} className="overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? "#10B981" : "#EF4444"}
        strokeWidth="1.6"
        points={pts}
      />
    </svg>
  );
}

export default function ScreenerPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [timeframe, setTimeframe] = useState("15m");
  const [sector, setSector] = useState("All");
  const [marketCap, setMarketCap] = useState("All");
  const [fnoOnly, setFnoOnly] = useState(true);
  const [minStrength, setMinStrength] = useState(0);
  const [signalFilter, setSignalFilter] = useState("All");
  const [watchlist, setWatchlist] = useState<string[]>(["NIFTY 50", "RELIANCE", "HDFCBANK"]);
  const [savedScans, setSavedScans] = useState<{ name: string; sector: string; tf: string }[]>([
    { name: "Banking Fresh OBs (15m)", sector: "Banking", tf: "15m" },
    { name: "IT Sweeps & FVGs (5m)", sector: "IT", tf: "5m" },
  ]);
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        timeframe,
        sector,
        market_cap: marketCap,
        fno_only: String(fnoOnly),
        min_strength: String(minStrength),
        signal_filter: signalFilter,
      });
      const resp = await fetch(`${ENGINE_URL}/api/v1/screener/scan?${qs.toString()}`);
      if (resp.ok) {
        const json = await resp.json();
        setRows(json.rows || []);
      }
    } catch {
      setRows([
        {
          symbol: "NIFTY 50",
          exchange: "NSE",
          sector: "Index",
          market_cap: "Large",
          is_fno: true,
          ltp: 24362.45,
          change_pct: 0.64,
          volume: 1450000,
          trend: "bullish",
          nearest_ob_direction: "bullish",
          nearest_ob_zone: "24290.00 - 24315.00",
          distance_to_ob_pct: 0.19,
          ob_strength: 88.5,
          unfilled_fvgs: 2,
          signals: ["Approaching Bullish OB", "Fresh BOS (bullish)"],
          sparkline: [24210, 24250, 24235, 24290, 24320, 24362],
        },
        {
          symbol: "RELIANCE",
          exchange: "NSE",
          sector: "Energy",
          market_cap: "Large",
          is_fno: true,
          ltp: 1298.4,
          change_pct: 1.12,
          volume: 820000,
          trend: "bullish",
          nearest_ob_direction: "bullish",
          nearest_ob_zone: "1286.00 - 1294.00",
          distance_to_ob_pct: 0.34,
          ob_strength: 84.0,
          unfilled_fvgs: 1,
          signals: ["Approaching Bullish OB", "1 Unfilled FVG"],
          sparkline: [1278, 1284, 1282, 1290, 1295, 1298],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, sector, marketCap, fnoOnly, minStrength, signalFilter]);

  const toggleWatch = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">NSE F&O & NIFTY 500 SMC Screener</h1>
            <p className="text-xs text-zinc-400">
              Click any row to open the interactive OrderZero chart with Order Block zones highlighted
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSavedScans((prev) => [
                  ...prev,
                  { name: `${sector} (${timeframe})`, sector, tf: timeframe },
                ])
              }
              className="flex items-center gap-1 rounded-md border border-zinc-700 bg-[#141417] px-3 py-1.5 text-xs hover:border-[#8B5CF6]"
            >
              <Bookmark className="h-3.5 w-3.5 text-[#8B5CF6]" /> Save Scan
            </button>
            <button
              type="button"
              onClick={runScan}
              className="flex items-center gap-1 rounded-md bg-[#10B981] px-3 py-1.5 text-xs font-bold text-[#09090B]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Saved Scans & Watchlist Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">Saved Scans:</span>
          {savedScans.map((sc) => (
            <button
              key={sc.name}
              type="button"
              onClick={() => {
                setSector(sc.sector);
                setTimeframe(sc.tf);
              }}
              className="rounded-full border border-zinc-800 bg-[#141417] px-2.5 py-1 text-[11px] text-zinc-300 hover:border-[#10B981]"
            >
              {sc.name}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-xl border border-zinc-800 bg-[#141417] p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2 py-1.5"
          >
            {["5m", "15m", "30m", "1H", "75m", "1D"].map((tf) => (
              <option key={tf} value={tf}>
                TF: {tf}
              </option>
            ))}
          </select>

          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2 py-1.5"
          >
            {["All", "Index", "Banking", "IT", "Energy", "Auto", "Pharma", "FMCG", "Infra", "NBFC"].map(
              (s) => (
                <option key={s} value={s}>
                  Sector: {s}
                </option>
              )
            )}
          </select>

          <select
            value={marketCap}
            onChange={(e) => setMarketCap(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2 py-1.5"
          >
            {["All", "Large", "Mid"].map((m) => (
              <option key={m} value={m}>
                Cap: {m}
              </option>
            ))}
          </select>

          <select
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2 py-1.5"
          >
            <option value="All">Signal: All</option>
            <option value="Inside">Inside Fresh OB</option>
            <option value="Approaching">Approaching OB</option>
            <option value="BOS">Fresh BOS</option>
            <option value="FVG">Unfilled FVG</option>
            <option value="Sweep">Liquidity Sweep</option>
          </select>

          <label className="flex items-center justify-between rounded border border-zinc-700 bg-[#09090B] px-2.5 py-1.5">
            <span>Min Score: {minStrength}</span>
            <input
              type="range"
              min={0}
              max={90}
              step={10}
              value={minStrength}
              onChange={(e) => setMinStrength(Number(e.target.value))}
              className="w-16 accent-[#10B981]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded border border-zinc-700 bg-[#09090B] px-2.5 py-1.5">
            <span>F&O Only</span>
            <input
              type="checkbox"
              checked={fnoOnly}
              onChange={(e) => setFnoOnly(e.target.checked)}
              className="accent-[#10B981]"
            />
          </label>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#141417]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-[#09090B] text-[11px] uppercase text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Symbol</th>
                <th className="px-3 py-2.5">Trend</th>
                <th className="px-3 py-2.5">LTP (₹)</th>
                <th className="px-3 py-2.5">% Chg</th>
                <th className="px-3 py-2.5">Dist to OB</th>
                <th className="px-3 py-2.5">OB Score</th>
                <th className="px-3 py-2.5">Avg Vol</th>
                <th className="px-3 py-2.5">Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {rows.map((r) => (
                <tr
                  key={r.symbol}
                  onClick={() => router.push(`/chart/${encodeURIComponent(r.symbol)}`)}
                  className="cursor-pointer transition hover:bg-zinc-900/80"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => toggleWatch(r.symbol, e)}
                        className={
                          watchlist.includes(r.symbol)
                            ? "text-amber-400"
                            : "text-zinc-600 hover:text-zinc-300"
                        }
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </button>
                      <div>
                        <div className="font-bold text-white">{r.symbol}</div>
                        <div className="text-[10px] text-zinc-500">
                          {r.sector} • {r.market_cap}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <MiniSparkline data={r.sparkline} positive={r.change_pct >= 0} />
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold">
                    {formatINR(r.ltp)}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono font-semibold ${
                      r.change_pct >= 0 ? "text-[#10B981]" : "text-red-400"
                    }`}
                  >
                    {r.change_pct >= 0 ? "+" : ""}
                    {r.change_pct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    {r.distance_to_ob_pct !== null ? `${r.distance_to_ob_pct}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-[#8B5CF6]/20 px-2 py-0.5 font-mono font-bold text-[#8B5CF6]">
                      {r.ob_strength}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-zinc-400">
                    {formatIndianCompact(r.volume, false)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.signals.map((sig) => (
                        <span
                          key={sig}
                          className="rounded bg-[#10B981]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#10B981]"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
