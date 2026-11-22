"""Real-time NIFTY 500 / NSE F&O SMC Screener Service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from ..adapters.yahoo_nse import YahooNSEAdapter
from ..core.engine import SMCEngine
from ..core.market_hours import IST
from ..core.models import Direction, OrderBlockState, SMCConfig


@dataclass(frozen=True)
class InstrumentMeta:
    symbol: str
    exchange: str
    sector: str
    market_cap: str  # Large, Mid, Small
    is_fno: bool
    base_price: float


# Representative NSE F&O & NIFTY 500 universe (extensible via DB/CSV scrip master)
NSE_UNIVERSE: List[InstrumentMeta] = [
    InstrumentMeta("NIFTY 50", "NSE", "Index", "Large", True, 24350.0),
    InstrumentMeta("BANK NIFTY", "NSE", "Banking", "Large", True, 52100.0),
    InstrumentMeta("RELIANCE", "NSE", "Energy", "Large", True, 1295.0),
    InstrumentMeta("HDFCBANK", "NSE", "Banking", "Large", True, 1745.0),
    InstrumentMeta("ICICIBANK", "NSE", "Banking", "Large", True, 1285.0),
    InstrumentMeta("TCS", "NSE", "IT", "Large", True, 4120.0),
    InstrumentMeta("INFY", "NSE", "IT", "Large", True, 1865.0),
    InstrumentMeta("SBIN", "NSE", "Banking", "Large", True, 825.0),
    InstrumentMeta("BHARTIARTL", "NSE", "Telecom", "Large", True, 1640.0),
    InstrumentMeta("LT", "NSE", "Infra", "Large", True, 3580.0),
    InstrumentMeta("TATAMOTORS", "NSE", "Auto", "Large", True, 885.0),
    InstrumentMeta("M&M", "NSE", "Auto", "Large", True, 2940.0),
    InstrumentMeta("SUNPHARMA", "NSE", "Pharma", "Large", True, 1820.0),
    InstrumentMeta("ITC", "NSE", "FMCG", "Large", True, 478.0),
    InstrumentMeta("BAJFINANCE", "NSE", "NBFC", "Large", True, 6920.0),
    InstrumentMeta("TRENT", "NSE", "Retail", "Large", True, 6780.0),
    InstrumentMeta("PERSISTENT", "NSE", "IT", "Mid", True, 5640.0),
    InstrumentMeta("DIXON", "NSE", "Electronics", "Mid", True, 14850.0),
    InstrumentMeta("COFORGE", "NSE", "IT", "Mid", True, 8120.0),
    InstrumentMeta("FEDERALBNK", "NSE", "Banking", "Mid", True, 204.0),
    InstrumentMeta("CDSL", "NSE", "Capital Markets", "Mid", True, 1590.0),
    InstrumentMeta("KPITTECH", "NSE", "IT", "Mid", False, 1420.0),
]


def run_smc_scan(
    timeframe: str = "15m",
    sector: Optional[str] = None,
    market_cap: Optional[str] = None,
    fno_only: bool = False,
    min_strength: float = 0.0,
    approach_pct: float = 1.5,
    signal_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Scan NSE instruments for active Order Blocks, BOS/CHoCH, FVGs, and Liquidity Sweeps."""
    adapter = YahooNSEAdapter()
    engine = SMCEngine()
    end = datetime.now(tz=IST)
    start = end - timedelta(days=5)

    results: List[Dict[str, Any]] = []
    for meta in NSE_UNIVERSE:
        if sector and sector != "All" and meta.sector.lower() != sector.lower():
            continue
        if market_cap and market_cap != "All" and meta.market_cap.lower() != market_cap.lower():
            continue
        if fno_only and not meta.is_fno:
            continue

        # Temporarily register base price for realistic symbol scaling in Demo Mode
        candles, qmeta, _ = adapter.fetch_candles_with_meta(meta.symbol, meta.exchange, timeframe)
        if len(candles) < 20:
            continue

        analysis = engine.analyze(
            candles=candles,
            symbol=meta.symbol,
            exchange=meta.exchange,
            timeframe=timeframe,
            config=SMCConfig(internal_swing_length=4, swing_length=20, displacement_atr_mult=1.2),
        )

        ltp = qmeta["ltp"] if qmeta.get("ltp") else candles[-1].close
        chg_pct = qmeta["change_pct"]
        avg_vol = sum(c.volume for c in candles[-20:]) / 20.0

        fresh_obs = [ob for ob in analysis.order_blocks if ob.state == OrderBlockState.FRESH]
        nearest_ob = None
        min_dist_pct = 999.0
        inside_ob = False

        for ob in fresh_obs:
            if ob.bottom <= ltp <= ob.top:
                inside_ob = True
                nearest_ob = ob
                min_dist_pct = 0.0
                break
            dist = min(abs(ltp - ob.top), abs(ltp - ob.bottom))
            dist_pct = (dist / ltp) * 100.0 if ltp > 0 else 999.0
            if dist_pct < min_dist_pct:
                min_dist_pct = dist_pct
                nearest_ob = ob

        strength = nearest_ob.strength_score if nearest_ob else 0.0
        if strength < min_strength:
            continue

        recent_break = (
            analysis.structure_breaks[-1]
            if analysis.structure_breaks
            and (len(candles) - 1 - analysis.structure_breaks[-1].break_index) <= 12
            else None
        )
        unfilled_fvgs = len([g for g in analysis.fair_value_gaps if not g.is_filled])
        recent_sweep = len(analysis.liquidity_sweeps) > 0

        signals: List[str] = []
        if inside_ob and nearest_ob:
            signals.append(f"Inside {nearest_ob.direction.value.title()} OB")
        elif nearest_ob and min_dist_pct <= approach_pct:
            signals.append(f"Approaching {nearest_ob.direction.value.title()} OB")
        if recent_break:
            signals.append(f"Fresh {recent_break.break_type.value} ({recent_break.direction.value})")
        if unfilled_fvgs > 0:
            signals.append(f"{unfilled_fvgs} Unfilled FVG")
        if recent_sweep:
            signals.append("Liquidity Sweep")

        if signal_filter and signal_filter != "All":
            joined = " ".join(signals).lower()
            if signal_filter.lower() not in joined:
                continue

        sparkline = [round(c.close, 2) for c in candles[-18:]]
        results.append(
            {
                "symbol": meta.symbol,
                "exchange": meta.exchange,
                "sector": meta.sector,
                "market_cap": meta.market_cap,
                "is_fno": meta.is_fno,
                "timeframe": timeframe,
                "ltp": round(ltp, 2),
                "change_pct": round(chg_pct, 2),
                "volume": round(avg_vol, 0),
                "trend": analysis.internal_trend.value,
                "nearest_ob_direction": nearest_ob.direction.value if nearest_ob else Direction.NEUTRAL.value,
                "nearest_ob_zone": (
                    f"{nearest_ob.bottom:.2f} - {nearest_ob.top:.2f}" if nearest_ob else None
                ),
                "distance_to_ob_pct": round(min_dist_pct, 2) if nearest_ob else None,
                "ob_strength": round(strength, 1),
                "unfilled_fvgs": unfilled_fvgs,
                "signals": signals,
                "sparkline": sparkline,
            }
        )

    results.sort(key=lambda r: (r["ob_strength"], -(r["distance_to_ob_pct"] or 999)), reverse=True)
    return results
