import type {
  CandleDTO,
  ChartResponseDTO,
  OrderBlockDTO,
  SMCSettings,
  Timeframe,
} from "./types";

const ENGINE_URL =
  process.env.NEXT_PUBLIC_SMC_ENGINE_URL || "http://localhost:8000";

export const INDIAN_INSTRUMENTS: {
  symbol: string;
  exchange: "NSE" | "BSE";
  category: "Index" | "F&O Stock";
}[] = [
  { symbol: "NIFTY 50", exchange: "NSE", category: "Index" },
  { symbol: "BANK NIFTY", exchange: "NSE", category: "Index" },
  { symbol: "FIN NIFTY", exchange: "NSE", category: "Index" },
  { symbol: "MIDCAP NIFTY", exchange: "NSE", category: "Index" },
  { symbol: "SENSEX", exchange: "BSE", category: "Index" },
  { symbol: "BANKEX", exchange: "BSE", category: "Index" },
  { symbol: "RELIANCE", exchange: "NSE", category: "F&O Stock" },
  { symbol: "HDFCBANK", exchange: "NSE", category: "F&O Stock" },
  { symbol: "ICICIBANK", exchange: "NSE", category: "F&O Stock" },
  { symbol: "TCS", exchange: "NSE", category: "F&O Stock" },
  { symbol: "INFY", exchange: "NSE", category: "F&O Stock" },
  { symbol: "SBIN", exchange: "NSE", category: "F&O Stock" },
];

export interface DhanSessionCreds {
  clientId: string;
  accessToken: string;
}

