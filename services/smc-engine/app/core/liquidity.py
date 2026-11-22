"""Liquidity detection: Equal Highs/Lows (EQH/EQL), BSL/SSL pools, and Liquidity Sweeps."""

from __future__ import annotations

from typing import List, Tuple

from .models import Candle, LiquidityLevel, LiquiditySweep, SMCConfig, SwingPoint


def detect_liquidity(
    candles: List[Candle],
    swings: List[SwingPoint],
    atr: List[float],
    config: SMCConfig,
) -> Tuple[List[LiquidityLevel], List[LiquiditySweep]]:
    """Detect Equal Highs (EQH), Equal Lows (EQL), BSL/SSL pools, and stop-hunt sweeps."""
    if not candles or not swings:
        return [], []

    levels: List[LiquidityLevel] = []
    sweeps: List[LiquiditySweep] = []

    highs = [s for s in swings if s.is_high]
    lows = [s for s in swings if not s.is_high]

    # 1. Cluster swing highs into EQH (buy-side liquidity)
    used_highs: set[int] = set()
    for i, s1 in enumerate(highs):
        if s1.index in used_highs:
            continue
        tol = (atr[s1.index] if s1.index < len(atr) else 1.0) * config.eq_tolerance_atr_mult
        cluster = [s1]
        for s2 in highs[i + 1 :]:
            if s2.index in used_highs:
                continue
            if abs(s2.price - s1.price) <= tol:
                cluster.append(s2)

        if len(cluster) >= config.min_equal_touches:
            for sp in cluster:
                used_highs.add(sp.index)
            avg_price = sum(sp.price for sp in cluster) / len(cluster)
            levels.append(
                LiquidityLevel(
                    id=f"eqh_{cluster[0].index}_{cluster[-1].index}",
                    label="EQH",
                    side="buy_side",
                    price=avg_price,
                    start_index=cluster[0].index,
                    end_index=cluster[-1].index,
                    touch_indices=[sp.index for sp in cluster],
                )
            )

    # 2. Cluster swing lows into EQL (sell-side liquidity)
    used_lows: set[int] = set()
    for i, s1 in enumerate(lows):
        if s1.index in used_lows:
            continue
        tol = (atr[s1.index] if s1.index < len(atr) else 1.0) * config.eq_tolerance_atr_mult
        cluster = [s1]
        for s2 in lows[i + 1 :]:
            if s2.index in used_lows:
                continue
            if abs(s2.price - s1.price) <= tol:
                cluster.append(s2)

        if len(cluster) >= config.min_equal_touches:
            for sp in cluster:
                used_lows.add(sp.index)
            avg_price = sum(sp.price for sp in cluster) / len(cluster)
            levels.append(
                LiquidityLevel(
                    id=f"eql_{cluster[0].index}_{cluster[-1].index}",
                    label="EQL",
                    side="sell_side",
                    price=avg_price,
                    start_index=cluster[0].index,
                    end_index=cluster[-1].index,
                    touch_indices=[sp.index for sp in cluster],
                )
            )

    # 3. Include standalone recent major BSL / SSL pools not already in EQH/EQL
    for sp in highs[-3:]:
        if sp.index not in used_highs:
            levels.append(
                LiquidityLevel(
                    id=f"bsl_{sp.index}",
                    label="BSL",
                    side="buy_side",
                    price=sp.price,
                    start_index=sp.index,
                    end_index=sp.index,
                    touch_indices=[sp.index],
                )
            )
    for sp in lows[-3:]:
        if sp.index not in used_lows:
            levels.append(
                LiquidityLevel(
                    id=f"ssl_{sp.index}",
                    label="SSL",
                    side="sell_side",
                    price=sp.price,
                    start_index=sp.index,
                    end_index=sp.index,
                    touch_indices=[sp.index],
                )
            )

    # 4. Detect Liquidity Sweeps (stop hunts: wick pierces level, candle closes back inside)
    for lvl in levels:
        for idx in range(lvl.end_index + 1, len(candles)):
            c = candles[idx]
            if lvl.side == "buy_side":
                if c.high > lvl.price and c.close < lvl.price:
                    lvl.swept = True
                    lvl.swept_index = idx
                    sweeps.append(
                        LiquiditySweep(
                            index=idx,
                            timestamp=c.timestamp,
                            side="buy_side",
                            swept_level=lvl.price,
                            wick_extreme=c.high,
                            close_price=c.close,
                            source_label=lvl.label,
                        )
                    )
                    break
                if c.close >= lvl.price:
                    # Clean breakout rather than sweep
                    lvl.swept = True
                    lvl.swept_index = idx
                    break
            else:
                if c.low < lvl.price and c.close > lvl.price:
                    lvl.swept = True
                    lvl.swept_index = idx
                    sweeps.append(
                        LiquiditySweep(
                            index=idx,
                            timestamp=c.timestamp,
                            side="sell_side",
                            swept_level=lvl.price,
                            wick_extreme=c.low,
                            close_price=c.close,
                            source_label=lvl.label,
                        )
                    )
                    break
                if c.close <= lvl.price:
                    lvl.swept = True
                    lvl.swept_index = idx
                    break

    sweeps.sort(key=lambda sw: sw.index)
    return levels, sweeps
