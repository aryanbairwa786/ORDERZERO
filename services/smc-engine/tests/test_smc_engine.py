"""Unit tests for the Indian Stock Market SMC Detection Engine."""

from __future__ import annotations

import unittest
from datetime import date, datetime, timedelta

from app.adapters.demo import DemoBrokerAdapter
from app.core.candle_builder import build_candles_from_ticks
from app.core.engine import SMCEngine
from app.core.market_hours import (
    IST,
    format_indian_compact,
    format_inr,
    get_nse_session_status,
    is_nse_trading_day,
)
from app.core.models import (
    Direction,
    OrderBlockKind,
    OrderBlockState,
    SMCConfig,
    StructureBreakType,
    Tick,
)
from tests.sample_nifty_data import (
    build_nifty_bullish_ob_and_breaker_fixture,
    build_nifty_eqh_and_liquidity_sweep_fixture,
    build_nifty_two_session_fixture,
)


class TestIndianMarketUtilities(unittest.TestCase):
    def test_inr_and_lakh_crore_formatting(self) -> None:
        self.assertEqual(format_inr(24350.5), "₹24,350.50")
        self.assertEqual(format_inr(100000, decimals=0), "₹1,00,000")
        self.assertEqual(format_inr(12345678.9), "₹1,23,45,678.90")
        self.assertEqual(format_indian_compact(2_50_000), "₹2.50 L")
        self.assertEqual(format_indian_compact(4_75_00_000), "₹4.75 Cr")

    def test_nse_session_status_and_holidays(self) -> None:
        # Regular Wednesday during pre-open, open, and after close
        self.assertEqual(
            get_nse_session_status(datetime(2026, 11, 18, 9, 4, tzinfo=IST)),
            "pre_open",
        )
        self.assertEqual(
            get_nse_session_status(datetime(2026, 11, 18, 10, 30, tzinfo=IST)),
            "open",
        )
        self.assertEqual(
            get_nse_session_status(datetime(2026, 11, 18, 16, 0, tzinfo=IST)),
            "closed",
        )
        # Republic Day holiday
        self.assertFalse(is_nse_trading_day(date(2026, 1, 26)))
        self.assertEqual(
            get_nse_session_status(datetime(2026, 1, 26, 11, 0, tzinfo=IST)),
            "holiday",
        )


class TestCandleBuilder(unittest.TestCase):
    def test_tick_aggregation_for_5m_and_75m_nse_buckets(self) -> None:
        base = datetime(2026, 11, 18, 9, 15, tzinfo=IST)
        ticks = [
            Tick(base + timedelta(minutes=0), 24200.0, 100.0, 1000),
            Tick(base + timedelta(minutes=2), 24235.0, 150.0, 1050),
            Tick(base + timedelta(minutes=4), 24190.0, 120.0, 1100),
            Tick(base + timedelta(minutes=6), 24250.0, 200.0, 1200),
            Tick(base + timedelta(minutes=76), 24310.0, 300.0, 1500),
        ]
        candles_5m = build_candles_from_ticks(ticks, "5m")
        self.assertEqual(len(candles_5m), 3)
        self.assertEqual(candles_5m[0].open, 24200.0)
        self.assertEqual(candles_5m[0].high, 24235.0)
        self.assertEqual(candles_5m[0].low, 24190.0)
        self.assertEqual(candles_5m[0].close, 24190.0)
        self.assertEqual(candles_5m[0].volume, 370.0)

        # 75m NSE buckets: 09:15–10:30 (first 4 ticks) and 10:30–11:45 (5th tick at +76m)
        candles_75m = build_candles_from_ticks(ticks, "75m")
        self.assertEqual(len(candles_75m), 2)
        self.assertEqual(candles_75m[0].timestamp.hour, 9)
        self.assertEqual(candles_75m[0].timestamp.minute, 15)
        self.assertEqual(candles_75m[1].timestamp.hour, 10)
        self.assertEqual(candles_75m[1].timestamp.minute, 30)


