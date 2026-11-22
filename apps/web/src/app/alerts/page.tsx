"use client";

import type React from "react";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellPlus, Play, Trash2 } from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { INDIAN_INSTRUMENTS } from "@/lib/api-client";

const ENGINE_URL =
  process.env.NEXT_PUBLIC_SMC_ENGINE_URL || "https://orderzero-lzpv.onrender.com";

interface AlertRule {
  id: string;
  symbol: string;
  timeframe: string;
  alert_type: string;
  channels: string[];
  active: boolean;
  created_at_ist: string;
}

interface AlertEvent {
  id: string;
  symbol: string;
  timeframe: string;
  alert_type: string;
  message: string;
  price: number;
  triggered_at_ist: string;
  channels_dispatched: string[];
  chart_url: string;
}

const ALERT_TYPES = [
  { id: "ob_enter", label: "Price Enters OB" },
  { id: "ob_mitigated", label: "OB Mitigated" },
  { id: "bos_choch", label: "BOS / CHoCH Break" },
  { id: "fvg_fill", label: "FVG Fill" },
  { id: "liquidity_sweep", label: "Liquidity Sweep" },
];

const CHANNELS = ["in_app", "push", "email", "telegram", "whatsapp"];

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [symbol, setSymbol] = useState("NIFTY 50");
  const [timeframe, setTimeframe] = useState("5m");
  const [alertType, setAlertType] = useState("ob_enter");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["in_app", "telegram"]);

  const loadAlerts = async () => {
    try {
      const resp = await fetch(`${ENGINE_URL}/api/v1/alerts`);
      if (resp.ok) {
        const json = await resp.json();
        setRules(json.rules || []);
        setHistory(json.history || []);
      }
    } catch {
      // Offline fallback state
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${ENGINE_URL}/api/v1/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          timeframe,
          alert_type: alertType,
          channels: selectedChannels.length ? selectedChannels : ["in_app"],
        }),
      });
      if (resp.ok) {
        await loadAlerts();
      }
    } catch {
      setRules((prev) => [
        {
          id: `local_${Date.now()}`,
          symbol,
          timeframe,
          alert_type: alertType,
          channels: selectedChannels,
          active: true,
          created_at_ist: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const handleTest = async (id: string) => {
    try {
      const resp = await fetch(`${ENGINE_URL}/api/v1/alerts/${id}/test`, { method: "POST" });
      if (resp.ok) await loadAlerts();
    } catch {
      // Ignore if backend offline
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${ENGINE_URL}/api/v1/alerts/${id}`, { method: "DELETE" });
      await loadAlerts();
    } catch {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4">
        <div>
          <h1 className="text-xl font-bold">SMC Alerts & IST History Log</h1>
          <p className="text-xs text-zinc-400">
            Trigger notifications via In-App, Browser Push, Email, Telegram Bot, or WhatsApp Business API
          </p>
        </div>

        {/* Create Alert Form */}
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-xl border border-zinc-800 bg-[#141417] p-4 text-xs md:grid-cols-4"
        >
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2"
          >
            {INDIAN_INSTRUMENTS.map((i) => (
              <option key={i.symbol} value={i.symbol}>
                {i.symbol}
              </option>
            ))}
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2"
          >
            {["1m", "5m", "15m", "30m", "1H", "75m", "1D"].map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>

          <select
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
            className="rounded border border-zinc-700 bg-[#09090B] px-2.5 py-2"
          >
            {ALERT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded bg-[#10B981] px-4 py-2 font-bold text-[#09090B] hover:bg-emerald-400"
          >
            <BellPlus className="h-4 w-4" /> Create Alert
          </button>

          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            <span className="text-zinc-400">Channels:</span>
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`rounded px-2.5 py-1 text-[11px] uppercase ${
                  selectedChannels.includes(ch)
                    ? "bg-[#8B5CF6] font-semibold text-white"
                    : "border border-zinc-700 bg-[#09090B] text-zinc-400"
                }`}
              >
                {ch.replace("_", " ")}
              </button>
            ))}
          </div>
        </form>

        {/* Active Rules */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Active Alert Rules ({rules.length})
            </h2>
            <div className="space-y-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#09090B] p-3 text-xs"
                >
                  <div>
                    <div className="font-bold">
                      {r.symbol} <span className="font-mono text-[#10B981]">({r.timeframe})</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      {r.alert_type} • {r.channels.join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTest(r.id)}
                      title="Fire Test Alert"
                      className="rounded border border-zinc-700 p-1.5 text-[#10B981] hover:border-[#10B981]"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      title="Delete Rule"
                      className="rounded border border-zinc-700 p-1.5 text-red-400 hover:border-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert History Log */}
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Alert History Log (IST)
            </h2>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border border-zinc-800 bg-[#09090B] p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{h.message}</span>
                    <Link
                      href={h.chart_url}
                      className="shrink-0 text-[11px] font-semibold text-[#8B5CF6] hover:underline"
                    >
                      Open Chart →
                    </Link>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-zinc-500">
                    {new Date(h.triggered_at_ist).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST • Sent: {h.channels_dispatched.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
