"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ChartToolbar } from "@/components/chart/ChartToolbar";
import { DhanConnectModal } from "@/components/chart/DhanConnectModal";
import { SettingsDrawer } from "@/components/chart/SettingsDrawer";
import dynamic from "next/dynamic";
const TradingChartPane = dynamic(() => import("@/components/chart/TradingChartPane").then((m) => m.TradingChartPane), { ssr: false });
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";
import { useChartStore } from "@/stores/useChartStore";

export default function ChartTerminalPage() {
  const params = useParams<{ symbol?: string }>();
  const theme = useChartStore((s) => s.theme);
  const layout = useChartStore((s) => s.layout);
  const panes = useChartStore((s) => s.panes);
  const activePaneId = useChartStore((s) => s.activePaneId);
  const setActivePaneId = useChartStore((s) => s.setActivePaneId);
  const updatePane = useChartStore((s) => s.updatePane);

  // Sync URL symbol param into Pane 1
  useEffect(() => {
    if (params?.symbol) {
      const decoded = decodeURIComponent(params.symbol);
      updatePane("pane-1", { symbol: decoded });
    }
  }, [params?.symbol, updatePane]);

  // Sync Tailwind dark/light class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  const visiblePanes = panes.slice(0, layout);

  const gridClass =
    layout === 1
      ? "grid-cols-1"
      : layout === 2
      ? "grid-cols-1 lg:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 md:grid-rows-2";

  return (
    <div
      className={`flex h-screen flex-col overflow-hidden ${
        theme === "dark"
          ? "bg-[#09090B] text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <ChartToolbar />

      <main className={`grid flex-1 gap-1.5 overflow-hidden p-1.5 ${gridClass}`}>
        {visiblePanes.map((pane) => (
          <TradingChartPane
            key={pane.id}
            pane={pane}
            isActive={activePaneId === pane.id}
            onSelect={() => setActivePaneId(pane.id)}
          />
        ))}
      </main>

      <SebiDisclaimerBar />
      <SettingsDrawer />
      <DhanConnectModal />
    </div>
  );
}
