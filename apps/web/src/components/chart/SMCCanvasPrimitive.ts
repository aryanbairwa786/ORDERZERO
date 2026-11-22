/**
 * Native TradingView Lightweight Charts v4 Series Primitive for OrderZero SMC Overlays.
 * Renders hardware-friendly HTML5 Canvas rectangles, lines, labels, and user drawings
 * synchronized to chart pan/zoom at 60 FPS with zero external fancy-canvas import.
 */

import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import type {
  CandleDTO,
  DrawingObject,
  LayerVisibility,
  OrderBlockDTO,
  SMCAnalysisDTO,
} from "@/lib/types";
import { isoToUnixSeconds } from "@/lib/format-inr";

export interface SMCOverlayData {
  candles: CandleDTO[];
  analysis: SMCAnalysisDTO | null;
  htfOrderBlocks: OrderBlockDTO[];
  layers: LayerVisibility;
  drawings: DrawingObject[];
  theme: "dark" | "light";
}

type CanvasTarget = Parameters<ISeriesPrimitivePaneRenderer["draw"]>[0];

class SMCPaneRenderer implements ISeriesPrimitivePaneRenderer {
  private _chart: IChartApi;
  private _series: ISeriesApi<"Candlestick">;
  private _data: SMCOverlayData;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<"Candlestick">,
    data: SMCOverlayData
  ) {
    this._chart = chart;
    this._series = series;
    this._data = data;
  }

  draw(target: CanvasTarget): void {
    const { analysis, candles, htfOrderBlocks, layers, drawings, theme } = this._data;
    if (!candles.length) return;

    const timeScale = this._chart.timeScale();

    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const width = scope.bitmapSize.width;

      const xOf = (unixSec: number): number | null => {
        const coord = timeScale.timeToCoordinate(unixSec as Time);
        return coord === null ? null : coord * hRatio;
      };
      const yOf = (price: number): number | null => {
        const coord = this._series.priceToCoordinate(price);
        return coord === null ? null : coord * vRatio;
      };
      const indexToX = (idx: number): number | null => {
        const safeIdx = Math.max(0, Math.min(idx, candles.length - 1));
        return xOf(isoToUnixSeconds(candles[safeIdx].timestamp));
      };

      ctx.save();

      // 1. Premium / Equilibrium / Discount background shading
      if (layers.premiumDiscount && analysis?.premium_discount) {
        const pd = analysis.premium_discount;
        const yHigh = yOf(pd.range_high);
        const yEq = yOf(pd.equilibrium);
        const yLow = yOf(pd.range_low);
        if (yHigh !== null && yEq !== null && yLow !== null) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.06)";
          ctx.fillRect(0, yHigh, width, yEq - yHigh);

          ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
          ctx.fillRect(0, yEq, width, yLow - yEq);

          ctx.strokeStyle = "rgba(161, 161, 170, 0.45)";
          ctx.setLineDash([4 * hRatio, 4 * hRatio]);
          ctx.lineWidth = 1 * vRatio;
          ctx.beginPath();
          ctx.moveTo(0, yEq);
          ctx.lineTo(width, yEq);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = `${10 * vRatio}px Inter, sans-serif`;
          ctx.fillStyle = "rgba(239, 68, 68, 0.75)";
          ctx.fillText("PREMIUM", 10 * hRatio, yHigh + 13 * vRatio);
          ctx.fillStyle = "rgba(16, 185, 129, 0.75)";
          ctx.fillText("DISCOUNT", 10 * hRatio, yLow - 6 * vRatio);
        }
      }

      // 2. Opening Range (First 15m ORB)
      if (layers.orb && analysis?.opening_range) {
        const orb = analysis.opening_range;
        const x1 = xOf(isoToUnixSeconds(orb.start_timestamp)) ?? 0;
        const yTop = yOf(orb.high);
        const yBot = yOf(orb.low);
        if (yTop !== null && yBot !== null) {
          ctx.fillStyle = "rgba(139, 92, 246, 0.09)";
          ctx.fillRect(x1, yTop, width - x1, yBot - yTop);
          ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
          ctx.lineWidth = 1 * vRatio;
          ctx.setLineDash([3 * hRatio, 3 * hRatio]);
          ctx.strokeRect(x1, yTop, width - x1, yBot - yTop);
          ctx.setLineDash([]);
          ctx.font = `${9.5 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillStyle = "#8B5CF6";
          ctx.fillText("15m ORB", x1 + 6 * hRatio, yTop + 12 * vRatio);
        }
      }

      // 3. Higher-Timeframe (MTF) Order Blocks
      if (layers.mtfOrderBlocks && htfOrderBlocks.length) {
        for (const ob of htfOrderBlocks) {
          const yTop = yOf(ob.top);
          const yBot = yOf(ob.bottom);
          if (yTop === null || yBot === null) continue;
          const x1 = Math.max(0, xOf(isoToUnixSeconds(ob.timestamp)) ?? 0);
          const isBull = ob.direction === "bullish";
          ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.09)" : "rgba(239, 68, 68, 0.09)";
          ctx.fillRect(x1, yTop, width - x1, yBot - yTop);
          ctx.strokeStyle = isBull ? "rgba(16, 185, 129, 0.65)" : "rgba(239, 68, 68, 0.65)";
          ctx.lineWidth = 1.2 * vRatio;
          ctx.setLineDash([6 * hRatio, 4 * hRatio]);
          ctx.strokeRect(x1, yTop, width - x1, yBot - yTop);
          ctx.setLineDash([]);

          ctx.font = `600 ${10 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillStyle = isBull ? "#10B981" : "#EF4444";
          ctx.fillText(
            `[${ob.htf_timeframe || "HTF"} ${isBull ? "Bull" : "Bear"} OB]`,
            width - 140 * hRatio,
            yTop + 13 * vRatio
          );
        }
      }

      // 4. Fair Value Gaps (FVG boxes)
      if (layers.fvg && analysis?.fair_value_gaps.length) {
        for (const fvg of analysis.fair_value_gaps) {
          const x1 = indexToX(fvg.start_index);
          const yTop = yOf(fvg.top);
          const yBot = yOf(fvg.bottom);
          if (x1 === null || yTop === null || yBot === null) continue;
          const x2 =
            fvg.is_filled && fvg.filled_index !== null
              ? (indexToX(fvg.filled_index) ?? width)
              : width;

          const isBull = fvg.direction === "bullish";
          ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.14)";
          ctx.fillRect(x1, yTop, Math.max(8 * hRatio, x2 - x1), yBot - yTop);
          ctx.font = `${9 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.85)" : "rgba(239, 68, 68, 0.85)";
          ctx.fillText("FVG", x1 + 4 * hRatio, (yTop + yBot) / 2 + 3 * vRatio);
        }
      }

      // 5. Order Blocks, Breaker Blocks & Mitigation Blocks
      const drawZone = (ob: OrderBlockDTO) => {
        const x1 = indexToX(ob.candle_index);
        const yTop = yOf(ob.top);
        const yBot = yOf(ob.bottom);
        const yMid = yOf(ob.mean_threshold);
        if (x1 === null || yTop === null || yBot === null) return;

        let x2 = width;
        if (ob.state === "broken" && ob.broken_index !== null) {
          x2 = indexToX(ob.broken_index) ?? width;
        } else if (ob.state === "tested" && ob.tested_index !== null) {
          x2 = indexToX(ob.tested_index) ?? width;
        }

        let fill = "rgba(16, 185, 129, 0.22)";
        let stroke = "#10B981";
        let tag = "Bull OB";

        if (ob.kind === "breaker_block") {
          fill = "rgba(139, 92, 246, 0.24)";
          stroke = "#8B5CF6";
          tag = ob.direction === "bullish" ? "Bull Breaker" : "Bear Breaker";
        } else if (ob.state === "tested" || ob.state === "broken") {
          fill = "rgba(107, 114, 128, 0.20)";
          stroke = "#6B7280";
          tag = ob.state === "broken" ? "Broken OB" : "Mitigated OB";
        } else if (ob.direction === "bearish") {
          fill = "rgba(239, 68, 68, 0.22)";
          stroke = "#EF4444";
          tag = "Bear OB";
        }

        if (ob.kind === "mitigation_block") {
          tag = ob.direction === "bullish" ? "Bull MB" : "Bear MB";
        }

        const boxW = Math.max(18 * hRatio, x2 - x1);
        const boxH = Math.max(4 * vRatio, yBot - yTop);

        ctx.fillStyle = fill;
        ctx.fillRect(x1, yTop, boxW, boxH);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.25 * vRatio;
        ctx.strokeRect(x1, yTop, boxW, boxH);

        if (yMid !== null) {
          ctx.strokeStyle = stroke;
          ctx.globalAlpha = 0.65;
          ctx.setLineDash([3 * hRatio, 3 * hRatio]);
          ctx.beginPath();
          ctx.moveTo(x1, yMid);
          ctx.lineTo(x1 + boxW, yMid);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1.0;
        }

        ctx.font = `600 ${10 * vRatio}px JetBrains Mono, monospace`;
        ctx.fillStyle = stroke;
        ctx.fillText(
          `${tag} • ${Math.round(ob.strength_score)}`,
          x1 + 6 * hRatio,
          yTop + 12 * vRatio
        );
      };

      if (layers.orderBlocks && analysis?.order_blocks.length) {
        analysis.order_blocks.forEach(drawZone);
      }
      if (layers.breakerBlocks && analysis?.breaker_blocks.length) {
        analysis.breaker_blocks.forEach(drawZone);
      }
      if (layers.mitigationBlocks && analysis?.mitigation_blocks.length) {
        analysis.mitigation_blocks.forEach(drawZone);
      }

      // 6. BOS / CHoCH Structure Break lines & labels
      if (layers.structureBreaks && analysis?.structure_breaks.length) {
        for (const brk of analysis.structure_breaks) {
          const x1 = indexToX(brk.broken_swing_index);
          const x2 = indexToX(brk.break_index);
          const y = yOf(brk.level);
          if (x1 === null || x2 === null || y === null) continue;

          const color = brk.direction === "bullish" ? "#10B981" : "#EF4444";
          ctx.strokeStyle = color;
          ctx.lineWidth = (brk.tier === "swing" ? 1.5 : 1) * vRatio;
          if (brk.break_type === "CHoCH") {
            ctx.setLineDash([4 * hRatio, 3 * hRatio]);
          }
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = `700 ${9.5 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillStyle = color;
          const midX = (x1 + x2) / 2;
          ctx.fillText(
            `${brk.break_type}`,
            midX - 12 * hRatio,
            brk.direction === "bullish" ? y - 4 * vRatio : y + 11 * vRatio
          );
        }
      }

      // 7. Liquidity Levels (EQH / EQL / BSL / SSL) & Sweeps
      if (layers.liquidity && analysis) {
        for (const lvl of analysis.liquidity_levels) {
          const x1 = indexToX(lvl.start_index);
          const y = yOf(lvl.price);
          if (x1 === null || y === null) continue;
          const x2 =
            lvl.swept && lvl.swept_index !== null
              ? (indexToX(lvl.swept_index) ?? width)
              : width;

          const color = lvl.side === "buy_side" ? "#F59E0B" : "#38BDF8";
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.1 * vRatio;
          ctx.setLineDash([2 * hRatio, 3 * hRatio]);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = `600 ${9.5 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillStyle = color;
          ctx.fillText(
            `${lvl.label}${lvl.swept ? " ✓" : ""}`,
            x1 + 4 * hRatio,
            lvl.side === "buy_side" ? y - 4 * vRatio : y + 11 * vRatio
          );
        }

        for (const sw of analysis.liquidity_sweeps) {
          const x = indexToX(sw.index);
          const y = yOf(sw.wick_extreme);
          if (x === null || y === null) continue;
          ctx.fillStyle = "#8B5CF6";
          ctx.beginPath();
          ctx.arc(x, y, 4 * hRatio, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = `700 ${9 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillText(
            "SWEEP",
            x - 14 * hRatio,
            sw.side === "buy_side" ? y - 7 * vRatio : y + 14 * vRatio
          );
        }
      }

      // 8. CPR & PDH/PDL Indian Reference Levels
      const drawRefLine = (price: number | null, label: string, color: string) => {
        if (price === null) return;
        const y = yOf(price);
        if (y === null) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * vRatio;
        ctx.setLineDash([5 * hRatio, 5 * hRatio]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = `600 ${9 * vRatio}px JetBrains Mono, monospace`;
        ctx.fillStyle = color;
        ctx.fillText(label, width - 55 * hRatio, y - 3 * vRatio);
      };

      if (layers.sessionLevels && analysis?.session_levels) {
        drawRefLine(analysis.session_levels.pdh, "PDH", "#10B981");
        drawRefLine(analysis.session_levels.pdl, "PDL", "#EF4444");
      }
      if (layers.cpr && analysis?.cpr) {
        drawRefLine(analysis.cpr.tc, "TC", "#8B5CF6");
        drawRefLine(analysis.cpr.pivot, "PIVOT", "#A78BFA");
        drawRefLine(analysis.cpr.bc, "BC", "#8B5CF6");
      }

      // 9. User Interactive Drawings (Trendline, HLine, Fib, Risk/Reward Box)
      for (const d of drawings) {
        const x1 = xOf(d.p1.time);
        const y1 = yOf(d.p1.price);
        if (y1 === null) continue;

        if (d.tool === "hline") {
          ctx.strokeStyle = "#8B5CF6";
          ctx.lineWidth = 1.4 * vRatio;
          ctx.beginPath();
          ctx.moveTo(0, y1);
          ctx.lineTo(width, y1);
          ctx.stroke();
          continue;
        }

        if (x1 === null || !d.p2) continue;
        const x2 = xOf(d.p2.time);
        const y2 = yOf(d.p2.price);
        if (x2 === null || y2 === null) continue;

        if (d.tool === "trendline") {
          ctx.strokeStyle = theme === "dark" ? "#FFFFFF" : "#09090B";
          ctx.lineWidth = 1.6 * vRatio;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (d.tool === "fib") {
          const levels = [0, 0.382, 0.5, 0.618, 0.786, 1];
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          ctx.font = `${9.5 * vRatio}px JetBrains Mono, monospace`;
          for (const lv of levels) {
            const py = y1 + (y2 - y1) * lv;
            ctx.strokeStyle = lv === 0.5 ? "#10B981" : "rgba(139, 92, 246, 0.7)";
            ctx.lineWidth = 1 * vRatio;
            ctx.beginPath();
            ctx.moveTo(minX, py);
            ctx.lineTo(maxX, py);
            ctx.stroke();
            ctx.fillStyle = "#A1A1AA";
            ctx.fillText(`${(lv * 100).toFixed(1)}%`, minX + 4 * hRatio, py - 2 * vRatio);
          }
        } else if (d.tool === "rr_box") {
          const leftX = Math.min(x1, x2);
          const boxW = Math.max(24 * hRatio, Math.abs(x2 - x1));
          const slHeight = Math.abs(y2 - y1);
          ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
          ctx.fillRect(leftX, Math.min(y1, y2), boxW, slHeight);
          const targetY = y2 > y1 ? y1 - slHeight * 2 : y1 + slHeight * 2;
          ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
          ctx.fillRect(leftX, Math.min(y1, targetY), boxW, slHeight * 2);
          ctx.font = `600 ${9.5 * vRatio}px JetBrains Mono, monospace`;
          ctx.fillStyle = "#10B981";
          ctx.fillText("2R Target", leftX + 4 * hRatio, Math.min(y1, targetY) + 12 * vRatio);
        }
      }

      ctx.restore();
    });
  }
}

class SMCPaneView implements ISeriesPrimitivePaneView {
  private _primitive: SMCCanvasPrimitive;

  constructor(primitive: SMCCanvasPrimitive) {
    this._primitive = primitive;
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    const chart = this._primitive.chart();
    const series = this._primitive.series();
    if (!chart || !series) return null;
    return new SMCPaneRenderer(chart, series, this._primitive.data());
  }
}

export class SMCCanvasPrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApi | null = null;
  private _series: ISeriesApi<"Candlestick"> | null = null;
  private _requestUpdate?: () => void;
  private _paneView: SMCPaneView;
  private _data: SMCOverlayData;

  constructor(initialData: SMCOverlayData) {
    this._data = initialData;
    this._paneView = new SMCPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart;
    this._series = param.series as ISeriesApi<"Candlestick">;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = undefined;
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }

  chart(): IChartApi | null {
    return this._chart;
  }

  series(): ISeriesApi<"Candlestick"> | null {
    return this._series;
  }

  data(): SMCOverlayData {
    return this._data;
  }

  updateData(next: SMCOverlayData): void {
    this._data = next;
    this._requestUpdate?.();
  }
}
