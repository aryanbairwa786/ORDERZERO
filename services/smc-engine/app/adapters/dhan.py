"""DhanHQ API v2 Broker Adapter (REST Historical OHLCV + Binary WebSocket Live Market Feed).

Users supply their own DhanHQ Client ID and Access Token (encrypted at rest under DPDP Act 2023).
OrderZero never redistributes exchange data across accounts.
"""

from __future__ import annotations

import asyncio
import json
import struct
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from ..core.market_hours import IST, to_ist
from ..core.models import Candle, Tick
from .base import BrokerAdapter, BrokerCredentials, BrokerName

DHAN_REST_BASE = "https://api.dhan.co/v2"
DHAN_WS_URL = "wss://api-feed.dhan.co"

# Standard DhanHQ Security IDs and Exchange Segments for major Indian indices
DHAN_INDEX_SECURITY_MAP: Dict[str, Tuple[str, str, str]] = {
    # symbol: (security_id, exchange_segment, instrument)
    "NIFTY 50": ("13", "IDX_I", "INDEX"),
    "BANK NIFTY": ("25", "IDX_I", "INDEX"),
    "FIN NIFTY": ("27", "IDX_I", "INDEX"),
    "MIDCAP NIFTY": ("442", "IDX_I", "INDEX"),
    "SENSEX": ("51", "IDX_I", "INDEX"),
    "BANKEX": ("69", "IDX_I", "INDEX"),
}

# DhanHQ v2 intraday intervals supported natively: 1, 5, 15, 25, 60
DHAN_INTRADAY_INTERVAL_MAP: Dict[str, str] = {
    "1m": "1",
    "3m": "1",   # Resampled from 1m in candle_builder
    "5m": "5",
    "15m": "15",
    "30m": "15", # Resampled from 15m
    "1H": "60",
    "75m": "15", # Resampled from 15m (5 x 15m = 75m NSE bar)
}

# DhanHQ v2 WebSocket Response Packet Header Codes (Little-Endian)
FEED_RESPONSE_TICKER = 2
FEED_RESPONSE_QUOTE = 4
FEED_RESPONSE_FULL = 8


def parse_dhan_binary_packet(packet: bytes) -> Optional[Tick]:
    """Decode a DhanHQ v2 binary WebSocket market feed packet into a Tick.

    DhanHQ v2 Binary Header (8 bytes, little-endian):
      - byte 0: response_code (uint8) -> 2=Ticker, 4=Quote, 8=Full
      - bytes 1..2: message_length (uint16)
      - byte 3: exchange_segment (uint8)
      - bytes 4..7: security_id (uint32)

    Payload immediately following header:
      - Ticker (code 2): ltp (float32, 4B), ltt_epoch (uint32, 4B)
      - Quote  (code 4): ltp (float32), ltq (uint16), ltt_epoch (uint32), atp (float32), volume (uint32)
      - Full   (code 8): ltp (float32), ltq (uint16), ltt_epoch (uint32), atp (float32), volume (uint32),
                         total_sell_qty (uint32), total_buy_qty (uint32), oi (uint32)
    """
    if len(packet) < 16:
        return None

    response_code, _msg_len, _seg, _sec_id = struct.unpack_from("<BHBI", packet, 0)

    if response_code == FEED_RESPONSE_TICKER and len(packet) >= 16:
        ltp, ltt_epoch = struct.unpack_from("<fI", packet, 8)
        ts = datetime.fromtimestamp(ltt_epoch, tz=IST)
        return Tick(timestamp=ts, price=round(float(ltp), 2), volume=0.0, oi=0)

    if response_code == FEED_RESPONSE_QUOTE and len(packet) >= 26:
        ltp, _ltq, ltt_epoch, _atp, volume = struct.unpack_from("<fHIfI", packet, 8)
        ts = datetime.fromtimestamp(ltt_epoch, tz=IST)
        return Tick(timestamp=ts, price=round(float(ltp), 2), volume=float(volume), oi=0)

    if response_code == FEED_RESPONSE_FULL and len(packet) >= 38:
        ltp, _ltq, ltt_epoch, _atp, volume, _tsq, _tbq, oi = struct.unpack_from(
            "<fHIfIIII", packet, 8
        )
        ts = datetime.fromtimestamp(ltt_epoch, tz=IST)
        return Tick(timestamp=ts, price=round(float(ltp), 2), volume=float(volume), oi=int(oi))

    return None


def build_dhan_subscribe_message(
    instruments: List[Tuple[str, str]],
    request_code: int = 15,
) -> str:
    """Build a DhanHQ v2 JSON WebSocket subscription payload.

    request_code: 15 = Subscribe Ticker, 17 = Subscribe Quote, 21 = Subscribe Full.
    """
    return json.dumps(
        {
            "RequestCode": request_code,
            "InstrumentCount": len(instruments),
            "InstrumentList": [
                {"ExchangeSegment": seg, "SecurityId": sec_id}
                for seg, sec_id in instruments
            ],
        }
    )


