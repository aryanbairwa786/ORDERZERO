"""Deterministic sample NIFTY 50 IST OHLCV datasets for unit testing SMC structures."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Tuple

from app.core.market_hours import IST
from app.core.models import Candle


def _make_series(
    ohlcv_rows: List[Tuple[float, float, float, float, float]],
    start_dt: datetime,
    step_minutes: int = 5,
) -> List[Candle]:
    candles: List[Candle] = []
    cur = start_dt
    for o, h, l, c, v in ohlcv_rows:
        candles.append(Candle(timestamp=cur, open=o, high=h, low=l, close=c, volume=v))
        cur = cur + timedelta(minutes=step_minutes)
    return candles


def build_nifty_bullish_ob_and_breaker_fixture() -> List[Candle]:
    """Build a realistic NIFTY 50 5m IST sequence containing:
    1. Clear swing high & swing low
    2. Last bearish candle (OB origin) with elevated relative volume
    3. Strong bullish displacement impulse with a Bullish FVG and Bullish BOS
    4. Pullback that tests/mitigates the Bullish OB (FRESH -> TESTED)
    5. Bearish CHoCH that closes below the Bullish OB (TESTED -> BROKEN) -> spawns Bearish Breaker Block
    """
    start = datetime(2026, 11, 18, 9, 15, tzinfo=IST)
    rows: List[Tuple[float, float, float, float, float]] = [
        # Bars 0-5: Initial rise into Swing High at bar 3 (24280)
        (24200, 24220, 24190, 24215, 110_000),
        (24215, 24245, 24210, 24240, 115_000),
        (24240, 24265, 24235, 24260, 120_000),
        (24260, 24280, 24250, 24270, 130_000),  # Swing High = 24280
        (24270, 24272, 24240, 24245, 118_000),
        (24245, 24250, 24215, 24220, 112_000),
        # Bars 6-8: Pullback to Swing Low at bar 7 (24195), bar 7 is bearish OB candidate with high vol
        (24220, 24225, 24205, 24210, 115_000),
        (24210, 24215, 24195, 24198, 290_000),  # Bearish OB origin (RVOL > 2x)
        # Bars 8-10: Strong bullish displacement impulse leaving FVG (bar7.high=24215 < bar9.low=24245) & BOS > 24280
        (24198, 24265, 24196, 24262, 340_000),
        (24262, 24340, 24245, 24335, 360_000),  # Bullish BOS above 24280
        (24335, 24360, 24320, 24345, 210_000),
        # Bars 11-14: Pullback into Bullish OB (24195-24215) -> mitigates/tests OB
        (24345, 24350, 24295, 24300, 140_000),
        (24300, 24305, 24255, 24260, 135_000),
        (24260, 24265, 24208, 24235, 155_000),  # Wick dips to 24208 <= 24215 -> TESTED
        (24235, 24275, 24230, 24265, 145_000),
        # Bars 15-19: Sharp sell-off closing below 24195 -> BROKEN OB -> spawns Bearish Breaker Block
        (24265, 24270, 24210, 24215, 190_000),
        (24215, 24220, 24165, 24170, 310_000),  # Closes at 24170 < 24195 -> OB BROKEN, Breaker created
        (24170, 24185, 24140, 24145, 260_000),
        (24145, 24205, 24140, 24185, 180_000),  # Retests Breaker zone (24195-24215)
        (24185, 24190, 24120, 24125, 220_000),
    ]
    return _make_series(rows, start, step_minutes=5)


def build_nifty_eqh_and_liquidity_sweep_fixture() -> List[Candle]:
    """Build a NIFTY 50 5m IST sequence with clear Equal Highs (EQH ~ 24500) followed by a stop-hunt sweep."""
    start = datetime(2026, 11, 19, 9, 15, tzinfo=IST)
    rows: List[Tuple[float, float, float, float, float]] = [
        (24440, 24460, 24435, 24455, 100_000),
        (24455, 24485, 24450, 24480, 110_000),
        (24480, 24500, 24475, 24490, 130_000),  # Swing High #1 = 24500
        (24490, 24492, 24465, 24470, 105_000),
        (24470, 24475, 24450, 24455, 102_000),
        (24455, 24465, 24445, 24462, 108_000),  # Swing Low = 24445
        (24462, 24488, 24460, 24485, 115_000),
        (24485, 24502, 24480, 24492, 140_000),  # Swing High #2 = 24502 (EQH with 24500)
        (24492, 24495, 24468, 24472, 110_000),
        (24472, 24478, 24455, 24465, 105_000),
        (24465, 24485, 24460, 24482, 120_000),
        # Bar 11: Liquidity Sweep! Wick spikes to 24518 above EQH (24501) and closes back down at 24478
        (24482, 24518, 24470, 24478, 280_000),
        (24478, 24480, 24435, 24440, 240_000),
        (24440, 24445, 24410, 24415, 220_000),
    ]
    return _make_series(rows, start, step_minutes=5)


def build_nifty_two_session_fixture() -> List[Candle]:
    """Build 2 consecutive NSE trading days of NIFTY 50 5m candles for PDH/PDL, CPR, ORB, and VWAP."""
    day1_start = datetime(2026, 11, 18, 9, 15, tzinfo=IST)
    day2_start = datetime(2026, 11, 19, 9, 15, tzinfo=IST)

    day1_rows = [
        (24100, 24160, 24080, 24140, 150_000),
        (24140, 24220, 24130, 24210, 180_000),
        (24210, 24300, 24190, 24260, 200_000),  # Day 1 High = 24300, Low = 24080, Close = 24260
    ]
    day2_rows = [
        (24270, 24295, 24250, 24285, 170_000),  # 09:15 (inside 15m ORB)
        (24285, 24315, 24275, 24305, 190_000),  # 09:20 (inside 15m ORB)
        (24305, 24320, 24290, 24310, 160_000),  # 09:25 (inside 15m ORB) -> ORB H=24320, L=24250
        (24310, 24355, 24305, 24345, 210_000),  # 09:30 (outside 15m ORB)
    ]
    return _make_series(day1_rows, day1_start, 5) + _make_series(day2_rows, day2_start, 5)
