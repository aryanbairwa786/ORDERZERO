"""Typed data models and configuration for the Indian Stock Market SMC Engine."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional


class Direction(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class StructureTier(str, Enum):
    INTERNAL = "internal"
    SWING = "swing"


class StructureBreakType(str, Enum):
    BOS = "BOS"
    CHOCH = "CHoCH"


class SwingLabel(str, Enum):
    HH = "HH"
    HL = "HL"
    LH = "LH"
    LL = "LL"
    SH = "SH"  # Initial swing high
    SL = "SL"  # Initial swing low


class OrderBlockState(str, Enum):
    FRESH = "fresh"
    TESTED = "tested"
    BROKEN = "broken"


class OrderBlockKind(str, Enum):
    ORDER_BLOCK = "order_block"
    BREAKER_BLOCK = "breaker_block"
    MITIGATION_BLOCK = "mitigation_block"


@dataclass(slots=True)
class Tick:
    """Single live market tick from a broker WebSocket feed."""

    timestamp: datetime
    price: float
    volume: float = 0.0
    oi: int = 0


@dataclass(slots=True)
class Candle:
    """OHLCV candle with IST-aware timestamp."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    oi: int = 0

    @property
    def is_bullish(self) -> bool:
        return self.close > self.open

    @property
    def is_bearish(self) -> bool:
        return self.close < self.open

    @property
    def body_high(self) -> float:
        return max(self.open, self.close)

    @property
    def body_low(self) -> float:
        return min(self.open, self.close)

    @property
    def body_size(self) -> float:
        return abs(self.close - self.open)

    @property
    def total_range(self) -> float:
        return max(0.0, self.high - self.low)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "open": round(self.open, 2),
            "high": round(self.high, 2),
            "low": round(self.low, 2),
            "close": round(self.close, 2),
            "volume": round(self.volume, 2),
            "oi": self.oi,
        }


@dataclass(slots=True)
class SMCConfig:
    """User-configurable parameters for all SMC detection modules."""

    # Swing / Structure settings
    internal_swing_length: int = 5
    swing_length: int = 50

    # Volatility & Displacement settings
    atr_period: int = 14
    displacement_atr_mult: float = 1.5
    rvol_lookback: int = 20

    # Order Block settings
    ob_zone_mode: Literal["wick", "body"] = "wick"
    require_fvg_for_ob: bool = False
    max_obs_shown: int = 10
    show_mitigated: bool = True
    detect_breakers: bool = True
    detect_mitigation_blocks: bool = True
    ob_search_lookback: int = 15

    # FVG settings
    fvg_min_size_atr_mult: float = 0.1
    auto_hide_filled_fvg: bool = True

    # Liquidity settings
    eq_tolerance_atr_mult: float = 0.15
    min_equal_touches: int = 2

    # Indian market overlay toggles
    include_orb: bool = True
    orb_minutes: int = 15
    include_vwap: bool = True
    include_cpr: bool = True
    include_session_levels: bool = True


@dataclass(slots=True)
class SwingPoint:
    """Confirmed pivot swing high or swing low."""

    index: int
    timestamp: datetime
    price: float
    is_high: bool
    tier: StructureTier
    label: SwingLabel

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "timestamp": self.timestamp.isoformat(),
            "price": round(self.price, 2),
            "is_high": self.is_high,
            "tier": self.tier.value,
            "label": self.label.value,
        }


@dataclass(slots=True)
class StructureBreak:
    """Break of Structure (BOS) or Change of Character (CHoCH)."""

    break_type: StructureBreakType
    direction: Direction
    tier: StructureTier
    broken_swing_index: int
    break_index: int
    break_timestamp: datetime
    level: float
    impulse_size: float
    impulse_atr_ratio: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "break_type": self.break_type.value,
            "direction": self.direction.value,
            "tier": self.tier.value,
            "broken_swing_index": self.broken_swing_index,
            "break_index": self.break_index,
            "break_timestamp": self.break_timestamp.isoformat(),
            "level": round(self.level, 2),
            "impulse_size": round(self.impulse_size, 2),
            "impulse_atr_ratio": round(self.impulse_atr_ratio, 2),
        }