class DhanHQAdapter(BrokerAdapter):
    """DhanHQ API v2 adapter for Indian equities, indices, and F&O."""

    broker_name = BrokerName.DHAN

    def __init__(self, credentials: BrokerCredentials) -> None:
        if credentials.broker != BrokerName.DHAN:
            raise ValueError("DhanHQAdapter requires BrokerName.DHAN credentials.")
        self.credentials = credentials

    def _headers(self) -> Dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "access-token": self.credentials.access_token,
            "client-id": self.credentials.client_id,
        }

    def resolve_instrument(
        self, exchange: str, symbol: str, security_id: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """Resolve symbol to (security_id, exchange_segment, instrument_type)."""
        upper = symbol.upper().strip()
        if upper in DHAN_INDEX_SECURITY_MAP:
            return DHAN_INDEX_SECURITY_MAP[upper]
        if not security_id:
            raise ValueError(
                f"Security ID required for non-index symbol '{symbol}'. "
                "Provide security_id from DhanHQ scrip master."
            )
        seg = "NSE_EQ" if exchange.upper() == "NSE" else "BSE_EQ"
        return security_id, seg, "EQUITY"

    def get_historical_candles(
        self,
        exchange: str,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: datetime,
        security_id: Optional[str] = None,
    ) -> List[Candle]:
        """Fetch historical OHLCV candles from DhanHQ v2 REST endpoints."""
        sec_id, exchange_segment, instrument = self.resolve_instrument(
            exchange, symbol, security_id=security_id
        )
        start_ist = to_ist(start)
        end_ist = to_ist(end)

        is_daily = timeframe in ("1D", "1W")
        endpoint = f"{DHAN_REST_BASE}/charts/historical" if is_daily else f"{DHAN_REST_BASE}/charts/intraday"

        payload: Dict[str, Any] = {
            "securityId": sec_id,
            "exchangeSegment": exchange_segment,
            "instrument": instrument,
            "fromDate": start_ist.strftime("%Y-%m-%d" if is_daily else "%Y-%m-%d %H:%M:%S"),
            "toDate": end_ist.strftime("%Y-%m-%d" if is_daily else "%Y-%m-%d %H:%M:%S"),
        }
        if not is_daily:
            payload["interval"] = DHAN_INTRADAY_INTERVAL_MAP.get(timeframe, "5")

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=self._headers(),
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"DhanHQ REST error ({exc.code}): {detail}") from exc

        return self.parse_historical_response(body)

    @staticmethod
    def parse_historical_response(body: Dict[str, Any]) -> List[Candle]:
        """Convert DhanHQ v2 columnar OHLCV JSON response into List[Candle]."""
        timestamps = body.get("timestamp", [])
        opens = body.get("open", [])
        highs = body.get("high", [])
        lows = body.get("low", [])
        closes = body.get("close", [])
        volumes = body.get("volume", [])
        ois = body.get("open_interest", [0] * len(timestamps))

        candles: List[Candle] = []
        for idx, ts_val in enumerate(timestamps):
            dt = datetime.fromtimestamp(int(ts_val), tz=IST)
            candles.append(
                Candle(
                    timestamp=dt,
                    open=float(opens[idx]),
                    high=float(highs[idx]),
                    low=float(lows[idx]),
                    close=float(closes[idx]),
                    volume=float(volumes[idx]) if idx < len(volumes) else 0.0,
                    oi=int(ois[idx]) if idx < len(ois) else 0,
                )
            )
        return candles

    async def stream_ticks(
        self,
        exchange: str,
        symbols: List[str],
    ) -> AsyncIterator[Tick]:
        """Stream real-time binary ticks from DhanHQ v2 WebSocket Live Market Feed."""
        try:
            import websockets  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError(
                "Install 'websockets' (`pip install websockets`) to stream live DhanHQ ticks."
            ) from exc

        instruments: List[Tuple[str, str]] = []
        for sym in symbols:
            sec_id, seg, _ = self.resolve_instrument(exchange, sym)
            instruments.append((seg, sec_id))

        ws_url = (
            f"{DHAN_WS_URL}?version=2"
            f"&token={self.credentials.access_token}"
            f"&clientId={self.credentials.client_id}"
            f"&authType=2"
        )
        async with websockets.connect(ws_url, ping_interval=20, ping_timeout=20) as ws:
            await ws.send(build_dhan_subscribe_message(instruments, request_code=17))
            while True:
                raw = await ws.recv()
                if isinstance(raw, (bytes, bytearray)):
                    tick = parse_dhan_binary_packet(bytes(raw))
                    if tick is not None:
                        yield tick
                await asyncio.sleep(0)
