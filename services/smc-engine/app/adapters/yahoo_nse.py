"""Unofficial Yahoo Finance adapter with clearly marked generated fallback candles.

Yahoo Finance is not an exchange-authorized NSE/BSE feed. Values can be delayed,
incomplete, rate-limited, unavailable, or differ from official exchange data.
"""

from __future__ import annotations

import asyncio
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from ..core.candle_builder import align_bucket_start
from ..core.market_hours import IST, get_nse_session_status
from ..core.models import Candle, Tick
from .demo import DemoBrokerAdapter

YAHOO_SYMBOL_MAP: Dict[str, str] = {
    "NIFTY 50": "^NSEI",
    "BANK NIFTY": "^NSEBANK",
    "FIN NIFTY": "NIFTY_FIN_SERVICE.NS",
    "MIDCAP NIFTY": "^NSEMDCP50",
    "SENSEX": "^BSESN",
    "BANKEX": "^BSEBANK",
    "INDIA VIX": "^INDIAVIX",
}

NSE_SECTOR_TICKERS: Dict[str, str] = {
    "Banking": "^NSEBANK",
    "IT": "^CNXIT",
    "Auto": "^CNXAUTO",
    "Pharma": "^CNXPHARMA",
    "Energy": "^CNXENERGY",
    "FMCG": "^CNXFMCG",
    "Infra": "^CNXINFRA",
    "Metals": "^CNXMETAL",
}

# Map OrderZero timeframe -> (yahoo_interval, yahoo_range, needs_resample)
YAHOO_INTERVAL_MAP: Dict[str, Tuple[str, str, bool]] = {
    "1m": ("1m", "5d", False),
    "3m": ("1m", "5d", True),
    "5m": ("5m", "5d", False),
    "15m": ("15m", "1mo", False),
    "30m": ("30m", "1mo", False),
    "1H": ("60m", "1mo", False),
    "75m": ("15m", "1mo", True),
    "1D": ("1d", "6mo", False),
    "1W": ("1wk", "2y", False),
}


def to_yahoo_ticker(symbol: str, exchange: str = "NSE") -> str:
    """Convert an Indian market symbol (e.g. 'NIFTY 50', 'RELIANCE') to a Yahoo Finance ticker."""
    clean = symbol.upper().strip()
    if clean in YAHOO_SYMBOL_MAP:
        return YAHOO_SYMBOL_MAP[clean]
    if clean.endswith(".NS") or clean.endswith(".BO") or clean.startswith("^"):
        return clean
    suffix = ".BO" if exchange.upper() == "BSE" else ".NS"
    return f"{clean}{suffix}"


def resample_candles(candles: List[Candle], timeframe: str) -> List[Candle]:
    """Resample finer candles (e.g. 15m -> 75m or 1m -> 3m) anchored to NSE 09:15 IST."""
    buckets: Dict[datetime, Candle] = {}
    for c in candles:
        b_ts = align_bucket_start(c.timestamp, timeframe)
        existing = buckets.get(b_ts)
        if existing is None:
            buckets[b_ts] = Candle(
                timestamp=b_ts,
                open=c.open,
                high=c.high,
                low=c.low,
                close=c.close,
                volume=c.volume,
                oi=c.oi,
            )
        else:
            existing.high = max(existing.high, c.high)
            existing.low = min(existing.low, c.low)
            existing.close = c.close
            existing.volume += c.volume
            if c.oi:
                existing.oi = c.oi
    return [buckets[k] for k in sorted(buckets.keys())]


