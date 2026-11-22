export type Direction = "bullish" | "bearish" | "neutral";
export type StructureTier = "internal" | "swing";
export type OrderBlockState = "fresh" | "tested" | "broken";
export type OrderBlockKind = "order_block" | "breaker_block" | "mitigation_block";

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1H" | "75m" | "1D" | "1W";
export type LayoutMode = 1 | 2 | 4;
export type DrawingTool = "cursor" | "trendline" | "hline" | "fib" | "rr_box";

export interface CandleDTO {
  timestamp: string; // ISO-8601 IST
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
}

export interface SwingPointDTO {
  index: number;
  timestamp: string;
  price: number;
  is_high: boolean;
  tier: StructureTier;
  label: "HH" | "HL" | "LH" | "LL" | "SH" | "SL";
}

export interface StructureBreakDTO {
  break_type: "BOS" | "CHoCH";
  direction: Direction;
  tier: StructureTier;
  broken_swing_index: number;
  break_index: number;
  break_timestamp: string;
  level: number;
  impulse_size: number;
  impulse_atr_ratio: number;
}

export interface OrderBlockDTO {
  id: string;
  kind: OrderBlockKind;
  direction: Direction;
  tier: StructureTier;
  candle_index: number;
  timestamp: string;
  top: number;
  bottom: number;
  mean_threshold: number;
  state: OrderBlockState;
  strength_score: number;
  relative_volume: number;
  displacement_atr_ratio: number;
  has_fvg_confluence: boolean;
  created_by_break: "BOS" | "CHoCH";
  tested_index: number | null;
  tested_timestamp: string | null;
  broken_index: number | null;
  broken_timestamp: string | null;
  parent_ob_id: string | null;
  htf_timeframe?: string;
}

export interface FairValueGapDTO {
  id: string;
  direction: Direction;
  start_index: number;
  timestamp: string;
  top: number;
  bottom: number;
  midpoint: number;
  gap_size: number;
  fill_percent: number;
  is_filled: boolean;
  filled_index: number | null;
}

export interface LiquidityLevelDTO {
  id: string;
  label: "EQH" | "EQL" | "BSL" | "SSL";
  side: "buy_side" | "sell_side";
  price: number;
  start_index: number;
  end_index: number;
  touch_indices: number[];
  swept: boolean;
  swept_index: number | null;
}

export interface LiquiditySweepDTO {
  index: number;
  timestamp: string;
  side: "buy_side" | "sell_side";
  swept_level: number;
  wick_extreme: number;
  close_price: number;
  source_label: string;
}

export interface PremiumDiscountDTO {
  range_high: number;
  range_low: number;
  equilibrium: number;
  premium_start: number;
  discount_end: number;
  current_price: number;
  current_zone: "premium" | "equilibrium" | "discount";
}

export interface SessionLevelsDTO {
  pdh: number | null;
  pdl: number | null;
  pwh: number | null;
  pwl: number | null;
  pmh: number | null;
  pml: number | null;
}

export interface OpeningRangeDTO {
  session_date: string;
  high: number;
  low: number;
  midpoint: number;
  start_timestamp: string;
  end_timestamp: string;
}

export interface CPRLevelsDTO {
  session_date: string;
  pivot: number;
  bc: number;
  tc: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  is_narrow: boolean;
}

export interface SMCAnalysisDTO {
  symbol: string;
  exchange: string;
  timeframe: string;
  internal_trend: Direction;
  swing_trend: Direction;
  swings: SwingPointDTO[];
  structure_breaks: StructureBreakDTO[];
  order_blocks: OrderBlockDTO[];
  breaker_blocks: OrderBlockDTO[];
  mitigation_blocks: OrderBlockDTO[];
  fair_value_gaps: FairValueGapDTO[];
  liquidity_levels: LiquidityLevelDTO[];
  liquidity_sweeps: LiquiditySweepDTO[];
  premium_discount: PremiumDiscountDTO | null;
  session_levels: SessionLevelsDTO | null;
  opening_range: OpeningRangeDTO | null;
  cpr: CPRLevelsDTO | null;
  vwap: (number | null)[];
  atr: number[];
  disclaimer: string;
}

export interface ChartResponseDTO {
  brand: string;
  mode: "demo" | "dhan_hq";
  nse_session_status?: "pre_open" | "open" | "closed" | "holiday";
  quote_meta?: { ltp: number; previous_close: number; change_pct: number };
  candles: CandleDTO[];
  analysis: SMCAnalysisDTO;
  htf_order_blocks?: OrderBlockDTO[];
}

export interface LayerVisibility {
  orderBlocks: boolean;
  breakerBlocks: boolean;
  mitigationBlocks: boolean;
  mtfOrderBlocks: boolean;
  structureBreaks: boolean;
  fvg: boolean;
  liquidity: boolean;
  premiumDiscount: boolean;
  vwap: boolean;
  orb: boolean;
  cpr: boolean;
  sessionLevels: boolean;
}

export interface SMCSettings {
  internal_swing_length: number;
  swing_length: number;
  displacement_atr_mult: number;
  max_obs_shown: number;
  ob_zone_mode: "wick" | "body";
  show_mitigated: boolean;
  auto_hide_filled_fvg: boolean;
  htf_timeframe: Timeframe;
}

export interface DrawingPoint {
  time: number; // Unix seconds
  price: number;
}

export interface DrawingObject {
  id: string;
  tool: Exclude<DrawingTool, "cursor">;
  p1: DrawingPoint;
  p2?: DrawingPoint;
}

export interface ChartPaneConfig {
  id: string;
  symbol: string;
  exchange: "NSE" | "BSE";
  timeframe: Timeframe;
}
