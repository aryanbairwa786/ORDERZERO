"use client";

import { create } from "zustand";
import type {
  ChartPaneConfig,
  DrawingTool,
  LayerVisibility,
  LayoutMode,
  SMCSettings,
  Timeframe,
} from "@/lib/types";
import type { DhanSessionCreds } from "@/lib/api-client";

interface ChartStoreState {
  theme: "dark" | "light";
  layout: LayoutMode;
  activePaneId: string;
  panes: ChartPaneConfig[];
  layers: LayerVisibility;
  settings: SMCSettings;
  activeTool: DrawingTool;
  clearDrawingsNonce: number;
  settingsOpen: boolean;
  dhanModalOpen: boolean;
  brokerMode: "demo" | "dhan_hq";
  dhanCreds: DhanSessionCreds | null;

  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  setLayout: (layout: LayoutMode) => void;
  setActivePaneId: (id: string) => void;
  updatePane: (id: string, patch: Partial<ChartPaneConfig>) => void;
  toggleLayer: (key: keyof LayerVisibility) => void;
  updateSettings: (patch: Partial<SMCSettings>) => void;
  setActiveTool: (tool: DrawingTool) => void;
  triggerClearDrawings: () => void;
  setSettingsOpen: (open: boolean) => void;
  setDhanModalOpen: (open: boolean) => void;
  connectDhan: (creds: DhanSessionCreds) => void;
  disconnectDhan: () => void;
}

const DEFAULT_PANES: ChartPaneConfig[] = [
  { id: "pane-1", symbol: "NIFTY 50", exchange: "NSE", timeframe: "5m" },
  { id: "pane-2", symbol: "BANK NIFTY", exchange: "NSE", timeframe: "5m" },
  { id: "pane-3", symbol: "FIN NIFTY", exchange: "NSE", timeframe: "15m" },
  { id: "pane-4", symbol: "SENSEX", exchange: "BSE", timeframe: "5m" },
];

export const useChartStore = create<ChartStoreState>((set) => ({
  theme: "dark",
  layout: 1,
  activePaneId: "pane-1",
  panes: DEFAULT_PANES,
  layers: {
    orderBlocks: true,
    breakerBlocks: true,
    mitigationBlocks: true,
    mtfOrderBlocks: true,
    structureBreaks: true,
    fvg: true,
    liquidity: true,
    premiumDiscount: false,
    vwap: true,
    orb: true,
    cpr: false,
    sessionLevels: true,
  },
  settings: {
    internal_swing_length: 5,
    swing_length: 25,
    displacement_atr_mult: 1.4,
    max_obs_shown: 10,
    ob_zone_mode: "wick",
    show_mitigated: true,
    auto_hide_filled_fvg: true,
    htf_timeframe: "1H",
  },
  activeTool: "cursor",
  clearDrawingsNonce: 0,
  settingsOpen: false,
  dhanModalOpen: false,
  brokerMode: "demo",
  dhanCreds: null,

  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setLayout: (layout) => set({ layout }),
  setActivePaneId: (activePaneId) => set({ activePaneId }),
  updatePane: (id, patch) =>
    set((s) => ({
      panes: s.panes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  toggleLayer: (key) =>
    set((s) => ({
      layers: { ...s.layers, [key]: !s.layers[key] },
    })),
  updateSettings: (patch) =>
    set((s) => ({
      settings: { ...s.settings, ...patch },
    })),
  setActiveTool: (activeTool) => set({ activeTool }),
  triggerClearDrawings: () =>
    set((s) => ({ clearDrawingsNonce: s.clearDrawingsNonce + 1 })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setDhanModalOpen: (dhanModalOpen) => set({ dhanModalOpen }),
  connectDhan: (creds) =>
    set({
      dhanCreds: creds,
      brokerMode: "dhan_hq",
      dhanModalOpen: false,
    }),
  disconnectDhan: () =>
    set({
      dhanCreds: null,
      brokerMode: "demo",
    }),
}));

export const SUPPORTED_TIMEFRAMES: Timeframe[] = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1H",
  "75m",
  "1D",
  "1W",
];
