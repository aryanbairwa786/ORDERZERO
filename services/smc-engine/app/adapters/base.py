"""Pluggable broker adapter ABC. Users connect their own broker accounts via OAuth/API key."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import AsyncIterator, List, Optional

from ..core.models import Candle, Tick


class BrokerName(str, Enum):
    DEMO = "demo"
    KITE = "kite"           # Zerodha Kite Connect
    UPSTOX = "upstox"       # Upstox API v2
    ANGELONE = "angelone"   # Angel One SmartAPI
    FYERS = "fyers"         # Fyers API v3
    DHAN = "dhan"           # Dhan HQ


@dataclass(slots=True)
class BrokerCredentials:
    """Decrypted in-memory credentials for a single user's own broker session."""

    broker: BrokerName
    client_id: str
    access_token: str
    api_key: Optional[str] = None


class BrokerAdapter(ABC):
    """Abstract adapter for historical OHLCV (REST) and live ticks (WebSocket)."""

    broker_name: BrokerName

    @abstractmethod
    def get_historical_candles(
        self,
        exchange: str,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: datetime,
    ) -> List[Candle]:
        """Fetch historical OHLCV candles from the user's connected broker."""

    @abstractmethod
    async def stream_ticks(
        self,
        exchange: str,
        symbols: List[str],
    ) -> AsyncIterator[Tick]:
        """Stream live ticks from the user's broker WebSocket feed."""
        yield  # pragma: no cover