@dataclass(slots=True)
class OrderBlock:
    """Order Block, Breaker Block, or Mitigation Block zone."""

    id: str
    kind: OrderBlockKind
    direction: Direction
    tier: StructureTier
    candle_index: int
    timestamp: datetime
    top: float
    bottom: float
    mean_threshold: float
    state: OrderBlockState
    strength_score: float  # 0 to 100
    relative_volume: float
    displacement_atr_ratio: float
    has_fvg_confluence: bool
    created_by_break: StructureBreakType
    tested_index: Optional[int] = None
    tested_timestamp: Optional[datetime] = None
    broken_index: Optional[int] = None
    broken_timestamp: Optional[datetime] = None
    parent_ob_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind.value,
            "direction": self.direction.value,
            "tier": self.tier.value,
            "candle_index": self.candle_index,
            "timestamp": self.timestamp.isoformat(),
            "top": round(self.top, 2),
            "bottom": round(self.bottom, 2),
            "mean_threshold": round(self.mean_threshold, 2),
            "state": self.state.value,
            "strength_score": round(self.strength_score, 1),
            "relative_volume": round(self.relative_volume, 2),
            "displacement_atr_ratio": round(self.displacement_atr_ratio, 2),
            "has_fvg_confluence": self.has_fvg_confluence,
            "created_by_break": self.created_by_break.value,
            "tested_index": self.tested_index,
            "tested_timestamp": self.tested_timestamp.isoformat() if self.tested_timestamp else None,
            "broken_index": self.broken_index,
            "broken_timestamp": self.broken_timestamp.isoformat() if self.broken_timestamp else None,
            "parent_ob_id": self.parent_ob_id,
        }


@dataclass(slots=True)
class FairValueGap:
    """Three-candle Fair Value Gap (imbalance) with fill tracking."""

    id: str
    direction: Direction
    start_index: int
    timestamp: datetime
    top: float
    bottom: float
    midpoint: float
    gap_size: float
    fill_percent: float = 0.0
    is_filled: bool = False
    filled_index: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "direction": self.direction.value,
            "start_index": self.start_index,
            "timestamp": self.timestamp.isoformat(),
            "top": round(self.top, 2),
            "bottom": round(self.bottom, 2),
            "midpoint": round(self.midpoint, 2),
            "gap_size": round(self.gap_size, 2),
            "fill_percent": round(self.fill_percent, 1),
            "is_filled": self.is_filled,
            "filled_index": self.filled_index,
        }


@dataclass(slots=True)
class LiquidityLevel:
    """Equal Highs (EQH), Equal Lows (EQL), or Buy-Side / Sell-Side Liquidity pool."""

    id: str
    label: Literal["EQH", "EQL", "BSL", "SSL"]
    side: Literal["buy_side", "sell_side"]
    price: float
    start_index: int
    end_index: int
    touch_indices: List[int] = field(default_factory=list)
    swept: bool = False
    swept_index: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "side": self.side,
            "price": round(self.price, 2),
            "start_index": self.start_index,
            "end_index": self.end_index,
            "touch_indices": self.touch_indices,
            "swept": self.swept,
            "swept_index": self.swept_index,
        }


@dataclass(slots=True)
class LiquiditySweep:
    """Stop hunt / liquidity sweep where a wick pierces a pool and closes back inside."""

    index: int
    timestamp: datetime
    side: Literal["buy_side", "sell_side"]
    swept_level: float
    wick_extreme: float
    close_price: float
    source_label: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "timestamp": self.timestamp.isoformat(),
            "side": self.side,
            "swept_level": round(self.swept_level, 2),
            "wick_extreme": round(self.wick_extreme, 2),
            "close_price": round(self.close_price, 2),
            "source_label": self.source_label,
        }


@dataclass(slots=True)
class PremiumDiscountZone:
    """Premium / Equilibrium / Discount zones of the active dealing range."""

    range_high: float
    range_low: float
    equilibrium: float
    premium_start: float
    discount_end: float
    current_price: float
    current_zone: Literal["premium", "equilibrium", "discount"]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "range_high": round(self.range_high, 2),
            "range_low": round(self.range_low, 2),
            "equilibrium": round(self.equilibrium, 2),
            "premium_start": round(self.premium_start, 2),
            "discount_end": round(self.discount_end, 2),
            "current_price": round(self.current_price, 2),
            "current_zone": self.current_zone,
        }


