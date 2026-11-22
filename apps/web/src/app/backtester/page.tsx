"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { formatINR } from "@/lib/format-inr";

const ENGINE_URL =
  process.env.NEXT_PUBLIC_SMC_ENGINE_URL || "https://orderzero-lzpv.onrender.com";

interface BacktestResult {
  symbol: string;
  timeframe: string;
  initial_capital: number;
  final_capital: number;
  net_pnl_inr: number;
  net_return_pct: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  equity_curve: { index: number; timestamp: string; equity: number }[];
  trades: {
    ob_id: string;
    direction: string;
    entry_price: number;
    stop_loss: number;
    target_price: number;
    exit_price: number;
    outcome: string;
    r_multiple: number;
    pnl_inr: number;
  }[];
}

export default function BacktesterPage() {
  const [symbol, setSymbol] = useState("NIFTY 50");
  const [timeframe, setTimeframe] = useState("5m");
  const [capital, setCapital] = useState(500000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [rewardR, setRewardR] = useState(2.0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);

  const runBacktest = async () => {
    setRunning(true);
    try {
      const resp = await fetch(`${ENGINE_URL}/api/v1/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          timeframe,
          days: 12,
          initial_capital: capital,
          risk_per_trade_pct: riskPct,
          reward_r_multiple: rewardR,
        }),
      });
      if (resp.ok) {
        setResult(await resp.json());
      }
    } catch {
      // Offline fallback preview
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runBacktest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderEquityCurve = () => {
    if (!result || result.equity_curve.length < 2) return null;
    const vals = result.equity_curve.map((p) => p.equity);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    const pts = result.equity_curve
      .map((p, idx) => {
        const x = (idx / (result.equity_curve.length - 1)) * 700;
        const y = 130 - ((p.equity - min) / span) * 110;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg viewBox="0 0 700 140" className="h-36 w-full">
        <polyline
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          points={pts}
        />
      </svg>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4">
        <div>
          <h1 className="text-xl font-bold">Order Block Strategy Backtester</h1>
          <p className="text-xs text-zinc-400">
            Entry on OB mitigation touch • SL beyond OB zone • Target in R multiples
          </p>
        </div>

        <div className="grid gap-3 rounded-xl border border-zinc-800 bg-[#141417] p-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2"
          >
            {["NIFTY 50", "BANK NIFTY", "FIN NIFTY", "SENSEX"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2"
          >
            {["5m", "15m", "30m", "1H"].map((tf) => (
              <option key={tf} value={tf}>
                TF: {tf}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2 font-mono"
            placeholder="Capital ₹"
          />

          <input
            type="number"
            step="0.25"
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2 font-mono"
            placeholder="Risk %"
          />

          <input
            type="number"
            step="0.5"
            value={rewardR}
            onChange={(e) => setRewardR(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2 font-mono"
            placeholder="Target R"
          />

          <button
            type="button"
            onClick={runBacktest}
            disabled={running}
            className="flex items-center justify-center gap-1.5 rounded bg-[#10B981] px-4 py-2 font-bold text-[#09090B] hover:bg-emerald-400"
          >
            <Play className="h-3.5 w-3.5" /> {running ? "Running..." : "Run Backtest"}
          </button>
        </div>

        {result && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Net P&L</div>
                <div
                  className={`mt-1 font-mono text-lg font-bold ${
                    result.net_pnl_inr >= 0 ? "text-[#10B981]" : "text-red-400"
                  }`}
                >
                  {formatINR(result.net_pnl_inr)} ({result.net_return_pct}%)
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Win Rate</div>
                <div className="mt-1 font-mono text-lg font-bold text-white">
                  {result.win_rate_pct}%
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Profit Factor</div>
                <div className="mt-1 font-mono text-lg font-bold text-[#8B5CF6]">
                  {result.profit_factor}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Max Drawdown</div>
                <div className="mt-1 font-mono text-lg font-bold text-red-400">
                  {result.max_drawdown_pct}%
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141417] p-3.5">
                <div className="text-[11px] text-zinc-400">Trades (W / L)</div>
                <div className="mt-1 font-mono text-lg font-bold">
                  {result.total_trades} ({result.wins}W / {result.losses}L)
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Equity Curve ({formatINR(result.initial_capital)} → {formatINR(result.final_capital)})
              </h2>
              {renderEquityCurve()}
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#141417]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-zinc-800 bg-[#09090B] text-[11px] text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Entry</th>
                    <th className="px-3 py-2">SL</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Exit</th>
                    <th className="px-3 py-2">Outcome</th>
                    <th className="px-3 py-2">R</th>
                    <th className="px-3 py-2">P&L (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {result.trades.map((t, i) => (
                    <tr key={`${t.ob_id}_${i}`}>
                      <td
                        className={`px-3 py-2 font-bold ${
                          t.direction === "LONG" ? "text-[#10B981]" : "text-red-400"
                        }`}
                      >
                        {t.direction}
                      </td>
                      <td className="px-3 py-2">{formatINR(t.entry_price)}</td>
                      <td className="px-3 py-2">{formatINR(t.stop_loss)}</td>
                      <td className="px-3 py-2">{formatINR(t.target_price)}</td>
                      <td className="px-3 py-2">{formatINR(t.exit_price)}</td>
                      <td className="px-3 py-2 uppercase text-zinc-400">{t.outcome}</td>
                      <td className="px-3 py-2">{t.r_multiple}R</td>
                      <td
                        className={`px-3 py-2 font-bold ${
                          t.pnl_inr >= 0 ? "text-[#10B981]" : "text-red-400"
                        }`}
                      >
                        {formatINR(t.pnl_inr)}
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
