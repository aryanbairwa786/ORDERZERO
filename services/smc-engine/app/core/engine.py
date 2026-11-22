"""Unified Smart Money Concepts (SMC) Detection Engine for NSE/BSE instruments."""

from __future__ import annotations

from typing import List, Optional

from .fvg import detect_fair_value_gaps
from .indicators import (
    compute_atr,
    compute_cpr,
    compute_opening_range,
    compute_relative_volume,
    compute_session_levels,
    compute_session_vwap,
)
from .liquidity import detect_liquidity
from .models import (
    Candle,
    Direction,
    SMCAnalysisResult,
    SMCConfig,
    StructureTier,
)
from .order_blocks import detect_mitigation_blocks, detect_order_blocks
from .structure import detect_structure_breaks, detect_swing_points
from .zones import compute_premium_discount


class SMCEngine:
    """Stateless, deterministic Smart Money Concepts detection engine."""

    def __init__(self, default_config: Optional[SMCConfig] = None) -> None:
        self.default_config = default_config or SMCConfig()

    def analyze(
        self,
        candles: List[Candle],
        symbol: str = "NIFTY 50",
        exchange: str = "NSE",
        timeframe: str = "5m",
        config: Optional[SMCConfig] = None,
    ) -> SMCAnalysisResult:
        """Run full SMC detection pipeline on an OHLCV candle series."""
        cfg = config or self.default_config
        if not candles:
            return SMCAnalysisResult(
                symbol=symbol,
                exchange=exchange,
                timeframe=timeframe,
                internal_trend=Direction.NEUTRAL,
                swing_trend=Direction.NEUTRAL,
                swings=[],
                structure_breaks=[],
                order_blocks=[],
                breaker_blocks=[],
                mitigation_blocks=[],
                fair_value_gaps=[],
                liquidity_levels=[],
                liquidity_sweeps=[],
                premium_discount=None,
                session_levels=None,
                opening_range=None,
                cpr=None,
                vwap=[],
                atr=[],
                config=cfg,
            )

        atr = compute_atr(candles, period=cfg.atr_period)
        rvol = compute_relative_volume(candles, lookback=cfg.rvol_lookback)

        # 1. Market Structure (Internal & Swing tiers)
        internal_swings = detect_swing_points(
            candles, length=cfg.internal_swing_length, tier=StructureTier.INTERNAL
        )
        swing_swings = detect_swing_points(
            candles, length=cfg.swing_length, tier=StructureTier.SWING
        )
        internal_breaks, internal_trend = detect_structure_breaks(
            candles, internal_swings, atr, tier=StructureTier.INTERNAL
        )
        swing_breaks, swing_trend = detect_structure_breaks(
            candles, swing_swings, atr, tier=StructureTier.SWING
        )

        all_swings = sorted(
            internal_swings + swing_swings, key=lambda s: (s.index, s.tier.value)
        )
        all_breaks = sorted(
            internal_breaks + swing_breaks, key=lambda b: (b.break_index, b.tier.value)
        )

        # 2. Fair Value Gaps (keep unfiltered copy for OB confluence validation)
        fvg_cfg_all = SMCConfig(
            fvg_min_size_atr_mult=cfg.fvg_min_size_atr_mult,
            auto_hide_filled_fvg=False,
        )
        all_fvgs = detect_fair_value_gaps(candles, atr, fvg_cfg_all)
        visible_fvgs = (
            [g for g in all_fvgs if not g.is_filled]
            if cfg.auto_hide_filled_fvg
            else all_fvgs
        )

        # 3. Order Blocks, Breaker Blocks & Mitigation Blocks
        order_blocks, breaker_blocks = detect_order_blocks(
            candles=candles,
            structure_breaks=all_breaks,
            all_fvgs=all_fvgs,
            rvol=rvol,
            config=cfg,
        )
        mitigation_blocks = detect_mitigation_blocks(
            candles=candles,
            swings=all_swings,
            structure_breaks=all_breaks,
            rvol=rvol,
            config=cfg,
        )

        # 4. Liquidity (EQH/EQL, BSL/SSL, Sweeps)
        liq_swings = swing_swings if len(swing_swings) >= 2 else internal_swings
        liquidity_levels, liquidity_sweeps = detect_liquidity(
            candles=candles,
            swings=liq_swings,
            atr=atr,
            config=cfg,
        )

        # 5. Premium / Discount / Equilibrium
        pd_swings = swing_swings if len(swing_swings) >= 2 else internal_swings
        premium_discount = compute_premium_discount(candles, pd_swings)

        # 6. Indian-market overlays (PDH/PDL, ORB, CPR, Session VWAP)
        session_levels = compute_session_levels(candles) if cfg.include_session_levels else None
        opening_range = (
            compute_opening_range(candles, orb_minutes=cfg.orb_minutes)
            if cfg.include_orb
            else None
        )
        cpr = compute_cpr(candles) if cfg.include_cpr else None
        vwap = compute_session_vwap(candles) if cfg.include_vwap else []

        return SMCAnalysisResult(
            symbol=symbol,
            exchange=exchange,
            timeframe=timeframe,
            internal_trend=internal_trend,
            swing_trend=swing_trend,
            swings=all_swings,
            structure_breaks=all_breaks,
            order_blocks=order_blocks,
            breaker_blocks=breaker_blocks,
            mitigation_blocks=mitigation_blocks,
            fair_value_gaps=visible_fvgs,
            liquidity_levels=liquidity_levels,
            liquidity_sweeps=liquidity_sweeps,
            premium_discount=premium_discount,
            session_levels=session_levels,
            opening_range=opening_range,
            cpr=cpr,
            vwap=vwap,
            atr=atr,
            config=cfg,
        )
