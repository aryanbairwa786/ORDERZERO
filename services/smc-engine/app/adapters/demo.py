"""Broker-free Demo Mode adapter generating realistic NIFTY 50 / BANK NIFTY IST candles."""

from __future__ import annotations

import asyncio
import math
from datetime import datetime, timedelta
from typing import AsyncIterator, List

from ..core.candle_builder import SUPPORTED_TIMEFRAMES
from ..core.market_hours import (
    IST,
    MARKET_OPEN,
    get_nse_session_status,
    is_nse_trading_day,
    to_ist,
)
from ..core.models import Candle, Tick
from .base import BrokerAdapter, BrokerName


class DemoBrokerAdapter(BrokerAdapter):
    """Deterministic sample/delayed data adapter so the platform works without a broker."""

    broker_name = BrokerName.DEMO

    BASE_PRICES = {
        "NIFTY 50": 24350.0,
        "BANK NIFTY": 52100.0,
        "FIN NIFTY": 23800.0,
        "MIDCAP NIFTY": 12450.0,
        "SENSEX": 79850.0,
        "BANKEX": 59200.0,
    }

    def get_historical_candles(
        self,
        exchange: str,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: datetime,
    ) -> List[Candle]:
        if timeframe not in SUPPORTED_TIMEFRAMES:
            raise ValueError(f"Unsupported timeframe: {timeframe}")

        step_minutes = min(SUPPORTED_TIMEFRAMES[timeframe], 75)
        base_price = self.BASE_PRICES.get(symbol.upper(), 24350.0)
        cur = to_ist(start).replace(hour=MARKET_OPEN.hour, minute=MARKET_OPEN.minute, second=0, microsecond=0)
        end_ist = to_ist(end)

        candles: List[Candle] = []
        price = base_price
        idx = 0

        while cur <= end_ist:
            if not is_nse_trading_day(cur.date()):
                cur = (cur + timedelta(days=1)).replace(hour=9, minute=15)
                continue

            session_close = cur.replace(hour=15, minute=30)
            if cur >= session_close:
                cur = (cur + timedelta(days=1)).replace(hour=9, minute=15)
                continue

            # Deterministic multi-wave price action producing clear swings, BOS, OBs, and FVGs
            wave = math.sin(idx * 0.28) * 42.0 + math.cos(idx * 0.11) * 65.0
            impulse = 55.0 if (idx % 29 == 14) else (-58.0 if (idx % 37 == 24) else 0.0)
            target_close = base_price + wave + (idx * 0.85) + impulse
            open_p = price
            close_p = target_close
            wick_up = 14.0 + (idx % 5) * 3.5
            wick_dn = 12.0 + ((idx + 2) % 5) * 3.0
            high_p = max(open_p, close_p) + wick_up
            low_p = min(open_p, close_p) - wick_dn
            volume = 1_25_000.0 + (abs(close_p - open_p) * 2_400.0) + ((idx % 7) * 18_000.0)

            candles.append(
                Candle(
                    timestamp=cur,
                    open=round(open_p, 2),
                    high=round(high_p, 2),
                    low=round(low_p, 2),
                    close=round(close_p, 2),
                    volume=round(volume, 2),
                    oi=1_45_00_000 + idx * 12_500,
                )
            )
            price = close_p
            idx += 1
            cur = cur + timedelta(minutes=step_minutes)

        return candles

    async def stream_ticks(
        self,
        exchange: str,
        symbols: List[str],
    ) -> AsyncIterator[Tick]:
        """Only stream ticks while NSE is open (09:15–15:30 IST, trading days)."""
        symbol = symbols[0] if symbols else "NIFTY 50"
        price = self.BASE_PRICES.get(symbol.upper(), 24350.0)
        step = 0
        while True:
            now_ist = datetime.now(tz=IST)
            if get_nse_session_status(now_ist) != "open":
                # Market closed: stop emitting ticks so previous session candles remain static
                return
            delta = math.sin(step * 0.5) * 4.5
            price = round(price + delta, 2)
            yield Tick(
                timestamp=now_ist,
                price=price,
                volume=1500.0 + (step % 10) * 250.0,
                oi=1_50_00_000,
            )
            step += 1
            await asyncio.sleep(1.0)
