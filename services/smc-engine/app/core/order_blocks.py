"""Order Blocks, Breaker Blocks, Mitigation Blocks, Lifecycle States, and Strength Scoring."""

from __future__ import annotations

from typing import List, Optional, Tuple

from .models import (
    Candle,
    Direction,
    FairValueGap,
    OrderBlock,
    OrderBlockKind,
    OrderBlockState,
    SMCConfig,
    StructureBreak,
    StructureTier,
    SwingPoint,
)


def _compute_ob_strength(
    rvol: float,
    displacement_atr_ratio: float,
    has_fvg: bool,
    state: OrderBlockState,
) -> float:
    """Compute a volume-weighted Order Block strength score in [0, 100].

    Weights:
    - Relative Volume (RVOL): up to 40 pts (capped at 2.5x average volume)
    - Displacement impulse / ATR: up to 35 pts (capped at 3.5x ATR)
    - FVG confluence left behind: 15 pts
    - Freshness bonus: 10 pts if FRESH, 4 pts if TESTED, 0 pts if BROKEN
    """
    vol_score = min(max(rvol, 0.0) / 2.5, 1.0) * 40.0
    disp_score = min(max(displacement_atr_ratio, 0.0) / 3.5, 1.0) * 35.0
    fvg_score = 15.0 if has_fvg else 0.0
    fresh_score = (
        10.0
        if state == OrderBlockState.FRESH
        else (4.0 if state == OrderBlockState.TESTED else 0.0)
    )
    return round(min(100.0, vol_score + disp_score + fvg_score + fresh_score), 1)


def _zone_bounds(candle: Candle, mode: str) -> Tuple[float, float]:
    """Return (top, bottom) using full candle range ('wick') or open-close ('body')."""
    if mode == "body":
        top = candle.body_high
        bottom = candle.body_low
        if top == bottom:
            return candle.high, candle.low
        return top, bottom
    return candle.high, candle.low


def _evaluate_zone_lifecycle(
    ob: OrderBlock,
    candles: List[Candle],
    start_index: int,
) -> None:
    """Track FRESH -> TESTED -> BROKEN transitions from `start_index` onward."""
    for i in range(start_index, len(candles)):
        c = candles[i]
        if ob.direction == Direction.BULLISH:
            # Invalidation: candle closes strictly below zone bottom
            if c.close < ob.bottom:
                ob.state = OrderBlockState.BROKEN
                ob.broken_index = i
                ob.broken_timestamp = c.timestamp
                return
            # Mitigation/Test: price dips into the zone
            if c.low <= ob.top and ob.state == OrderBlockState.FRESH:
                ob.state = OrderBlockState.TESTED
                ob.tested_index = i
                ob.tested_timestamp = c.timestamp
        else:
            # Invalidation: candle closes strictly above zone top
            if c.close > ob.top:
                ob.state = OrderBlockState.BROKEN
                ob.broken_index = i
                ob.broken_timestamp = c.timestamp
                return
            # Mitigation/Test: price rallies into the zone
            if c.high >= ob.bottom and ob.state == OrderBlockState.FRESH:
                ob.state = OrderBlockState.TESTED
                ob.tested_index = i
                ob.tested_timestamp = c.timestamp


def _has_fvg_between(
    fvgs: List[FairValueGap],
    direction: Direction,
    ob_index: int,
    break_index: int,
) -> bool:
    """Return True if a same-direction FVG formed between the OB candle and structure break."""
    for fvg in fvgs:
        if (
            fvg.direction == direction
            and ob_index <= fvg.start_index <= break_index + 1
        ):
            return True
    return False


