"use client";

import { X } from "lucide-react";
import type { Timeframe } from "@/lib/types";
import { useChartStore } from "@/stores/useChartStore";

const HTF_OPTIONS: Timeframe[] = ["15m", "30m", "1H", "75m", "1D", "1W"];

export function SettingsDrawer() {
  const open = useChartStore((s) => s.settingsOpen);
  const setOpen = useChartStore((s) => s.setSettingsOpen);
  const settings = useChartStore((s) => s.settings);
  const updateSettings = useChartStore((s) => s.updateSettings);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-sm flex-col border-l border-zinc-800 bg-[#141417] p-5 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-bold">SMC Engine Settings</h2>
            <p className="text-xs text-zinc-400">
              Adjust Order Block, Structure & MTF overlay parameters live
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto text-xs">
          <div>
            <label className="mb-1 flex justify-between text-zinc-300">
              <span>Internal Swing Length</span>
              <span className="font-mono text-[#10B981]">{settings.internal_swing_length}</span>
            </label>
            <input
              type="range"
              min={2}
              max={20}
              value={settings.internal_swing_length}
              onChange={(e) =>
                updateSettings({ internal_swing_length: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div>
            <label className="mb-1 flex justify-between text-zinc-300">
              <span>Swing Structure Length</span>
              <span className="font-mono text-[#10B981]">{settings.swing_length}</span>
            </label>
            <input
              type="range"
              min={10}
              max={80}
              value={settings.swing_length}
              onChange={(e) =>
                updateSettings({ swing_length: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div>
            <label className="mb-1 flex justify-between text-zinc-300">
              <span>Displacement ATR Multiplier</span>
              <span className="font-mono text-[#10B981]">
                {settings.displacement_atr_mult.toFixed(1)}x
              </span>
            </label>
            <input
              type="range"
              min={0.5}
              max={3.5}
              step={0.1}
              value={settings.displacement_atr_mult}
              onChange={(e) =>
                updateSettings({ displacement_atr_mult: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div>
            <label className="mb-1 flex justify-between text-zinc-300">
              <span>Max Order Blocks Shown</span>
              <span className="font-mono text-[#10B981]">{settings.max_obs_shown}</span>
            </label>
            <input
              type="range"
              min={2}
              max={30}
              value={settings.max_obs_shown}
              onChange={(e) =>
                updateSettings({ max_obs_shown: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300">OB Zone Mode</span>
            <div className="flex rounded-md border border-zinc-800 bg-[#09090B] p-0.5">
              {(["wick", "body"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateSettings({ ob_zone_mode: mode })}
                  className={`rounded px-2.5 py-1 capitalize ${
                    settings.ob_zone_mode === mode
                      ? "bg-[#10B981] font-semibold text-[#09090B]"
                      : "text-zinc-400"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300">MTF Higher Timeframe</span>
            <select
              value={settings.htf_timeframe}
              onChange={(e) =>
                updateSettings({ htf_timeframe: e.target.value as Timeframe })
              }
              className="rounded border border-zinc-700 bg-[#09090B] px-2 py-1 font-mono text-white"
            >
              {HTF_OPTIONS.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2">
            <span>Show Mitigated / Tested OBs</span>
            <input
              type="checkbox"
              checked={settings.show_mitigated}
              onChange={(e) => updateSettings({ show_mitigated: e.target.checked })}
              className="accent-[#10B981]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2">
            <span>Auto-Hide Filled FVGs</span>
            <input
              type="checkbox"
              checked={settings.auto_hide_filled_fvg}
              onChange={(e) =>
                updateSettings({ auto_hide_filled_fvg: e.target.checked })
              }
              className="accent-[#10B981]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 w-full rounded-md bg-[#10B981] py-2 text-xs font-bold text-[#09090B] hover:bg-emerald-400"
        >
          Apply & Close
        </button>
      </div>
    </div>
  );
}