@dataclass(slots=True)
class OpeningRange:
    """First N minutes Opening Range (default 09:15–09:30 IST)."""

    session_date: str
    high: float
    low: float
    midpoint: float
    start_timestamp: datetime
    end_timestamp: datetime

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_date": self.session_date,
            "high": round(self.high, 2),
            "low": round(self.low, 2),
            "midpoint": round(self.midpoint, 2),
            "start_timestamp": self.start_timestamp.isoformat(),
            "end_timestamp": self.end_timestamp.isoformat(),
        }


@dataclass(slots=True)
class CPRLevels:
    """Central Pivot Range (widely used by Indian NSE/BSE intraday traders)."""

    session_date: str
    pivot: float
    bc: float  # Bottom Central Pivot
    tc: float  # Top Central Pivot
    r1: float
    r2: float
    s1: float
    s2: float
    is_narrow: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_date": self.session_date,
            "pivot": round(self.pivot, 2),
            "bc": round(self.bc, 2),
            "tc": round(self.tc, 2),
            "r1": round(self.r1, 2),
            "r2": round(self.r2, 2),
            "s1": round(self.s1, 2),
            "s2": round(self.s2, 2),
            "is_narrow": self.is_narrow,
        }


@dataclass(slots=True)
class SessionLevels:
    """Previous Day / Week / Month High and Low reference levels."""

    pdh: Optional[float] = None
    pdl: Optional[float] = None
    pwh: Optional[float] = None
    pwl: Optional[float] = None
    pmh: Optional[float] = None
    pml: Optional[float] = None

    def to_dict(self) -> Dict[str, Optional[float]]:
        return {
            "pdh": round(self.pdh, 2) if self.pdh is not None else None,
            "pdl": round(self.pdl, 2) if self.pdl is not None else None,
            "pwh": round(self.pwh, 2) if self.pwh is not None else None,
            "pwl": round(self.pwl, 2) if self.pwl is not None else None,
            "pmh": round(self.pmh, 2) if self.pmh is not None else None,
            "pml": round(self.pml, 2) if self.pml is not None else None,
        }


@dataclass(slots=True)
class SMCAnalysisResult:
    """Complete SMC analysis output for a symbol and timeframe."""

    symbol: str
    exchange: str
    timeframe: str
    internal_trend: Direction
    swing_trend: Direction
    swings: List[SwingPoint]
    structure_breaks: List[StructureBreak]
    order_blocks: List[OrderBlock]
    breaker_blocks: List[OrderBlock]
    mitigation_blocks: List[OrderBlock]
    fair_value_gaps: List[FairValueGap]
    liquidity_levels: List[LiquidityLevel]
    liquidity_sweeps: List[LiquiditySweep]
    premium_discount: Optional[PremiumDiscountZone]
    session_levels: Optional[SessionLevels]
    opening_range: Optional[OpeningRange]
    cpr: Optional[CPRLevels]
    vwap: List[Optional[float]]
    atr: List[float]
    config: SMCConfig
    disclaimer: str = (
        "For educational and informational purposes only. Not investment advice. "
        "We are not SEBI-registered investment advisers / research analysts."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange,
            "timeframe": self.timeframe,
            "internal_trend": self.internal_trend.value,
            "swing_trend": self.swing_trend.value,
            "swings": [s.to_dict() for s in self.swings],
            "structure_breaks": [b.to_dict() for b in self.structure_breaks],
            "order_blocks": [ob.to_dict() for ob in self.order_blocks],
            "breaker_blocks": [bb.to_dict() for bb in self.breaker_blocks],
            "mitigation_blocks": [mb.to_dict() for mb in self.mitigation_blocks],
            "fair_value_gaps": [f.to_dict() for f in self.fair_value_gaps],
            "liquidity_levels": [l.to_dict() for l in self.liquidity_levels],
            "liquidity_sweeps": [sw.to_dict() for sw in self.liquidity_sweeps],
            "premium_discount": self.premium_discount.to_dict() if self.premium_discount else None,
            "session_levels": self.session_levels.to_dict() if self.session_levels else None,
            "opening_range": self.opening_range.to_dict() if self.opening_range else None,
            "cpr": self.cpr.to_dict() if self.cpr else None,
            "vwap": [round(v, 2) if v is not None else None for v in self.vwap],
            "atr": [round(a, 2) for a in self.atr],
            "config": asdict(self.config),
            "disclaimer": self.disclaimer,
        }