def detect_order_blocks(
    candles: List[Candle],
    structure_breaks: List[StructureBreak],
    all_fvgs: List[FairValueGap],
    rvol: List[float],
    config: SMCConfig,
) -> Tuple[List[OrderBlock], List[OrderBlock]]:
    """Detect validated Bullish/Bearish Order Blocks and derived Breaker Blocks.

    Rules:
    - Bullish OB: last bearish candle before a strong bullish impulse that causes BOS/CHoCH.
    - Bearish OB: last bullish candle before a strong bearish impulse that causes BOS/CHoCH.
    - Displacement check: impulse_atr_ratio >= config.displacement_atr_mult.
    - Optional FVG check: if config.require_fvg_for_ob is True, requires an FVG in the impulse leg.
    - Breaker Block: when an OB becomes BROKEN, a flipped-polarity Breaker Block is created
      at the same price zone starting from `broken_index + 1`.
    """
    order_blocks: List[OrderBlock] = []
    breaker_blocks: List[OrderBlock] = []
    seen_ob_keys: set[Tuple[int, str, str]] = set()

    for brk in structure_breaks:
        if brk.impulse_atr_ratio < config.displacement_atr_mult:
            continue

        # Search backward from the break candle to find the origin opposing candle
        search_start = max(
            0,
            min(brk.broken_swing_index, brk.break_index - 1) - 2,
            brk.break_index - config.ob_search_lookback,
        )
        ob_idx: Optional[int] = None

        for j in range(brk.break_index - 1, search_start - 1, -1):
            c = candles[j]
            if brk.direction == Direction.BULLISH and c.is_bearish:
                ob_idx = j
                break
            if brk.direction == Direction.BEARISH and c.is_bullish:
                ob_idx = j
                break

        if ob_idx is None:
            continue

        dedup_key = (ob_idx, brk.direction.value, brk.tier.value)
        if dedup_key in seen_ob_keys:
            continue
        seen_ob_keys.add(dedup_key)

        fvg_confluence = _has_fvg_between(all_fvgs, brk.direction, ob_idx, brk.break_index)
        if config.require_fvg_for_ob and not fvg_confluence:
            continue

        ob_candle = candles[ob_idx]
        top, bottom = _zone_bounds(ob_candle, config.ob_zone_mode)
        ob_rvol = rvol[ob_idx] if ob_idx < len(rvol) else 1.0

        ob = OrderBlock(
            id=f"ob_{brk.tier.value}_{brk.direction.value}_{ob_idx}",
            kind=OrderBlockKind.ORDER_BLOCK,
            direction=brk.direction,
            tier=brk.tier,
            candle_index=ob_idx,
            timestamp=ob_candle.timestamp,
            top=top,
            bottom=bottom,
            mean_threshold=(top + bottom) / 2.0,
            state=OrderBlockState.FRESH,
            strength_score=0.0,
            relative_volume=ob_rvol,
            displacement_atr_ratio=brk.impulse_atr_ratio,
            has_fvg_confluence=fvg_confluence,
            created_by_break=brk.break_type,
        )

        # Evaluate lifecycle strictly after the structure break confirms the OB
        _evaluate_zone_lifecycle(ob, candles, start_index=brk.break_index + 1)
        ob.strength_score = _compute_ob_strength(
            rvol=ob.relative_volume,
            displacement_atr_ratio=ob.displacement_atr_ratio,
            has_fvg=ob.has_fvg_confluence,
            state=ob.state,
        )
        order_blocks.append(ob)

        # Spawn a flipped-polarity Breaker Block if this OB was invalidated
        if (
            config.detect_breakers
            and ob.state == OrderBlockState.BROKEN
            and ob.broken_index is not None
        ):
            flipped_dir = (
                Direction.BEARISH
                if ob.direction == Direction.BULLISH
                else Direction.BULLISH
            )
            breaker = OrderBlock(
                id=f"bb_{ob.tier.value}_{flipped_dir.value}_{ob.broken_index}",
                kind=OrderBlockKind.BREAKER_BLOCK,
                direction=flipped_dir,
                tier=ob.tier,
                candle_index=ob.candle_index,
                timestamp=ob.timestamp,
                top=ob.top,
                bottom=ob.bottom,
                mean_threshold=ob.mean_threshold,
                state=OrderBlockState.FRESH,
                strength_score=0.0,
                relative_volume=ob.relative_volume,
                displacement_atr_ratio=ob.displacement_atr_ratio,
                has_fvg_confluence=ob.has_fvg_confluence,
                created_by_break=ob.created_by_break,
                parent_ob_id=ob.id,
            )
            _evaluate_zone_lifecycle(breaker, candles, start_index=ob.broken_index + 1)
            breaker.strength_score = _compute_ob_strength(
                rvol=breaker.relative_volume,
                displacement_atr_ratio=breaker.displacement_atr_ratio,
                has_fvg=breaker.has_fvg_confluence,
                state=breaker.state,
            )
            breaker_blocks.append(breaker)

    # Apply display filters from settings
    if not config.show_mitigated:
        order_blocks = [ob for ob in order_blocks if ob.state == OrderBlockState.FRESH]
        breaker_blocks = [bb for bb in breaker_blocks if bb.state == OrderBlockState.FRESH]

    if config.max_obs_shown > 0:
        order_blocks = order_blocks[-config.max_obs_shown :]
        breaker_blocks = breaker_blocks[-config.max_obs_shown :]

    return order_blocks, breaker_blocks


