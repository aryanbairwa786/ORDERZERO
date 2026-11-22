"use client";

import type React from "react";

import Image from "next/image";
import {
  Columns2,
  Grid2x2,
  Layers,
  Minus,
  MousePointer2,
  PlugZap,
  Ruler,
  Settings,
  Square,
  Sun,
  Moon,
  Trash2,
  TrendingUp,
  BoxSelect,
} from "lucide-react";
import type { DrawingTool, LayerVisibility, LayoutMode } from "@/lib/types";
import { useChartStore } from "@/stores/useChartStore";

const LAYER_TOGGLES: { key: keyof LayerVisibility; label: string }[] = [
  { key: "orderBlocks", label: "OB" },
  { key: "breakerBlocks", label: "Breakers" },
  { key: "mtfOrderBlocks", label: "MTF OB" },
  { key: "structureBreaks", label: "BOS/CHoCH" },
  { key: "fvg", label: "FVG" },
  { key: "liquidity", label: "Liquidity" },
  { key: "premiumDiscount", label: "P/D" },
  { key: "vwap", label: "VWAP" },
  { key: "orb", label: "15m ORB" },
  { key: "cpr", label: "CPR" },
  { key: "sessionLevels", label: "PDH/PDL" },
];

const DRAWING_TOOLS: { id: DrawingTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "cursor", label: "Crosshair", icon: MousePointer2 },
  { id: "trendline", label: "Trendline", icon: TrendingUp },
  { id: "hline", label: "Horizontal Line", icon: Minus },
  { id: "fib", label: "Fib Retracement", icon: Ruler },
  { id: "rr_box", label: "2R Risk/Reward", icon: BoxSelect },
];

export function ChartToolbar() {
  const theme = useChartStore((s) => s.theme);
  const toggleTheme = useChartStore((s) => s.toggleTheme);
  const layout = useChartStore((s) => s.layout);
  const setLayout = useChartStore((s) => s.setLayout);
  const layers = useChartStore((s) => s.layers);
  const toggleLayer = useChartStore((s) => s.toggleLayer);
  const activeTool = useChartStore((s) => s.activeTool);
  const setActiveTool = useChartStore((s) => s.setActiveTool);
  const triggerClearDrawings = useChartStore((s) => s.triggerClearDrawings);
  const setSettingsOpen = useChartStore((s) => s.setSettingsOpen);
  const setDhanModalOpen = useChartStore((s) => s.setDhanModalOpen);
  const brokerMode = useChartStore((s) => s.brokerMode);

  const isDark = theme === "dark";

  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${
        isDark
          ? "border-zinc-800 bg-[#141417] text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      {/* Brand Mark */}
      <div className="flex items-center gap-2.5">
        <Image
          src="/brand/orderzero-logo.jpg"
          alt="OrderZero Logo"
          width={28}
          height={28}
          className="rounded-md border border-zinc-700/60"
        />
        <span className="text-sm font-bold tracking-tight">
          Order<span className="text-[#10B981]">Zero</span>
        </span>
        <span className="hidden rounded bg-[#8B5CF6]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#8B5CF6] sm:inline">
          SMC TERMINAL
        </span>
      </div>

      {/* SMC Layer Toggles */}
      <div className="flex flex-wrap items-center gap-1">
        <Layers className="mr-1 h-3.5 w-3.5 text-zinc-400" />
        {LAYER_TOGGLES.map(({ key, label }) => {
          const on = layers[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                on
                  ? "bg-[#10B981]/20 text-[#10B981] ring-1 ring-[#10B981]/50"
                  : isDark
                  ? "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  : "bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Drawing Tools + Multi-Chart Layout + Broker + Settings + Theme */}
      <div className="flex items-center gap-1.5">
        {/* Drawing Tools */}
        <div
          className={`flex items-center rounded-md border p-0.5 ${
            isDark ? "border-zinc-800 bg-[#09090B]" : "border-slate-200 bg-slate-50"
          }`}
        >
          {DRAWING_TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => setActiveTool(id)}
              className={`rounded p-1 transition ${
                activeTool === id
                  ? "bg-[#8B5CF6] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            title="Clear Drawings"
            onClick={triggerClearDrawings}
            className="rounded p-1 text-zinc-400 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 1 / 2 / 4 Multi-Chart Layout */}
        <div
          className={`flex items-center rounded-md border p-0.5 ${
            isDark ? "border-zinc-800 bg-[#09090B]" : "border-slate-200 bg-slate-50"
          }`}
        >
          {(
            [
              { mode: 1 as LayoutMode, icon: Square, title: "1 Chart" },
              { mode: 2 as LayoutMode, icon: Columns2, title: "2 Charts (NIFTY vs BANKNIFTY)" },
              { mode: 4 as LayoutMode, icon: Grid2x2, title: "4 Charts" },
            ] as const
          ).map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              type="button"
              title={title}
              onClick={() => setLayout(mode)}
              className={`rounded p-1 transition ${
                layout === mode
                  ? "bg-[#10B981] text-[#09090B]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* DhanHQ Broker Connection Button */}
        <button
          type="button"
          onClick={() => setDhanModalOpen(true)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            brokerMode === "dhan_hq"
              ? "bg-[#10B981] text-[#09090B]"
              : "bg-[#8B5CF6]/20 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/50 hover:bg-[#8B5CF6]/30"
          }`}
        >
          <PlugZap className="h-3.5 w-3.5" />
          <span>{brokerMode === "dhan_hq" ? "DhanHQ Live" : "Demo • Connect DhanHQ"}</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          title="SMC Engine Settings"
          onClick={() => setSettingsOpen(true)}
          className="rounded-md border border-zinc-800 p-1.5 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          title="Toggle Dark / Light Theme"
          onClick={toggleTheme}
          className="rounded-md border border-zinc-800 p-1.5 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
}