class TestSMCEngineCore(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = SMCEngine()

    def test_bullish_ob_lifecycle_and_breaker_block_flip(self) -> None:
        candles = build_nifty_bullish_ob_and_breaker_fixture()
        cfg = SMCConfig(
            internal_swing_length=2,
            swing_length=10,
            atr_period=5,
            displacement_atr_mult=1.2,
            ob_zone_mode="wick",
            show_mitigated=True,
            auto_hide_filled_fvg=False,
        )
        result = self.engine.analyze(candles, symbol="NIFTY 50", timeframe="5m", config=cfg)

        # 1. Verify Bullish BOS and subsequent Bearish CHoCH
        bull_breaks = [b for b in result.structure_breaks if b.direction == Direction.BULLISH]
        bear_breaks = [b for b in result.structure_breaks if b.direction == Direction.BEARISH]
        self.assertTrue(len(bull_breaks) >= 1, "Expected at least one bullish structure break")
        self.assertTrue(len(bear_breaks) >= 1, "Expected at least one bearish structure break")
        self.assertTrue(any(b.break_type == StructureBreakType.CHOCH for b in bear_breaks))

        # 2. Verify Bullish OB at bar 7 (24195–24215) with FVG confluence, high RVOL, and BROKEN state
        bull_obs = [ob for ob in result.order_blocks if ob.direction == Direction.BULLISH]
        self.assertTrue(len(bull_obs) >= 1, "Expected bullish order block to be detected")
        ob = bull_obs[0]
        self.assertEqual(ob.candle_index, 7)
        self.assertEqual(ob.top, 24215.0)
        self.assertEqual(ob.bottom, 24195.0)
        self.assertAlmostEqual(ob.mean_threshold, 24205.0, places=2)
        self.assertTrue(ob.has_fvg_confluence)
        self.assertEqual(ob.state, OrderBlockState.BROKEN)
        self.assertEqual(ob.tested_index, 13)
        self.assertEqual(ob.broken_index, 16)
        self.assertGreaterEqual(ob.strength_score, 50.0)
        self.assertLessEqual(ob.strength_score, 100.0)

        # 3. Verify Breaker Block spawned with flipped BEARISH polarity and tested on bar 18
        bear_breakers = [
            bb
            for bb in result.breaker_blocks
            if bb.kind == OrderBlockKind.BREAKER_BLOCK and bb.direction == Direction.BEARISH
        ]
        self.assertTrue(len(bear_breakers) >= 1, "Expected a bearish breaker block from broken bullish OB")
        self.assertEqual(bear_breakers[0].parent_ob_id, ob.id)
        self.assertEqual(bear_breakers[0].state, OrderBlockState.TESTED)
        self.assertEqual(bear_breakers[0].tested_index, 18)

    def test_ob_body_mode_and_hide_mitigated_settings(self) -> None:
        candles = build_nifty_bullish_ob_and_breaker_fixture()
        # Slice right after bullish BOS (bar 10) so the OB is still FRESH
        fresh_slice = candles[:11]
        cfg_body = SMCConfig(
            internal_swing_length=2,
            swing_length=10,
            atr_period=5,
            displacement_atr_mult=1.2,
            ob_zone_mode="body",
            show_mitigated=False,
        )
        res_fresh = self.engine.analyze(fresh_slice, symbol="NIFTY 50", timeframe="5m", config=cfg_body)
        self.assertEqual(len(res_fresh.order_blocks), 1)
        ob = res_fresh.order_blocks[0]
        self.assertEqual(ob.state, OrderBlockState.FRESH)
        # Body of bar 7 is open=24210, close=24198
        self.assertEqual(ob.top, 24210.0)
        self.assertEqual(ob.bottom, 24198.0)
        self.assertAlmostEqual(ob.mean_threshold, 24204.0, places=2)

        # On the full series, the bullish OB is BROKEN, so show_mitigated=False hides it
        res_full = self.engine.analyze(candles, symbol="NIFTY 50", timeframe="5m", config=cfg_body)
        self.assertTrue(all(o.state == OrderBlockState.FRESH for o in res_full.order_blocks))

    def test_fvg_auto_hide_when_filled(self) -> None:
        candles = build_nifty_bullish_ob_and_breaker_fixture()
        cfg_show_all = SMCConfig(
            internal_swing_length=2,
            atr_period=5,
            auto_hide_filled_fvg=False,
        )
        cfg_auto_hide = SMCConfig(
            internal_swing_length=2,
            atr_period=5,
            auto_hide_filled_fvg=True,
        )
        res_all = self.engine.analyze(candles, config=cfg_show_all)
        res_hidden = self.engine.analyze(candles, config=cfg_auto_hide)

        bull_fvgs = [g for g in res_all.fair_value_gaps if g.direction == Direction.BULLISH]
        self.assertTrue(len(bull_fvgs) >= 1)
        self.assertTrue(bull_fvgs[0].is_filled)
        self.assertTrue(all(not g.is_filled for g in res_hidden.fair_value_gaps))

    def test_eqh_and_liquidity_sweep_detection(self) -> None:
        candles = build_nifty_eqh_and_liquidity_sweep_fixture()
        cfg = SMCConfig(
            internal_swing_length=2,
            swing_length=10,
            atr_period=5,
            eq_tolerance_atr_mult=0.25,
        )
        result = self.engine.analyze(candles, symbol="NIFTY 50", timeframe="5m", config=cfg)

        eqh_levels = [l for l in result.liquidity_levels if l.label == "EQH"]
        self.assertTrue(len(eqh_levels) >= 1, "Expected Equal Highs (EQH) near 24501")
        self.assertTrue(eqh_levels[0].swept)

        buy_sweeps = [sw for sw in result.liquidity_sweeps if sw.side == "buy_side"]
        self.assertTrue(len(buy_sweeps) >= 1, "Expected buy-side stop-hunt sweep on bar 11")
        self.assertEqual(buy_sweeps[0].index, 11)
        self.assertEqual(buy_sweeps[0].wick_extreme, 24518.0)

    def test_indian_overlays_pdh_pdl_cpr_orb_and_vwap(self) -> None:
        candles = build_nifty_two_session_fixture()
        result = self.engine.analyze(candles, symbol="NIFTY 50", timeframe="5m")

        # PDH / PDL from Day 1 (High=24300, Low=24080)
        self.assertIsNotNone(result.session_levels)
        assert result.session_levels is not None
        self.assertEqual(result.session_levels.pdh, 24300.0)
        self.assertEqual(result.session_levels.pdl, 24080.0)

        # CPR from Day 1 (H=24300, L=24080, C=24260 -> P=24213.33, BC=24190, TC=24236.67)
        self.assertIsNotNone(result.cpr)
        assert result.cpr is not None
        self.assertAlmostEqual(result.cpr.pivot, (24300 + 24080 + 24260) / 3.0, places=2)
        self.assertAlmostEqual(result.cpr.bc, 24190.0, places=2)
        self.assertGreater(result.cpr.tc, result.cpr.bc)

        # 15-min Opening Range on Day 2 (09:15, 09:20, 09:25 -> High=24320, Low=24250)
        self.assertIsNotNone(result.opening_range)
        assert result.opening_range is not None
        self.assertEqual(result.opening_range.high, 24320.0)
        self.assertEqual(result.opening_range.low, 24250.0)

        # VWAP computed for every candle
        self.assertEqual(len(result.vwap), len(candles))
        self.assertTrue(all(v is not None for v in result.vwap))

    def test_demo_adapter_end_to_end_analysis_and_json_serialization(self) -> None:
        adapter = DemoBrokerAdapter()
        end = datetime(2026, 11, 20, 15, 30, tzinfo=IST)
        start = datetime(2026, 11, 17, 9, 15, tzinfo=IST)
        candles = adapter.get_historical_candles("NSE", "NIFTY 50", "5m", start, end)
        self.assertGreater(len(candles), 150)

        result = self.engine.analyze(
            candles=candles,
            symbol="NIFTY 50",
            exchange="NSE",
            timeframe="5m",
            config=SMCConfig(internal_swing_length=5, swing_length=25, max_obs_shown=10),
        )
        payload = result.to_dict()
        self.assertEqual(payload["symbol"], "NIFTY 50")
        self.assertIn("SEBI-registered", payload["disclaimer"])
        self.assertGreater(len(result.swings), 0)
        self.assertGreater(len(result.structure_breaks), 0)
        self.assertGreater(len(result.order_blocks), 0)
        self.assertIsNotNone(result.premium_discount)


if __name__ == "__main__":
    unittest.main()