def detect_mitigation_blocks(
    candles: List[Candle],
    swings: List[SwingPoint],
    structure_breaks: List[StructureBreak],
    rvol: List[float],
    config: SMCConfig,
) -> List[OrderBlock]:
    """Detect Mitigation Blocks (failed swing continuation without a liquidity sweep).

    - Bullish Mitigation Block: price forms a higher low (HL) that fails to sweep the prior low,
      then breaks upward through the intervening swing high (CHoCH/BOS); the last bearish candle
      around the HL is the bullish mitigation zone.
    - Bearish Mitigation Block: price forms a lower high (LH) that fails to sweep the prior high,
      then breaks downward through the intervening swing low; the last bullish candle around the
      LH is the bearish mitigation zone.
    """
    if not config.detect_mitigation_blocks or not swings or not structure_breaks:
        return []

    mitigation_blocks: List[OrderBlock] = []
    seen_indices: set[int] = set()

    for brk in structure_breaks:
        # Locate a failed-continuation swing right before the break
        prior_swings = [s for s in swings if s.index < brk.break_index and s.tier == brk.tier]
        if len(prior_swings) < 2:
            continue

        candidate_swing: Optional[SwingPoint] = None
        if brk.direction == Direction.BULLISH:
            # Look for an HL (failed lower low) between broken swing high and break
            for s in reversed(prior_swings):
                if not s.is_high and s.label.value == "HL" and s.index > brk.broken_swing_index:
                    candidate_swing = s
                    break
        else:
            # Look for an LH (failed higher high) between broken swing low and break
            for s in reversed(prior_swings):
                if s.is_high and s.label.value == "LH" and s.index > brk.broken_swing_index:
                    candidate_swing = s
                    break

        if candidate_swing is None or candidate_swing.index in seen_indices:
            continue

        # Pick the opposing candle at or immediately adjacent to the failed swing
        mb_idx = candidate_swing.index
        for offset in (0, -1, 1):
            idx = candidate_swing.index + offset
            if 0 <= idx < brk.break_index:
                c = candles[idx]
                if brk.direction == Direction.BULLISH and c.is_bearish:
                    mb_idx = idx
                    break
                if brk.direction == Direction.BEARISH and c.is_bullish:
                    mb_idx = idx
                    break

        seen_indices.add(candidate_swing.index)
        mb_candle = candles[mb_idx]
        top, bottom = _zone_bounds(mb_candle, config.ob_zone_mode)
        mb_rvol = rvol[mb_idx] if mb_idx < len(rvol) else 1.0

        mb = OrderBlock(
            id=f"mb_{brk.tier.value}_{brk.direction.value}_{mb_idx}",
            kind=OrderBlockKind.MITIGATION_BLOCK,
            direction=brk.direction,
            tier=brk.tier,
            candle_index=mb_idx,
            timestamp=mb_candle.timestamp,
            top=top,
            bottom=bottom,
            mean_threshold=(top + bottom) / 2.0,
            state=OrderBlockState.FRESH,
            strength_score=0.0,
            relative_volume=mb_rvol,
            displacement_atr_ratio=brk.impulse_atr_ratio,
            has_fvg_confluence=False,
            created_by_break=brk.break_type,
        )
        _evaluate_zone_lifecycle(mb, candles, start_index=brk.break_index + 1)
        mb.strength_score = _compute_ob_strength(
            rvol=mb.relative_volume,
            displacement_atr_ratio=mb.displacement_atr_ratio,
            has_fvg=False,
            state=mb.state,
        )
        mitigation_blocks.append(mb)

    if not config.show_mitigated:
        mitigation_blocks = [m for m in mitigation_blocks if m.state == OrderBlockState.FRESH]
    if config.max_obs_shown > 0:
        mitigation_blocks = mitigation_blocks[-config.max_obs_shown :]

    return mitigation_blocks
