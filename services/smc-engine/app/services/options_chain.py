"""Pure helpers for caller-supplied options snapshots.

This module makes no network requests and does not estimate missing options values.
The public endpoint remains unavailable until an authorized provider is configured.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def compute_max_pain(strikes: List[Dict[str, Any]]) -> float:
    """Compute the strike with the lowest aggregate option buyer payout."""
    if not strikes:
        return 0.0

    best_strike = float(strikes[0]["strike"])
    min_payout = float("inf")
    for candidate in strikes:
        expiry_price = float(candidate["strike"])
        payout = 0.0
        for row in strikes:
            strike = float(row["strike"])
            if expiry_price > strike:
                payout += (expiry_price - strike) * float(row.get("ce_oi", 0))
            elif expiry_price < strike:
                payout += (strike - expiry_price) * float(row.get("pe_oi", 0))
        if payout < min_payout:
            min_payout = payout
            best_strike = expiry_price
    return best_strike


def parse_nse_option_chain_json(
    payload: Dict[str, Any], symbol: str
) -> Optional[Dict[str, Any]]:
    """Parse a caller-provided NSE-shaped snapshot without fetching or filling data."""
    records = payload.get("records") or {}
    filtered = payload.get("filtered") or {}
    rows_raw = filtered.get("data") or records.get("data") or []
    spot_value = records.get("underlyingValue")
    if not rows_raw or not spot_value:
        return None

    spot = round(float(spot_value), 2)
    step = 100 if "BANK" in symbol.upper() else 50
    atm = round(spot / step) * step
    nearby = [
        row for row in rows_raw
        if abs(float(row.get("strikePrice", 0)) - atm) <= step * 10
    ]
    nearby.sort(key=lambda row: float(row.get("strikePrice", 0)))

    strikes: List[Dict[str, Any]] = []
    total_ce_oi = 0
    total_pe_oi = 0
    for item in nearby:
        strike = float(item.get("strikePrice", 0))
        call = item.get("CE") or {}
        put = item.get("PE") or {}
        ce_oi = int(call.get("openInterest") or 0)
        pe_oi = int(put.get("openInterest") or 0)
        total_ce_oi += ce_oi
        total_pe_oi += pe_oi
        strikes.append({
            "strike": int(strike) if strike.is_integer() else strike,
            "is_atm": strike == atm,
            "ce_oi": ce_oi,
            "ce_chg_oi": int(call.get("changeinOpenInterest") or 0),
            "ce_iv": round(float(call.get("impliedVolatility") or 0.0), 2),
            "ce_ltp": round(float(call.get("lastPrice") or 0.0), 2),
            "pe_ltp": round(float(put.get("lastPrice") or 0.0), 2),
            "pe_iv": round(float(put.get("impliedVolatility") or 0.0), 2),
            "pe_chg_oi": int(put.get("changeinOpenInterest") or 0),
            "pe_oi": pe_oi,
        })

    if not strikes:
        return None
    pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi else 0.0
    return {
        "symbol": symbol.upper(),
        "source": "provided_snapshot",
        "spot": spot,
        "atm_strike": atm,
        "total_ce_oi": total_ce_oi,
        "total_pe_oi": total_pe_oi,
        "pcr": pcr,
        "max_pain": compute_max_pain(strikes),
        "strikes": strikes,
        "disclaimer": "Parsed only from the options snapshot supplied by the caller.",
    }
