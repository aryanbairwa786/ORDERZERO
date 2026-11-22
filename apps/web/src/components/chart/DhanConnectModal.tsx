"use client";

import type React from "react";

import { useState } from "react";
import { Lock, PlugZap, X } from "lucide-react";
import { useChartStore } from "@/stores/useChartStore";

export function DhanConnectModal() {
  const open = useChartStore((s) => s.dhanModalOpen);
  const setOpen = useChartStore((s) => s.setDhanModalOpen);
  const brokerMode = useChartStore((s) => s.brokerMode);
  const dhanCreds = useChartStore((s) => s.dhanCreds);
  const connectDhan = useChartStore((s) => s.connectDhan);
  const disconnectDhan = useChartStore((s) => s.disconnectDhan);

  const [clientId, setClientId] = useState(dhanCreds?.clientId ?? "");
  const [accessToken, setAccessToken] = useState(dhanCreds?.accessToken ?? "");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !accessToken.trim()) return;
    connectDhan({ clientId: clientId.trim(), accessToken: accessToken.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#141417] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-[#10B981]" />
            <h2 className="text-sm font-bold">Connect Your DhanHQ Account</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-400">
          OrderZero connects directly to your own{" "}
          <strong className="text-zinc-200">DhanHQ v2</strong> data feed (REST +
          binary WebSocket). We never redistribute exchange data across accounts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block text-zinc-300">Dhan Client ID</label>
            <input
              type="text"
              required
              placeholder="e.g. 1100123456"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-[#09090B] px-3 py-2 font-mono text-white focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-zinc-300">DhanHQ v2 Access Token</label>
            <input
              type="password"
              required
              placeholder="Paste your DhanHQ JWT access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-[#09090B] px-3 py-2 font-mono text-white focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="flex items-start gap-2 rounded-md border border-zinc-800 bg-[#09090B] p-2.5 text-[11px] text-zinc-400">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8B5CF6]" />
            <span>
              In Step 3 session mode, credentials stay in browser memory only. In
              Step 4 auth/backend storage, tokens are encrypted at rest under the
              DPDP Act 2023.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {brokerMode === "dhan_hq" ? (
              <button
                type="button"
                onClick={() => {
                  disconnectDhan();
                  setOpen(false);
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Switch to Demo Mode
              </button>
            ) : (
              <span className="text-[11px] text-zinc-500">
                Currently in Broker-Free Demo Mode
              </span>
            )}
            <button
              type="submit"
              className="rounded-md bg-[#10B981] px-4 py-2 text-xs font-bold text-[#09090B] hover:bg-emerald-400"
            >
              Connect Live Feed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
