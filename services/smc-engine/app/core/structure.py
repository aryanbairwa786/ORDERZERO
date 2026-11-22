"""Market Structure detection: Swing Highs/Lows (HH, HL, LH, LL), BOS, CHoCH, and Trend Bias."""

from __future__ import annotations

from typing import List, Optional, Tuple

from .models import (
    Candle,
    Direction,
    StructureBreak,
    StructureBreakType,
    StructureTier,
    SwingLabel,
    SwingPoint,
)


def detect_swing_points(
    candles: List[Candle],
    length: int,
    tier: StructureTier,
) -> List[SwingPoint]:
    """Detect confirmed pivot swing highs and lows using a symmetric lookback/lookahead window.

    A candle at index `i` is a swing high if its high is strictly greater than the highs
    of the `length` bars before it and greater than or equal to the `length` bars after it.
    Labels are assigned sequentially as HH, HL, LH, LL relative to the previous swing of
    the same polarity.
    """
    n = len(candles)
    if length < 1 or n < (2 * length + 1):
        return []

    raw_swings: List[SwingPoint] = []
    last_high_price: Optional[float] = None
    last_low_price: Optional[float] = None

    for i in range(length, n - length):
        c = candles[i]
        left = candles[i - length : i]
        right = candles[i + 1 : i + length + 1]

        is_swing_high = all(c.high > b.high for b in left) and all(
            c.high >= b.high for b in right
        )
        is_swing_low = all(c.low < b.low for b in left) and all(
            c.low <= b.low for b in right
        )

        if is_swing_high:
            if last_high_price is None:
                label = SwingLabel.SH
            elif c.high > last_high_price:
                label = SwingLabel.HH
            else:
                label = SwingLabel.LH
            last_high_price = c.high
            raw_swings.append(
                SwingPoint(
                    index=i,
                    timestamp=c.timestamp,
                    price=c.high,
                    is_high=True,
                    tier=tier,
                    label=label,
                )
            )

        if is_swing_low:
            if last_low_price is None:
                label = SwingLabel.SL
            elif c.low < last_low_price:
                label = SwingLabel.LL
            else:
                label = SwingLabel.HL
            last_low_price = c.low
            raw_swings.append(
                SwingPoint(
                    index=i,
                    timestamp=c.timestamp,
                    price=c.low,
                    is_high=False,
                    tier=tier,
                    label=label,
                )
            )

    raw_swings.sort(key=lambda s: (s.index, 0 if s.is_high else 1))
    return raw_swings


def detect_structure_breaks(
    candles: List[Candle],
    swings: List[SwingPoint],
    atr: List[float],
    tier: StructureTier,
) -> Tuple[List[StructureBreak], Direction]:
    """Detect Break of Structure (BOS) and Change of Character (CHoCH) from confirmed swings.

    A structure break occurs when a candle *closes* above the most recent unbroken swing high
    (bullish break) or *closes* below the most recent unbroken swing low (bearish break).
    - If the break aligns with the active trend bias (or initializes it) -> BOS
    - If the break reverses the active trend bias -> CHoCH
    """
    if not candles or not swings:
        return [], Direction.NEUTRAL

    breaks: List[StructureBreak] = []
    trend: Direction = Direction.NEUTRAL

    swing_ptr = 0
    active_high: Optional[SwingPoint] = None
    active_low: Optional[SwingPoint] = None
    high_broken = False
    low_broken = False

    for i, c in enumerate(candles):
        # Register any swing point confirmed at or before bar i
        while swing_ptr < len(swings) and swings[swing_ptr].index < i:
            sp = swings[swing_ptr]
            if sp.is_high:
                active_high = sp
                high_broken = False
            else:
                active_low = sp
                low_broken = False
            swing_ptr += 1

        bar_atr = atr[i] if i < len(atr) and atr[i] > 0 else max(c.total_range, 1.0)

        # Bullish break: close strictly above active swing high
        if active_high is not None and not high_broken and c.close > active_high.price:
            high_broken = True
            break_type = (
                StructureBreakType.CHOCH
                if trend == Direction.BEARISH
                else StructureBreakType.BOS
            )
            # Measure impulse from lowest low between broken swing and break bar
            leg_start = active_low.index if (active_low and active_low.index < i) else active_high.index
            leg_low = min(candles[j].low for j in range(leg_start, i + 1))
            impulse_size = max(0.0, c.high - leg_low)
            breaks.append(
                StructureBreak(
                    break_type=break_type,
                    direction=Direction.BULLISH,
                    tier=tier,
                    broken_swing_index=active_high.index,
                    break_index=i,
                    break_timestamp=c.timestamp,
                    level=active_high.price,
                    impulse_size=impulse_size,
                    impulse_atr_ratio=impulse_size / bar_atr,
                )
            )
            trend = Direction.BULLISH

        # Bearish break: close strictly below active swing low
        if active_low is not None and not low_broken and c.close < active_low.price:
            low_broken = True
            break_type = (
                StructureBreakType.CHOCH
                if trend == Direction.BULLISH
                else StructureBreakType.BOS
            )
            leg_start = active_high.index if (active_high and active_high.index < i) else active_low.index
            leg_high = max(candles[j].high for j in range(leg_start, i + 1))
            impulse_size = max(0.0, leg_high - c.low)
            breaks.append(
                StructureBreak(
                    break_type=break_type,
                    direction=Direction.BEARISH,
                    tier=tier,
                    broken_swing_index=active_low.index,
                    break_index=i,
                    break_timestamp=c.timestamp,
                    level=active_low.price,
                    impulse_size=impulse_size,
                    impulse_atr_ratio=impulse_size / bar_atr,
                )
            )
            trend = Direction.BEARISH

    return breaks, trend
