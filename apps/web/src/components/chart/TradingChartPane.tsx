"use client";

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import {
  fetchChartAnalysis,
  getTickWebSocketUrl,
  INDIAN_INSTRUMENTS,
} from "@/lib/api-client";
import { formatINR, formatISTTime, isoToUnixSeconds } from "@/lib/format-inr";
import type {
  ChartPaneConfig,
  ChartResponseDTO,
  DrawingObject,
  DrawingPoint,
  Timeframe,
} from "@/lib/types";
import {
  SUPPORTED_TIMEFRAMES,
  useChartStore,
} from "@/stores/useChartStore";
import { SMCCanvasPrimitive } from "./SMCCanvasPrimitive";

interface TradingChartPaneProps {
  pane: ChartPaneConfig;
  isActive: boolean;
  onSelect: () => void;
}

export function TradingChartPane({
  pane,
  isActive,
  onSelect,
}: TradingChartPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const primitiveRef = useRef<SMCCanvasPrimitive | null>(null);
  const lastCandleRef = useRef<CandlestickData<Time> | null>(null);
  const prevCloseRef = useRef<number | null>(null);
  const pendingDrawStartRef = useRef<DrawingPoint | null>(null);

  const theme = useChartStore((s) => s.theme);
  const layers = useChartStore((s) => s.layers);
  const settings = useChartStore((s) => s.settings);
  const activeTool = useChartStore((s) => s.activeTool);
  const setActiveTool = useChartStore((s) => s.setActiveTool);
  const clearDrawingsNonce = useChartStore((s) => s.clearDrawingsNonce);
  const updatePane = useChartStore((s) => s.updatePane);
  const brokerMode = useChartStore((s) => s.brokerMode);
  const dhanCreds = useChartStore((s) => s.dhanCreds);

  const [data, setData] = useState<ChartResponseDTO | null>(null);
  const [ltp, setLtp] = useState<number | null>(null);
  const [changePct, setChangePct] = useState<number>(0);
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [marketStatus, setMarketStatus] = useState<string>("closed");

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  // Clear drawings when toolbar Clear button is clicked
  useEffect(() => {
    if (clearDrawingsNonce > 0) {
      setDrawings([]);
      pendingDrawStartRef.current = null;
    }
  }, [clearDrawingsNonce]);

  // 1. Initialize TradingView Lightweight Charts once per pane
  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = theme === "dark";
    const chart = createChart(containerRef.current, {
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? "#09090B" : "#FFFFFF",
        },
        textColor: isDark ? "#A1A1AA" : "#334155",
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: isDark ? "#18181B" : "#F1F5F9" },
        horzLines: { color: isDark ? "#18181B" : "#F1F5F9" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#8B5CF6", labelBackgroundColor: "#8B5CF6" },
        horzLine: { color: "#8B5CF6", labelBackgroundColor: "#8B5CF6" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#27272A" : "#E2E8F0",
      },
      timeScale: {
        borderColor: isDark ? "#27272A" : "#E2E8F0",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time) => formatISTTime(Number(time)),
      },
      localization: {
        priceFormatter: (price: number) => formatINR(price, 2, true),
        timeFormatter: (time: Time) => `${formatISTTime(Number(time))} IST`,
      },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10B981",
      downColor: "#EF4444",
      borderUpColor: "#10B981",
      borderDownColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });

    const vwapSeries = chart.addLineSeries({
      color: "#8B5CF6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const primitive = new SMCCanvasPrimitive({
      candles: [],
      analysis: null,
      htfOrderBlocks: [],
      layers,
      drawings: [],
      theme,
    });
    candleSeries.attachPrimitive(primitive);

    // Interactive drawing click handler
    const handleClick = (param: MouseEventParams<Time>) => {
      const tool = activeToolRef.current;
      if (tool === "cursor" || !param.point || !param.time) return;
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      const pt: DrawingPoint = { time: Number(param.time), price: Number(price) };

      if (tool === "hline") {
        setDrawings((prev) => [
          ...prev,
          { id: `d_${Date.now()}`, tool: "hline", p1: pt },
        ]);
        setActiveTool("cursor");
        return;
      }

      if (!pendingDrawStartRef.current) {
        pendingDrawStartRef.current = pt;
      } else {
        const start = pendingDrawStartRef.current;
        pendingDrawStartRef.current = null;
        setDrawings((prev) => [
          ...prev,
          { id: `d_${Date.now()}`, tool, p1: start, p2: pt },
        ]);
        setActiveTool("cursor");
      }
    };

    chart.subscribeClick(handleClick);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    vwapSeriesRef.current = vwapSeries;
    primitiveRef.current = primitive;

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      vwapSeriesRef.current = null;
      primitiveRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Apply Dark / Light Theme dynamically without destroying chart
  useEffect(() => {
    if (!chartRef.current) return;
    const isDark = theme === "dark";
    chartRef.current.applyOptions({
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? "#09090B" : "#FFFFFF",
        },
        textColor: isDark ? "#A1A1AA" : "#334155",
      },
      grid: {
        vertLines: { color: isDark ? "#18181B" : "#F1F5F9" },
        horzLines: { color: isDark ? "#18181B" : "#F1F5F9" },
      },
      rightPriceScale: { borderColor: isDark ? "#27272A" : "#E2E8F0" },
      timeScale: { borderColor: isDark ? "#27272A" : "#E2E8F0" },
    });
  }, [theme]);

  // 3. Fetch Candles + SMC Analysis whenever symbol, timeframe, settings, or broker mode changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchChartAnalysis({
      symbol: pane.symbol,
      exchange: pane.exchange,
      timeframe: pane.timeframe,
      settings,
      brokerMode,
      dhanCreds,
    }).then((res) => {
      if (cancelled) return;
      setData(res);
      if (res.nse_session_status) setMarketStatus(res.nse_session_status);
      setLoading(false);

      if (!candleSeriesRef.current || !volumeSeriesRef.current || !vwapSeriesRef.current) {
        return;
      }

      const candlePoints: CandlestickData<Time>[] = res.candles.map((c) => ({
        time: isoToUnixSeconds(c.timestamp) as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      const volPoints: HistogramData<Time>[] = res.candles.map((c) => ({
        time: isoToUnixSeconds(c.timestamp) as Time,
        value: c.volume,
        color:
          c.close >= c.open
            ? "rgba(16, 185, 129, 0.28)"
            : "rgba(239, 68, 68, 0.28)",
      }));
      const vwapPoints: LineData<Time>[] = res.candles
        .map((c, idx) => {
          const val = res.analysis.vwap[idx];
          if (val === null || val === undefined) return null;
          return { time: isoToUnixSeconds(c.timestamp) as Time, value: val };
        })
        .filter((x): x is LineData<Time> => x !== null);

      candleSeriesRef.current.setData(candlePoints);
      volumeSeriesRef.current.setData(volPoints);
      vwapSeriesRef.current.setData(layers.vwap ? vwapPoints : []);
      chartRef.current?.timeScale().fitContent();

      if (candlePoints.length > 0) {
        const last = candlePoints[candlePoints.length - 1];
        lastCandleRef.current = last;
        const exactLtp = res.quote_meta?.ltp ?? last.close;
        const exactPrev = res.quote_meta?.previous_close ?? candlePoints[0].open;
        prevCloseRef.current = exactPrev;
        setLtp(exactLtp);
        setChangePct(res.quote_meta?.change_pct ?? (((exactLtp - exactPrev) / exactPrev) * 100));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pane.symbol, pane.exchange, pane.timeframe, settings, brokerMode, dhanCreds, layers.vwap]);

  // 4. Synchronize SMC Canvas Primitive on data/layer/drawing/theme updates
  useEffect(() => {
    if (!primitiveRef.current) return;
    primitiveRef.current.updateData({
      candles: data?.candles ?? [],
      analysis: data?.analysis ?? null,
      htfOrderBlocks: data?.htf_order_blocks ?? [],
      layers,
      drawings,
      theme,
    });
    if (vwapSeriesRef.current && data) {
      if (layers.vwap) {
        const vwapPoints: LineData<Time>[] = data.candles
          .map((c, idx) => {
            const val = data.analysis.vwap[idx];
            if (val === null || val === undefined) return null;
            return { time: isoToUnixSeconds(c.timestamp) as Time, value: val };
          })
          .filter((x): x is LineData<Time> => x !== null);
        vwapSeriesRef.current.setData(vwapPoints);
      } else {
        vwapSeriesRef.current.setData([]);
      }
    }
  }, [data, layers, drawings, theme]);

  // 5. Incremental WebSocket Live Tick Streaming via series.update() + requestAnimationFrame
  useEffect(() => {
    let ws: WebSocket | null = null;
    let rafId: number | null = null;
    let queuedPrice: number | null = null;

    try {
      ws = new WebSocket(getTickWebSocketUrl(pane.symbol, brokerMode, dhanCreds));
      ws.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data) as { type?: string; nse_session_status?: string; price?: number };
          if (tick.type === "market_status") {
            if (tick.nse_session_status) setMarketStatus(tick.nse_session_status);
            return;
          }
          if (typeof tick.price !== "number") return;
          setMarketStatus("open");
          queuedPrice = tick.price;
          if (rafId === null) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (queuedPrice === null || !lastCandleRef.current || !candleSeriesRef.current) {
                return;
              }
              const updated: CandlestickData<Time> = {
                ...lastCandleRef.current,
                high: Math.max(lastCandleRef.current.high, queuedPrice),
                low: Math.min(lastCandleRef.current.low, queuedPrice),
                close: queuedPrice,
              };
              lastCandleRef.current = updated;
              candleSeriesRef.current.update(updated);
              setLtp(queuedPrice);
              if (prevCloseRef.current && prevCloseRef.current > 0) {
                setChangePct(((queuedPrice - prevCloseRef.current) / prevCloseRef.current) * 100);
              }
            });
          }
        } catch {
          // Ignore malformed tick frames
        }
      };
    } catch {
      // Offline / FastAPI not started; Demo candles remain active
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ws?.close();
    };
  }, [pane.symbol, brokerMode, dhanCreds]);

  const freshObCount =
    data?.analysis.order_blocks.filter((o) => o.state === "fresh").length ?? 0;
  const bias = data?.analysis.internal_trend ?? "neutral";

  return (
    <div
      onClick={onSelect}
      className={`flex h-full min-h-[340px] flex-col overflow-hidden rounded-lg border transition-colors ${
        isActive
          ? "border-[#10B981]/70"
          : "border-zinc-800 dark:border-zinc-800"
      } ${theme === "dark" ? "bg-[#09090B]" : "bg-white"}`}
    >
      {/* Pane Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 text-xs ${
          theme === "dark"
            ? "border-zinc-800 bg-[#141417]"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <select
            aria-label="Select Instrument"
            value={pane.symbol}
            onChange={(e) => {
              const found = INDIAN_INSTRUMENTS.find((i) => i.symbol === e.target.value);
              updatePane(pane.id, {
                symbol: e.target.value,
                exchange: found?.exchange ?? "NSE",
              });
            }}
            className={`rounded border px-2 py-0.5 font-semibold focus:outline-none ${
              theme === "dark"
                ? "border-zinc-700 bg-[#09090B] text-white"
                : "border-slate-300 bg-white text-slate-900"
            }`}
          >
            {INDIAN_INSTRUMENTS.map((inst) => (
              <option key={inst.symbol} value={inst.symbol}>
                {inst.symbol} ({inst.exchange})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5">
            {SUPPORTED_TIMEFRAMES.map((tf: Timeframe) => (
              <button
                key={tf}
                type="button"
                onClick={() => updatePane(pane.id, { timeframe: tf })}
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] transition ${
                  pane.timeframe === tf
                    ? "bg-[#10B981] font-semibold text-[#09090B]"
                    : theme === "dark"
                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono">
          {ltp !== null && (
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">{formatINR(ltp)}</span>
              <span
                className={
                  changePct >= 0 ? "text-[#10B981]" : "text-red-500"
                }
              >
                {changePct >= 0 ? "+" : ""}
                {changePct.toFixed(2)}%
              </span>
            </span>
          )}

          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              bias === "bullish"
                ? "bg-[#10B981]/15 text-[#10B981]"
                : bias === "bearish"
                ? "bg-red-500/15 text-red-400"
                : "bg-zinc-700/40 text-zinc-400"
            }`}
          >
            {bias}
          </span>

          <span className="rounded bg-[#8B5CF6]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#8B5CF6]">
            {freshObCount} Fresh OB
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${marketStatus === "open" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-zinc-800 text-zinc-400"}`}>
            {marketStatus === "open" ? "● NSE LIVE" : "NSE CLOSED • Prev Data"}
          </span>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative flex-1">
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#09090B]/50 text-xs font-mono text-zinc-400">
            Loading {pane.symbol} SMC zones...
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