export async function fetchChartAnalysis(params: {
  symbol: string;
  exchange: "NSE" | "BSE";
  timeframe: Timeframe;
  settings: SMCSettings;
  brokerMode: "demo" | "dhan_hq";
  dhanCreds?: DhanSessionCreds | null;
}): Promise<ChartResponseDTO> {
  const { symbol, exchange, timeframe, settings, brokerMode, dhanCreds } = params;

  try {
    if (brokerMode === "dhan_hq" && dhanCreds?.clientId && dhanCreds?.accessToken) {
      const resp = await fetch(`${ENGINE_URL}/api/v1/dhan/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: dhanCreds.clientId,
          access_token: dhanCreds.accessToken,
          symbol,
          exchange,
          timeframe,
          htf_timeframe: settings.htf_timeframe,
          days: 4,
          config: {
            internal_swing_length: settings.internal_swing_length,
            swing_length: settings.swing_length,
            displacement_atr_mult: settings.displacement_atr_mult,
            max_obs_shown: settings.max_obs_shown,
            ob_zone_mode: settings.ob_zone_mode,
            show_mitigated: settings.show_mitigated,
            auto_hide_filled_fvg: settings.auto_hide_filled_fvg,
          },
        }),
      });
      if (resp.ok) {
        return (await resp.json()) as ChartResponseDTO;
      }
    }

    const qs = new URLSearchParams({
      symbol,
      timeframe,
      htf_timeframe: settings.htf_timeframe,
      internal_swing_length: String(settings.internal_swing_length),
      swing_length: String(settings.swing_length),
      displacement_atr_mult: String(settings.displacement_atr_mult),
      max_obs_shown: String(settings.max_obs_shown),
      ob_zone_mode: settings.ob_zone_mode,
      show_mitigated: String(settings.show_mitigated),
      auto_hide_filled_fvg: String(settings.auto_hide_filled_fvg),
    });

    const resp = await fetch(`${ENGINE_URL}/api/v1/demo/nifty?${qs.toString()}`, {
      cache: "no-store",
    });
    if (resp.ok) {
      return (await resp.json()) as ChartResponseDTO;
    }
  } catch {
    // Graceful client-side demo fallback when FastAPI is not started yet
  }

  return generateLocalDemoFallback(symbol, exchange, timeframe, settings);
}

export function getTickWebSocketUrl(
  symbol: string,
  brokerMode: "demo" | "dhan_hq",
  dhanCreds?: DhanSessionCreds | null
): string {
  const wsBase = ENGINE_URL.replace(/^http/, "ws");
  const encoded = encodeURIComponent(symbol);
  if (brokerMode === "dhan_hq" && dhanCreds?.clientId && dhanCreds?.accessToken) {
    return `${wsBase}/ws/ticks/${encoded}?client_id=${encodeURIComponent(
      dhanCreds.clientId
    )}&access_token=${encodeURIComponent(dhanCreds.accessToken)}`;
  }
  return `${wsBase}/ws/ticks/${encoded}`;
}

/** Deterministic offline fallback so OrderZero's chart renders realistic NSE SMC zones immediately. */
function generateLocalDemoFallback(
  symbol: string,
  exchange: "NSE" | "BSE",
  timeframe: Timeframe,
  settings: SMCSettings
): ChartResponseDTO {
  const baseMap: Record<string, number> = {
    "NIFTY 50": 24350,
    "BANK NIFTY": 52100,
    "FIN NIFTY": 23820,
    "MIDCAP NIFTY": 12460,
    SENSEX: 79850,
    BANKEX: 59200,
    RELIANCE: 1295,
    HDFCBANK: 1745,
    ICICIBANK: 1285,
    TCS: 4120,
    INFY: 1865,
    SBIN: 825,
  };
  const base = baseMap[symbol] ?? 24350;
  const scale = base / 24350;
  const stepMin = timeframe === "1m" ? 1 : timeframe === "15m" ? 15 : timeframe === "1H" ? 60 : 5;

  const candles: CandleDTO[] = [];
  const vwap: number[] = [];
  let price = base;
  let cumPV = 0;
  let cumV = 0;
  const startMs = Date.UTC(2026, 10, 20, 3, 45, 0); // 09:15 IST

  for (let i = 0; i < 120; i++) {
    const ts = new Date(startMs + i * stepMin * 60_000).toISOString();
    const wave = Math.sin(i * 0.22) * 48 * scale + Math.cos(i * 0.09) * 62 * scale;
    const impulse = i === 38 ? 68 * scale : i === 76 ? -74 * scale : i === 98 ? 64 * scale : 0;
    const open = price;
    const close = base + wave + i * 0.9 * scale + impulse;
    const high = Math.max(open, close) + (12 + (i % 4) * 3) * scale;
    const low = Math.min(open, close) - (11 + ((i + 1) % 4) * 3) * scale;
    const volume = Math.round(1_20_000 + Math.abs(close - open) * 2_200);
    candles.push({
      timestamp: ts,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      oi: 1_50_00_000 + i * 10_000,
    });
    cumPV += ((high + low + close) / 3) * volume;
    cumV += volume;
    vwap.push(Number((cumPV / cumV).toFixed(2)));
    price = close;
  }

  const ob1Candle = candles[36];
  const ob2Candle = candles[74];
  const ob3Candle = candles[96];

  const orderBlocks: OrderBlockDTO[] = [
    {
      id: "demo_ob_bull_36",
      kind: "order_block",
      direction: "bullish",
      tier: "internal",
      candle_index: 36,
      timestamp: ob1Candle.timestamp,
      top: settings.ob_zone_mode === "body" ? Math.max(ob1Candle.open, ob1Candle.close) : ob1Candle.high,
      bottom: settings.ob_zone_mode === "body" ? Math.min(ob1Candle.open, ob1Candle.close) : ob1Candle.low,
      mean_threshold: Number(((ob1Candle.high + ob1Candle.low) / 2).toFixed(2)),
      state: "tested",
      strength_score: 82.5,
      relative_volume: 2.1,
      displacement_atr_ratio: 2.4,
      has_fvg_confluence: true,
      created_by_break: "BOS",
      tested_index: 54,
      tested_timestamp: candles[54].timestamp,
      broken_index: null,
      broken_timestamp: null,
      parent_ob_id: null,
    },
    {
      id: "demo_ob_bear_74",
      kind: "order_block",
      direction: "bearish",
      tier: "swing",
      candle_index: 74,
      timestamp: ob2Candle.timestamp,
      top: settings.ob_zone_mode === "body" ? Math.max(ob2Candle.open, ob2Candle.close) : ob2Candle.high,
      bottom: settings.ob_zone_mode === "body" ? Math.min(ob2Candle.open, ob2Candle.close) : ob2Candle.low,
      mean_threshold: Number(((ob2Candle.high + ob2Candle.low) / 2).toFixed(2)),
      state: "fresh",
      strength_score: 88.0,
      relative_volume: 2.4,
      displacement_atr_ratio: 2.8,
      has_fvg_confluence: true,
      created_by_break: "CHoCH",
      tested_index: null,
      tested_timestamp: null,
      broken_index: null,
      broken_timestamp: null,
      parent_ob_id: null,
    },
    {
      id: "demo_ob_bull_96",
      kind: "order_block",
      direction: "bullish",
      tier: "internal",
      candle_index: 96,
      timestamp: ob3Candle.timestamp,
      top: settings.ob_zone_mode === "body" ? Math.max(ob3Candle.open, ob3Candle.close) : ob3Candle.high,
      bottom: settings.ob_zone_mode === "body" ? Math.min(ob3Candle.open, ob3Candle.close) : ob3Candle.low,
      mean_threshold: Number(((ob3Candle.high + ob3Candle.low) / 2).toFixed(2)),
      state: "fresh",
      strength_score: 91.2,
      relative_volume: 2.6,
      displacement_atr_ratio: 3.1,
      has_fvg_confluence: true,
      created_by_break: "BOS",
      tested_index: null,
      tested_timestamp: null,
      broken_index: null,
      broken_timestamp: null,
      parent_ob_id: null,
    },
  ].filter((o) => settings.show_mitigated || o.state === "fresh");

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);
  const eq = Number(((rangeHigh + rangeLow) / 2).toFixed(2));
  const lastClose = candles[candles.length - 1].close;

  return {
    brand: "OrderZero",
    mode: "demo",
    candles,
    htf_order_blocks: [
      {
        ...orderBlocks[orderBlocks.length - 1],
        id: "demo_htf_ob_1h",
        tier: "swing",
        top: Number((rangeLow + (rangeHigh - rangeLow) * 0.24).toFixed(2)),
        bottom: Number((rangeLow + (rangeHigh - rangeLow) * 0.14).toFixed(2)),
        mean_threshold: Number((rangeLow + (rangeHigh - rangeLow) * 0.19).toFixed(2)),
        htf_timeframe: settings.htf_timeframe,
      },
    ],
    analysis: {
      symbol,
      exchange,
      timeframe,
      internal_trend: "bullish",
      swing_trend: "bullish",
      swings: [],
      structure_breaks: [
        {
          break_type: "BOS",
          direction: "bullish",
          tier: "internal",
          broken_swing_index: 26,
          break_index: 39,
          break_timestamp: candles[39].timestamp,
          level: candles[26].high,
          impulse_size: 85 * scale,
          impulse_atr_ratio: 2.4,
        },
        {
          break_type: "CHoCH",
          direction: "bearish",
          tier: "internal",
          broken_swing_index: 64,
          break_index: 77,
          break_timestamp: candles[77].timestamp,
          level: candles[64].low,
          impulse_size: 92 * scale,
          impulse_atr_ratio: 2.8,
        },
        {
          break_type: "BOS",
          direction: "bullish",
          tier: "swing",
          broken_swing_index: 88,
          break_index: 99,
          break_timestamp: candles[99].timestamp,
          level: candles[88].high,
          impulse_size: 95 * scale,
          impulse_atr_ratio: 3.1,
        },
      ],
      order_blocks: orderBlocks,
      breaker_blocks: [
        {
          id: "demo_bb_50",
          kind: "breaker_block",
          direction: "bullish",
          tier: "internal",
          candle_index: 50,
          timestamp: candles[50].timestamp,
          top: candles[50].high,
          bottom: candles[50].low,
          mean_threshold: Number(((candles[50].high + candles[50].low) / 2).toFixed(2)),
          state: "fresh",
          strength_score: 76.4,
          relative_volume: 1.8,
          displacement_atr_ratio: 2.0,
          has_fvg_confluence: false,
          created_by_break: "CHoCH",
          tested_index: null,
          tested_timestamp: null,
          broken_index: null,
          broken_timestamp: null,
          parent_ob_id: "demo_ob_bear_50",
        },
      ],
      mitigation_blocks: [],
      fair_value_gaps: [
        {
          id: "demo_fvg_98",
          direction: "bullish",
          start_index: 97,
          timestamp: candles[97].timestamp,
          top: candles[99].low,
          bottom: candles[97].high,
          midpoint: Number(((candles[99].low + candles[97].high) / 2).toFixed(2)),
          gap_size: Math.abs(candles[99].low - candles[97].high),
          fill_percent: 15,
          is_filled: false,
          filled_index: null,
        },
      ],
      liquidity_levels: [
        {
          id: "demo_eqh_1",
          label: "EQH",
          side: "buy_side",
          price: Number((rangeHigh - 6 * scale).toFixed(2)),
          start_index: 42,
          end_index: 88,
          touch_indices: [42, 88],
          swept: false,
          swept_index: null,
        },
        {
          id: "demo_eql_1",
          label: "EQL",
          side: "sell_side",
          price: Number((rangeLow + 8 * scale).toFixed(2)),
          start_index: 20,
          end_index: 79,
          touch_indices: [20, 79],
          swept: true,
          swept_index: 81,
        },
      ],
      liquidity_sweeps: [
        {
          index: 81,
          timestamp: candles[81].timestamp,
          side: "sell_side",
          swept_level: Number((rangeLow + 8 * scale).toFixed(2)),
          wick_extreme: candles[81].low,
          close_price: candles[81].close,
          source_label: "EQL",
        },
      ],
      premium_discount: {
        range_high: rangeHigh,
        range_low: rangeLow,
        equilibrium: eq,
        premium_start: Number((rangeLow + (rangeHigh - rangeLow) * 0.525).toFixed(2)),
        discount_end: Number((rangeLow + (rangeHigh - rangeLow) * 0.475).toFixed(2)),
        current_price: lastClose,
        current_zone: lastClose >= eq ? "premium" : "discount",
      },
      session_levels: {
        pdh: Number((base + 110 * scale).toFixed(2)),
        pdl: Number((base - 95 * scale).toFixed(2)),
        pwh: null,
        pwl: null,
        pmh: null,
        pml: null,
      },
      opening_range: {
        session_date: "2026-11-20",
        high: Math.max(candles[0].high, candles[1].high, candles[2].high),
        low: Math.min(candles[0].low, candles[1].low, candles[2].low),
        midpoint: Number(
          (
            (Math.max(candles[0].high, candles[1].high, candles[2].high) +
              Math.min(candles[0].low, candles[1].low, candles[2].low)) /
            2
          ).toFixed(2)
        ),
        start_timestamp: candles[0].timestamp,
        end_timestamp: candles[3].timestamp,
      },
      cpr: {
        session_date: "2026-11-20",
        pivot: Number((base + 12 * scale).toFixed(2)),
        bc: Number((base - 4 * scale).toFixed(2)),
        tc: Number((base + 28 * scale).toFixed(2)),
        r1: Number((base + 95 * scale).toFixed(2)),
        r2: Number((base + 170 * scale).toFixed(2)),
        s1: Number((base - 80 * scale).toFixed(2)),
        s2: Number((base - 155 * scale).toFixed(2)),
        is_narrow: true,
      },
      vwap,
      atr: candles.map(() => Number((22 * scale).toFixed(2))),
      disclaimer:
        "For educational and informational purposes only. Not investment advice. We are not SEBI-registered investment advisers / research analysts.",
    },
  };
}
