"""Tick-to-Candle aggregator supporting Indian market timeframes (1m to 1W, including 75m)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Iterable, List

from .market_hours import MARKET_OPEN, to_ist
from .models import Candle, Tick

SUPPORTED_TIMEFRAMES: Dict[str, int] = {
    "1m": 1,
    "3m": 3,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1H": 60,
    "75m": 75,  # Popular on NSE: 09:15–15:30 = 375 mins = exactly 5 x 75m candles
    "1D": 1440,
    "1W": 10080,
}


def align_bucket_start(ts: datetime, timeframe: str) -> datetime:
    """Align an IST timestamp to the start of its NSE session-anchored candle bucket."""
    if timeframe not in SUPPORTED_TIMEFRAMES:
        raise ValueError(f"Unsupported timeframe: {timeframe}")

    ist_ts = to_ist(ts).replace(second=0, microsecond=0)

    if timeframe == "1D":
        return ist_ts.replace(hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute)

    if timeframe == "1W":
        monday = ist_ts - timedelta(days=ist_ts.weekday())
        return monday.replace(hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute)

    minutes = SUPPORTED_TIMEFRAMES[timeframe]
    session_open = ist_ts.replace(hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute)
    if ist_ts < session_open:
        return session_open

    elapsed_mins = int((ist_ts - session_open).total_seconds() // 60)
    bucket_idx = elapsed_mins // minutes
    return session_open + timedelta(minutes=bucket_idx * minutes)


def build_candles_from_ticks(ticks: Iterable[Tick], timeframe: str) -> List[Candle]:
    """Aggregate an ordered stream of live ticks into OHLCV candles for the given timeframe."""
    buckets: Dict[datetime, Candle] = {}
    for tick in ticks:
        bucket_ts = align_bucket_start(tick.timestamp, timeframe)
        existing = buckets.get(bucket_ts)
        if existing is None:
            buckets[bucket_ts] = Candle(
                timestamp=bucket_ts,
                open=tick.price,
                high=tick.price,
                low=tick.price,
                close=tick.price,
                volume=tick.volume,
                oi=tick.oi,
            )
        else:
            if tick.price > existing.high:
                existing.high = tick.price
            if tick.price < existing.low:
                existing.low = tick.price
            existing.close = tick.price
            existing.volume += tick.volume
            if tick.oi:
                existing.oi = tick.oi

    return [buckets[k] for k in sorted(buckets.keys())]