class YahooNSEAdapter:
    """Fetch unofficial Yahoo Finance candles and quotes with IST session awareness."""

    def __init__(self, cache_ttl_seconds: int = 15) -> None:
        self._cache: Dict[Tuple[str, str], Tuple[datetime, List[Candle], Dict[str, Any]]] = {}
        self._cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self._fallback = DemoBrokerAdapter()

    @staticmethod
    def parse_yahoo_chart_response(payload: Dict[str, Any]) -> List[Candle]:
        """Parse Yahoo Finance v8/finance/chart JSON into IST-aware Candle objects."""
        chart = payload.get("chart", {})
        results = chart.get("result") or []
        if not results:
            return []

        res = results[0]
        timestamps = res.get("timestamp") or []
        quotes = (res.get("indicators", {}).get("quote") or [{}])[0]
        opens = quotes.get("open") or []
        highs = quotes.get("high") or []
        lows = quotes.get("low") or []
        closes = quotes.get("close") or []
        volumes = quotes.get("volume") or []

        candles: List[Candle] = []
        for i, ts in enumerate(timestamps):
            if i >= len(opens) or i >= len(closes):
                continue
            o, h, l, c = opens[i], highs[i], lows[i], closes[i]
            if o is None or h is None or l is None or c is None:
                continue
            v = volumes[i] if i < len(volumes) and volumes[i] is not None else 0.0
            dt_ist = datetime.fromtimestamp(int(ts), tz=IST)
            candles.append(
                Candle(
                    timestamp=dt_ist,
                    open=round(float(o), 2),
                    high=round(float(h), 2),
                    low=round(float(l), 2),
                    close=round(float(c), 2),
                    volume=float(v),
                    oi=0,
                )
            )
        return candles

    @staticmethod
    def extract_quote_meta(payload: Dict[str, Any], candles: List[Candle]) -> Dict[str, Any]:
        """Extract quote fields from Yahoo Finance response metadata when available."""
        results = (payload.get("chart") or {}).get("result") or []
        meta = results[0].get("meta", {}) if results else {}

        ltp = meta.get("regularMarketPrice")
        if ltp is None and candles:
            ltp = candles[-1].close
        ltp = round(float(ltp), 2) if ltp is not None else 0.0

        prev_close = meta.get("previousClose") or meta.get("chartPreviousClose")
        if prev_close is None and len(candles) >= 2:
            # Find the last candle from the previous trading date
            last_day = candles[-1].timestamp.date()
            prev_day_bars = [c for c in candles if c.timestamp.date() < last_day]
            prev_close = prev_day_bars[-1].close if prev_day_bars else candles[0].open
        prev_close = round(float(prev_close), 2) if prev_close else ltp

        chg_pct = ((ltp - prev_close) / prev_close) * 100.0 if prev_close > 0 else 0.0
        return {
            "ltp": ltp,
            "previous_close": prev_close,
            "change_pct": round(chg_pct, 2),
        }

    def _http_get_yahoo(self, ticker: str, interval: str, rng: str) -> Dict[str, Any]:
        encoded = urllib.parse.quote(ticker, safe="")
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
            f"?interval={interval}&range={rng}&includePrePost=false"
        )
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OrderZero/2.0",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def fetch_candles_with_meta(
        self,
        symbol: str,
        exchange: str = "NSE",
        timeframe: str = "5m",
    ) -> Tuple[List[Candle], Dict[str, Any], str]:
        """Return candles, quote metadata, and an unofficial or demo source label."""
        key = (symbol.upper().strip(), timeframe)
        now = datetime.now(tz=IST)
        # Shorter cache during live market hours (10s), longer when closed (120s)
        ttl = timedelta(seconds=10) if get_nse_session_status(now) == "open" else timedelta(seconds=120)
        cached = self._cache.get(key)
        if cached and (now - cached[0]) < ttl:
            return cached[1], cached[2], "yahoo_finance_unofficial"

        ticker = to_yahoo_ticker(symbol, exchange)
        interval, rng, needs_resample = YAHOO_INTERVAL_MAP.get(timeframe, ("5m", "5d", False))

        try:
            payload = self._http_get_yahoo(ticker, interval, rng)
            candles = self.parse_yahoo_chart_response(payload)
            if needs_resample and candles:
                candles = resample_candles(candles, timeframe)
            if len(candles) >= 5:
                meta = self.extract_quote_meta(payload, candles)
                self._cache[key] = (now, candles, meta)
                return candles, meta, "yahoo_finance_unofficial"
        except Exception:
            pass

        # Offline fallback only if the machine has no internet access
        fallback_candles = self._fallback.get_historical_candles(
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            start=now - timedelta(days=5),
            end=now,
        )
        last = fallback_candles[-1].close if fallback_candles else 0.0
        first = fallback_candles[0].open if fallback_candles else last
        meta = {
            "ltp": round(last, 2),
            "previous_close": round(first, 2),
            "change_pct": round(((last - first) / first) * 100.0, 2) if first > 0 else 0.0,
        }
        return fallback_candles, meta, "offline_demo"

    def fetch_candles(
        self,
        symbol: str,
        exchange: str = "NSE",
        timeframe: str = "5m",
    ) -> Tuple[List[Candle], str]:
        candles, _meta, source = self.fetch_candles_with_meta(symbol, exchange, timeframe)
        return candles, source

    def fetch_latest_quote(self, symbol: str, exchange: str = "NSE") -> Optional[Dict[str, Any]]:
        """Fetch an unofficial Yahoo Finance quote; it may be delayed or unavailable."""
        ticker = to_yahoo_ticker(symbol, exchange)
        try:
            payload = self._http_get_yahoo(ticker, "1d", "5d")
            candles = self.parse_yahoo_chart_response(payload)
            meta = self.extract_quote_meta(payload, candles)
            if meta["ltp"] > 0:
                return {
                    "symbol": symbol,
                    "ltp": meta["ltp"],
                    "previous_close": meta["previous_close"],
                    "change_pct": meta["change_pct"],
                }
        except Exception:
            return None
        return None

    def fetch_sector_heatmap(self) -> List[Dict[str, Any]]:
        """Fetch unofficial Yahoo Finance sector-index changes when available."""
        heatmap: List[Dict[str, Any]] = []
        for sector_name, ticker in NSE_SECTOR_TICKERS.items():
            quote = self.fetch_latest_quote(ticker, "NSE")
            if quote is not None:
                heatmap.append({"sector": sector_name, "change_pct": quote["change_pct"]})
        return heatmap

    async def stream_live_quotes(
        self,
        symbol: str,
        exchange: str = "NSE",
        poll_seconds: float = 3.0,
    ) -> AsyncIterator[Tick]:
        """Poll unofficial Yahoo Finance prices; this is not an exchange tick stream."""
        ticker = to_yahoo_ticker(symbol, exchange)
        loop = asyncio.get_running_loop()
        while True:
            now_ist = datetime.now(tz=IST)
            if get_nse_session_status(now_ist) != "open":
                return
            try:
                payload = await loop.run_in_executor(
                    None, self._http_get_yahoo, ticker, "1m", "1d"
                )
                candles = self.parse_yahoo_chart_response(payload)
                meta = self.extract_quote_meta(payload, candles)
                if meta["ltp"] > 0:
                    vol = candles[-1].volume if candles else 0.0
                    yield Tick(
                        timestamp=now_ist,
                        price=meta["ltp"],
                        volume=vol,
                        oi=0,
                    )
            except Exception:
                pass
            await asyncio.sleep(poll_seconds)
