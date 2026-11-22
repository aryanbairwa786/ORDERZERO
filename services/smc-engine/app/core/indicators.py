"""Technical indicators and Indian-market overlays: ATR, RVOL, VWAP, ORB, CPR, PDH/PDL."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from .market_hours import MARKET_OPEN, to_ist
from .models import CPRLevels, Candle, OpeningRange, SessionLevels


def compute_atr(candles: List[Candle], period: int = 14) -> List[float]:
    """Compute Wilder's Average True Range (ATR) for each candle."""
    n = len(candles)
    if n == 0:
        return []

    true_ranges: List[float] = []
    for i, c in enumerate(candles):
        if i == 0:
            tr = c.high - c.low
        else:
            prev_close = candles[i - 1].close
            tr = max(
                c.high - c.low,
                abs(c.high - prev_close),
                abs(c.low - prev_close),
            )
        true_ranges.append(max(tr, 1e-6))

    atr: List[float] = [0.0] * n
    effective_period = max(1, min(period, n))
    # Running simple average for warm-up bars, then Wilder's smoothing
    running_sum = 0.0
    for i in range(n):
        if i < effective_period:
            running_sum += true_ranges[i]
            atr[i] = running_sum / (i + 1)
        else:
            atr[i] = ((atr[i - 1] * (effective_period - 1)) + true_ranges[i]) / effective_period
    return atr


def compute_relative_volume(candles: List[Candle], lookback: int = 20) -> List[float]:
    """Compute relative volume (RVOL = volume / SMA(volume, lookback))."""
    n = len(candles)
    if n == 0:
        return []

    rvol: List[float] = []
    for i, c in enumerate(candles):
        start = max(0, i - lookback)
        window = [candles[j].volume for j in range(start, i)]
        avg_vol = sum(window) / len(window) if window else c.volume
        if avg_vol <= 0:
            rvol.append(1.0)
        else:
            rvol.append(c.volume / avg_vol)
    return rvol


def compute_session_vwap(candles: List[Candle]) -> List[Optional[float]]:
    """Compute intraday VWAP that resets at the start of every NSE trading date (IST)."""
    vwap_values: List[Optional[float]] = []
    current_date = None
    cum_pv = 0.0
    cum_vol = 0.0

    for c in candles:
        ist_ts = to_ist(c.timestamp)
        if ist_ts.date() != current_date:
            current_date = ist_ts.date()
            cum_pv = 0.0
            cum_vol = 0.0

        typical_price = (c.high + c.low + c.close) / 3.0
        vol = max(c.volume, 0.0)
        cum_pv += typical_price * vol
        cum_vol += vol
        if cum_vol > 0:
            vwap_values.append(cum_pv / cum_vol)
        else:
            vwap_values.append(typical_price)
    return vwap_values


def compute_opening_range(
    candles: List[Candle], orb_minutes: int = 15
) -> Optional[OpeningRange]:
    """Compute the Opening Range (default 09:15–09:30 IST) for the latest trading day."""
    if not candles:
        return None

    latest_date = to_ist(candles[-1].timestamp).date()
    session_start = to_ist(candles[-1].timestamp).replace(
        hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute, second=0, microsecond=0
    )
    orb_end = session_start + timedelta(minutes=orb_minutes)

    orb_candles = [
        c
        for c in candles
        if to_ist(c.timestamp).date() == latest_date
        and session_start <= to_ist(c.timestamp) < orb_end
    ]
    if not orb_candles:
        return None

    orb_high = max(c.high for c in orb_candles)
    orb_low = min(c.low for c in orb_candles)
    return OpeningRange(
        session_date=latest_date.isoformat(),
        high=orb_high,
        low=orb_low,
        midpoint=(orb_high + orb_low) / 2.0,
        start_timestamp=to_ist(orb_candles[0].timestamp),
        end_timestamp=orb_end,
    )


def compute_cpr(candles: List[Candle]) -> Optional[CPRLevels]:
    """Compute Central Pivot Range (Pivot, BC, TC, R1/R2, S1/S2) from previous session OHLC."""
    if not candles:
        return None

    by_day: Dict[str, List[Candle]] = defaultdict(list)
    for c in candles:
        by_day[to_ist(c.timestamp).date().isoformat()].append(c)

    sorted_days = sorted(by_day.keys())
    if len(sorted_days) < 2:
        return None

    prev_day_candles = by_day[sorted_days[-2]]
    current_day = sorted_days[-1]

    prev_high = max(c.high for c in prev_day_candles)
    prev_low = min(c.low for c in prev_day_candles)
    prev_close = prev_day_candles[-1].close

    pivot = (prev_high + prev_low + prev_close) / 3.0
    bc = (prev_high + prev_low) / 2.0
    tc = (pivot - bc) + pivot
    # Normalize so tc >= bc always
    if bc > tc:
        bc, tc = tc, bc

    r1 = (2.0 * pivot) - prev_low
    s1 = (2.0 * pivot) - prev_high
    r2 = pivot + (prev_high - prev_low)
    s2 = pivot - (prev_high - prev_low)

    cpr_width_pct = ((tc - bc) / pivot) * 100.0 if pivot > 0 else 0.0
    return CPRLevels(
        session_date=current_day,
        pivot=pivot,
        bc=bc,
        tc=tc,
        r1=r1,
        r2=r2,
        s1=s1,
        s2=s2,
        is_narrow=cpr_width_pct < 0.25,
    )


def compute_session_levels(candles: List[Candle]) -> SessionLevels:
    """Compute Previous Day (PDH/PDL), Previous Week (PWH/PWL), and Previous Month (PMH/PML)."""
    if not candles:
        return SessionLevels()

    by_day: Dict[str, List[Candle]] = defaultdict(list)
    by_week: Dict[Tuple[int, int], List[Candle]] = defaultdict(list)
    by_month: Dict[Tuple[int, int], List[Candle]] = defaultdict(list)

    for c in candles:
        d = to_ist(c.timestamp).date()
        by_day[d.isoformat()].append(c)
        iso = d.isocalendar()
        by_week[(iso[0], iso[1])].append(c)
        by_month[(d.year, d.month)].append(c)

    pdh = pdl = pwh = pwl = pmh = pml = None

    days = sorted(by_day.keys())
    if len(days) >= 2:
        prev_d = by_day[days[-2]]
        pdh = max(c.high for c in prev_d)
        pdl = min(c.low for c in prev_d)

    weeks = sorted(by_week.keys())
    if len(weeks) >= 2:
        prev_w = by_week[weeks[-2]]
        pwh = max(c.high for c in prev_w)
        pwl = min(c.low for c in prev_w)

    months = sorted(by_month.keys())
    if len(months) >= 2:
        prev_m = by_month[months[-2]]
        pmh = max(c.high for c in prev_m)
        pml = min(c.low for c in prev_m)

    return SessionLevels(pdh=pdh, pdl=pdl, pwh=pwh, pwl=pwl, pmh=pmh, pml=pml)
