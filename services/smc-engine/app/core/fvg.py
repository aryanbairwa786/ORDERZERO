"""Fair Value Gap (FVG / Imbalance) detection with fill tracking and auto-hide."""

from __future__ import annotations

from typing import List

from .models import Candle, Direction, FairValueGap, SMCConfig


def detect_fair_value_gaps(
    candles: List[Candle],
    atr: List[float],
    config: SMCConfig,
) -> List[FairValueGap]:
    """Detect 3-candle Fair Value Gaps and track subsequent mitigation/fill percentage.

    - Bullish FVG at index i: candles[i - 2].high < candles[i].low
    - Bearish FVG at index i: candles[i - 2].low > candles[i].high
    """
    n = len(candles)
    if n < 3:
        return []

    fvgs: List[FairValueGap] = []
    for i in range(2, n):
        c0 = candles[i - 2]
        c2 = candles[i]
        bar_atr = atr[i] if i < len(atr) and atr[i] > 0 else 1.0
        min_gap = config.fvg_min_size_atr_mult * bar_atr

        # Bullish FVG (imbalance below current bar)
        if c0.high < c2.low:
            gap_size = c2.low - c0.high
            if gap_size >= min_gap:
                top = c2.low
                bottom = c0.high
                fvg = FairValueGap(
                    id=f"fvg_bull_{i}",
                    direction=Direction.BULLISH,
                    start_index=i - 1,
                    timestamp=candles[i - 1].timestamp,
                    top=top,
                    bottom=bottom,
                    midpoint=(top + bottom) / 2.0,
                    gap_size=gap_size,
                )
                _evaluate_fvg_fill(fvg, candles, start_from=i + 1)
                fvgs.append(fvg)

        # Bearish FVG (imbalance above current bar)
        elif c0.low > c2.high:
            gap_size = c0.low - c2.high
            if gap_size >= min_gap:
                top = c0.low
                bottom = c2.high
                fvg = FairValueGap(
                    id=f"fvg_bear_{i}",
                    direction=Direction.BEARISH,
                    start_index=i - 1,
                    timestamp=candles[i - 1].timestamp,
                    top=top,
                    bottom=bottom,
                    midpoint=(top + bottom) / 2.0,
                    gap_size=gap_size,
                )
                _evaluate_fvg_fill(fvg, candles, start_from=i + 1)
                fvgs.append(fvg)

    if config.auto_hide_filled_fvg:
        return [g for g in fvgs if not g.is_filled]
    return fvgs


def _evaluate_fvg_fill(fvg: FairValueGap, candles: List[Candle], start_from: int) -> None:
    """Walk forward through subsequent candles to compute fill % and full fill index."""
    if fvg.gap_size <= 0:
        return

    max_fill = 0.0
    for j in range(start_from, len(candles)):
        c = candles[j]
        if fvg.direction == Direction.BULLISH:
            if c.low <= fvg.top:
                penetration = min(fvg.top - c.low, fvg.gap_size)
                fill_pct = (penetration / fvg.gap_size) * 100.0
                if fill_pct > max_fill:
                    max_fill = fill_pct
                if c.low <= fvg.bottom:
                    fvg.fill_percent = 100.0
                    fvg.is_filled = True
                    fvg.filled_index = j
                    return
        else:
            if c.high >= fvg.bottom:
                penetration = min(c.high - fvg.bottom, fvg.gap_size)
                fill_pct = (penetration / fvg.gap_size) * 100.0
                if fill_pct > max_fill:
                    max_fill = fill_pct
                if c.high >= fvg.top:
                    fvg.fill_percent = 100.0
                    fvg.is_filled = True
                    fvg.filled_index = j
                    return

    fvg.fill_percent = min(max_fill, 100.0)
