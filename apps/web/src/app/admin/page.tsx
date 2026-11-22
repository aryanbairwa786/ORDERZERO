"use client";

import type React from "react";

import { useState } from "react";
import { Megaphone, Tag } from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";

export default function AdminPanelPage() {
  const [coupons, setCoupons] = useState([
    { code: "NIFTY20", discount: "20%", uses: 42, active: true },
    { code: "LAUNCH50", discount: "50%", uses: 15, active: true },
  ]);
  const [newCode, setNewCode] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  const addCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setCoupons((prev) => [
      { code: newCode.trim().toUpperCase(), discount: "15%", uses: 0, active: true },
      ...prev,
    ]);
    setNewCode("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4">
        <div>
          <h1 className="text-xl font-bold">OrderZero Admin Console</h1>
          <p className="text-xs text-zinc-400">
            Users, Subscriptions, Coupons, Platform Usage & Broadcast Announcements
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total Users", value: "1,284" },
            { label: "Active Pro / Premium", value: "342" },
            { label: "MRR (Excl. GST)", value: "₹4,12,800" },
            { label: "Alerts Fired (24h)", value: "18,490" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-zinc-800 bg-[#141417] p-4"
            >
              <div className="text-xs text-zinc-400">{m.label}</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#10B981]">
                {m.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Coupons */}
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4 text-xs">
            <h2 className="mb-3 flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-400">
              <Tag className="h-3.5 w-3.5 text-[#8B5CF6]" /> Promo Coupons
            </h2>
            <form onSubmit={addCoupon} className="mb-3 flex gap-2">
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="New code (e.g. DIWALI25)"
                className="flex-1 rounded border border-zinc-700 bg-[#09090B] px-2.5 py-1.5 font-mono uppercase"
              />
              <button
                type="submit"
                className="rounded bg-[#10B981] px-3 py-1.5 font-bold text-[#09090B]"
              >
                Add
              </button>
            </form>
            <div className="space-y-2">
              {coupons.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded border border-zinc-800 bg-[#09090B] px-3 py-2 font-mono"
                >
                  <span className="font-bold text-[#10B981]">{c.code}</span>
                  <span>{c.discount} OFF</span>
                  <span className="text-zinc-400">{c.uses} uses</span>
                </div>
              ))}
            </div>
          </div>

          {/* Broadcast */}
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4 text-xs">
            <h2 className="mb-3 flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-400">
              <Megaphone className="h-3.5 w-3.5 text-[#10B981]" /> Broadcast Message
            </h2>
            <textarea
              rows={4}
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
              placeholder="Send a maintenance notice or NSE holiday reminder to all active users..."
              className="w-full rounded border border-zinc-700 bg-[#09090B] p-2.5 text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!broadcast.trim()) return;
                setSentNotice(`Broadcast queued at ${new Date().toLocaleTimeString("en-IN")} IST`);
                setBroadcast("");
              }}
              className="mt-2 rounded bg-[#8B5CF6] px-4 py-2 font-bold text-white"
            >
              Send Broadcast
            </button>
            {sentNotice && <div className="mt-2 text-[#10B981]">{sentNotice}</div>}
          </div>
        </div>
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
