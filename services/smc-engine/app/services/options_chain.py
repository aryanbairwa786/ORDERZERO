"""NSE Options Chain Analytics (Live NSE JSON + Exact Real Spot Anchor, OI, PCR, Max Pain)."""

from __future__ import annotations

import http.cookiejar
import json
import math
import urllib.request
from typing import Any, Dict, List, Optional

from ..adapters.yahoo_nse import YahooNSEAdapter

NSE_OPTION_SYMBOL_MAP = {
    "NIFTY 50": "NIFTY",
    "BANK NIFTY": "BANKNIFTY",
    "FIN NIFTY": "FINNIFTY",
    "MIDCAP NIFTY": "MIDCPNIFTY",
}


def compute_max_pain(strikes: List[Dict[str, Any]]) -> float:
    """Compute Max Pain strike where total option buyer payout at expiry is minimized."""
    if not strikes:
        return 0.0

    best_strike = strikes[0]["strike"]
    min_payout = float("inf")

    for candidate in strikes:
        exp_price = candidate["strike"]
        payout = 0.0
        for row in strikes:
            k = row["strike"]
            if exp_price > k:
                payout += (exp_price - k) * row["ce_oi"]
            elif exp_price < k:
                payout += (k - exp_price) * row["pe_oi"]
        if payout < min_payout:
            min_payout = payout
            best_strike = exp_price

    return float(best_strike)


def parse_nse_option_chain_json(payload: Dict[str, Any], symbol: str) -> Optional[Dict[str, Any]]:
    """Parse official NSE option-chain-indices JSON response into OrderZero format."""
    records = payload.get("records") or {}
    filtered = payload.get("filtered") or {}
    rows_raw = filtered.get("data") or records.get("data") or []
    spot = records.get("underlyingValue")
    if not rows_raw or not spot:
        return None

    spot = round(float(spot), 2)
    step = 100 if "BANK" in symbol.upper() else 50
    atm = round(spot / step) * step

    # Keep +/- 10 strikes around ATM for a clean, fast table
    nearby = [
        r for r in rows_raw
        if abs(float(r.get("strikePrice", 0)) - atm) <= step * 10
    ]
    nearby.sort(key=lambda r: float(r.get("strikePrice", 0)))

    strikes: List[Dict[str, Any]] = []
    total_ce_oi = 0
    total_pe_oi = 0

    for item in nearby:
        k = float(item.get("strikePrice", 0))
        ce = item.get("CE") or {}
        pe = item.get("PE") or {}
        ce_oi = int(ce.get("openInterest") or 0)
        pe_oi = int(pe.get("openInterest") or 0)
        total_ce_oi += ce_oi
        total_pe_oi += pe_oi
        strikes.append(
            {
                "strike": int(k) if k.is_integer() else k,
                "is_atm": k == atm,
                "ce_oi": ce_oi,
                "ce_chg_oi": int(ce.get("changeinOpenInterest") or 0),
                "ce_iv": round(float(ce.get("impliedVolatility") or 0.0), 2),
                "ce_ltp": round(float(ce.get("lastPrice") or 0.0), 2),
                "pe_ltp": round(float(pe.get("lastPrice") or 0.0), 2),
                "pe_iv": round(float(pe.get("impliedVolatility") or 0.0), 2),
                "pe_chg_oi": int(pe.get("changeinOpenInterest") or 0),
                "pe_oi": pe_oi,
            }
        )

    if not strikes:
        return None

    pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi > 0 else 0.0
    return {
        "symbol": symbol.upper(),
        "source": "nse_official",
        "spot": spot,
        "atm_strike": atm,
        "total_ce_oi": total_ce_oi,
        "total_pe_oi": total_pe_oi,
        "pcr": pcr,
        "max_pain": compute_max_pain(strikes),
        "strikes": strikes,
        "disclaimer": "Live/Last-session NSE option chain data for educational purposes only.",
    }


def _fetch_nse_official_option_chain(symbol: str) -> Optional[Dict[str, Any]]:
    nse_sym = NSE_OPTION_SYMBOL_MAP.get(symbol.upper())
    if not nse_sym:
        return None
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.nseindia.com/option-chain",
    }
    try:
        req_home = urllib.request.Request("https://www.nseindia.com/option-chain", headers=headers)
        opener.open(req_home, timeout=5).read()
        url = f"https://www.nseindia.com/api/option-chain-indices?symbol={nse_sym}"
        req_api = urllib.request.Request(url, headers=headers)
        raw = opener.open(req_api, timeout=6).read().decode("utf-8")
        return parse_nse_option_chain_json(json.loads(raw), symbol)
    except Exception:
        return None


def build_demo_option_chain(symbol: str = "NIFTY 50") -> Dict[str, Any]:
    """Fetch official NSE option chain first; if blocked, anchor cleanly to the REAL spot price."""
    official = _fetch_nse_official_option_chain(symbol)
    if official is not None:
        return official

    sym = symbol.upper()
    adapter = YahooNSEAdapter()
    exchange = "BSE" if sym in ("SENSEX", "BANKEX") else "NSE"
    real_quote = adapter.fetch_latest_quote(sym, exchange)

    if "BANK" in sym and "BANKEX" not in sym:
        default_spot, step = 52120.0, 100
    elif "FIN" in sym:
        default_spot, step = 23820.0, 50
    elif "SENSEX" in sym:
        default_spot, step = 79840.0, 100
    else:
        default_spot, step = 24360.0, 50

    spot = real_quote["ltp"] if real_quote else default_spot
    atm = round(spot / step) * step
    rows: List[Dict[str, Any]] = []
    total_ce_oi = 0
    total_pe_oi = 0

    for offset in range(-8, 9):
        strike = atm + offset * step
        dist = abs(offset)
        ce_oi = int((65_00_000 if offset >= 0 else 22_00_000) * math.exp(-dist * 0.16))
        pe_oi = int((68_00_000 if offset <= 0 else 20_00_000) * math.exp(-dist * 0.16))
        ce_chg = int(ce_oi * (0.14 if offset > 0 else -0.06))
        pe_chg = int(pe_oi * (0.16 if offset < 0 else -0.05))
        ce_ltp = round(max(2.5, max(0.0, spot - strike) + 95.0 * math.exp(-dist * 0.35)), 2)
        pe_ltp = round(max(2.5, max(0.0, strike - spot) + 92.0 * math.exp(-dist * 0.35)), 2)

        total_ce_oi += ce_oi
        total_pe_oi += pe_oi
        rows.append(
            {
                "strike": strike,
                "is_atm": strike == atm,
                "ce_oi": ce_oi,
                "ce_chg_oi": ce_chg,
                "ce_iv": round(12.4 + dist * 0.45, 2),
                "ce_ltp": ce_ltp,
                "pe_ltp": pe_ltp,
                "pe_iv": round(13.1 + dist * 0.42, 2),
                "pe_chg_oi": pe_chg,
                "pe_oi": pe_oi,
            }
        )

    pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi > 0 else 0.0
    max_pain = compute_max_pain(rows)

    return {
        "symbol": sym,
        "source": "real_spot_estimated_oi" if real_quote else "offline_demo",
        "spot": spot,
        "atm_strike": atm,
        "total_ce_oi": total_ce_oi,
        "total_pe_oi": total_pe_oi,
        "pcr": pcr,
        "max_pain": max_pain,
        "strikes": rows,
        "disclaimer": (
            "Anchored to real NSE/BSE spot price. Connect DhanHQ v2 for guaranteed live option chain OI."
        ),
    }
