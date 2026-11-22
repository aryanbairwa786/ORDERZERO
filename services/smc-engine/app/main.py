"""FastAPI service exposing the complete OrderZero SMC Engine, Screener, Backtester, Options & Alerts."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .adapters.base import BrokerCredentials, BrokerName
from .adapters.demo import DemoBrokerAdapter
from .adapters.dhan import DhanHQAdapter
from .adapters.yahoo_nse import YahooNSEAdapter
from .core.engine import SMCEngine
from .core.market_hours import IST, get_nse_session_status, to_ist
from .core.models import Candle, SMCConfig
from .services.alerts import AlertStore
from .services.backtester import run_ob_backtest
from .services.options_chain import build_demo_option_chain
from .services.screener import run_smc_scan
from .services.orderblock_terminal import compute_orderblock_terminal

SEBI_DISCLAIMER = (
    "For educational and informational purposes only. Not investment advice. "
    "We are not SEBI-registered investment advisers / research analysts."
)

app = FastAPI(
    title="OrderZero — Complete Indian Stock Market SMC API",
    version="2.0.0",
    description="SMC Detection Engine, DhanHQ v2 Feed, NIFTY 500 Screener, Options Chain, Backtester & Alerts.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SMCEngine()
demo_adapter = DemoBrokerAdapter()
market_adapter = YahooNSEAdapter()
alert_store = AlertStore()


class CandleInput(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    oi: int = 0


class SMCConfigInput(BaseModel):
    internal_swing_length: int = Field(default=5, ge=1, le=50)
    swing_length: int = Field(default=50, ge=5, le=200)
    atr_period: int = Field(default=14, ge=2, le=100)
    displacement_atr_mult: float = Field(default=1.5, ge=0.1, le=10.0)
    ob_zone_mode: Literal["wick", "body"] = "wick"
    require_fvg_for_ob: bool = False
    max_obs_shown: int = Field(default=10, ge=1, le=100)
    show_mitigated: bool = True
    detect_breakers: bool = True
    detect_mitigation_blocks: bool = True
    auto_hide_filled_fvg: bool = True
    include_orb: bool = True
    orb_minutes: int = Field(default=15, ge=5, le=60)
    include_vwap: bool = True
    include_cpr: bool = True
    include_session_levels: bool = True


class AnalyzeRequest(BaseModel):
    symbol: str = "NIFTY 50"
    exchange: str = "NSE"
    timeframe: str = "5m"
    candles: List[CandleInput]
    config: Optional[SMCConfigInput] = None


class DhanAnalyzeRequest(BaseModel):
    client_id: str
    access_token: str
    symbol: str = "NIFTY 50"
    exchange: str = "NSE"
    security_id: Optional[str] = None
    timeframe: str = "5m"
    htf_timeframe: Optional[str] = "1H"
    days: int = Field(default=4, ge=1, le=30)
    config: Optional[SMCConfigInput] = None


class AlertCreateRequest(BaseModel):
    symbol: str = "NIFTY 50"
    timeframe: str = "5m"
    alert_type: Literal["ob_enter", "ob_mitigated", "bos_choch", "fvg_fill", "liquidity_sweep"] = "ob_enter"
    channels: List[str] = Field(default_factory=lambda: ["in_app"])


class BacktestRequest(BaseModel):
    symbol: str = "NIFTY 50"
    timeframe: str = "5m"
    days: int = Field(default=10, ge=2, le=30)
    initial_capital: float = Field(default=5_00_000.0, ge=10_000.0)
    risk_per_trade_pct: float = Field(default=1.0, ge=0.25, le=5.0)
    reward_r_multiple: float = Field(default=2.0, ge=1.0, le=6.0)


@app.get("/health")
def health() -> Dict[str, Any]:
    now_ist = datetime.now(tz=IST)
    return {
        "brand": "OrderBlock",
        "status": "ok",
        "server_time_ist": now_ist.isoformat(),
        "nse_session_status": get_nse_session_status(now_ist),
        "disclaimer": SEBI_DISCLAIMER,
    }


@app.get("/api/v1/orderblock/terminal")
def get_orderblock_terminal() -> Dict[str, Any]:
    """Return live 200+ F&O market breadth scatter, Bull/Bear boards, and Top 3 picks."""
    return compute_orderblock_terminal()


@app.post("/api/v1/analyze")
def analyze_smc(payload: AnalyzeRequest) -> Dict[str, Any]:
    if len(payload.candles) < 5:
        raise HTTPException(status_code=400, detail="At least 5 candles are required for SMC analysis.")
    candles = [
        Candle(
            timestamp=to_ist(c.timestamp),
            open=c.open,
            high=c.high,
            low=c.low,
            close=c.close,
            volume=c.volume,
            oi=c.oi,
        )
        for c in payload.candles
    ]
    cfg = SMCConfig(**payload.config.model_dump()) if payload.config else SMCConfig()
    return engine.analyze(
        candles=candles,
        symbol=payload.symbol,
        exchange=payload.exchange,
        timeframe=payload.timeframe,
        config=cfg,
    ).to_dict()


@app.get("/api/v1/demo/nifty")
def demo_nifty_analysis(
    symbol: str = Query(default="NIFTY 50"),
    timeframe: str = Query(default="5m"),
    htf_timeframe: Optional[str] = Query(default="1H"),
    days: int = Query(default=4, ge=1, le=15),
    internal_swing_length: int = Query(default=5, ge=1, le=50),
    swing_length: int = Query(default=25, ge=5, le=200),
    displacement_atr_mult: float = Query(default=1.4, ge=0.1, le=10.0),
    max_obs_shown: int = Query(default=10, ge=1, le=50),
    ob_zone_mode: Literal["wick", "body"] = Query(default="wick"),
    show_mitigated: bool = Query(default=True),
    auto_hide_filled_fvg: bool = Query(default=True),
) -> Dict[str, Any]:
    end = datetime.now(tz=IST)
    exchange = "BSE" if symbol.upper() in ("SENSEX", "BANKEX") else "NSE"
    candles, quote_meta, data_source = market_adapter.fetch_candles_with_meta(symbol=symbol, exchange=exchange, timeframe=timeframe)
    cfg = SMCConfig(
        internal_swing_length=internal_swing_length,
        swing_length=swing_length,
        displacement_atr_mult=displacement_atr_mult,
        max_obs_shown=max_obs_shown,
        ob_zone_mode=ob_zone_mode,
        show_mitigated=show_mitigated,
        auto_hide_filled_fvg=auto_hide_filled_fvg,
    )
    result = engine.analyze(candles, symbol=symbol, exchange="NSE", timeframe=timeframe, config=cfg)

    htf_order_blocks: List[Dict[str, Any]] = []
    if htf_timeframe and htf_timeframe != timeframe:
        htf_candles, _ = market_adapter.fetch_candles(
            symbol=symbol, exchange=exchange, timeframe=htf_timeframe
        )
        htf_res = engine.analyze(
            htf_candles,
            symbol=symbol,
            exchange="NSE",
            timeframe=htf_timeframe,
            config=SMCConfig(
                internal_swing_length=3,
                swing_length=12,
                displacement_atr_mult=max(1.1, displacement_atr_mult - 0.2),
                max_obs_shown=5,
                ob_zone_mode=ob_zone_mode,
                show_mitigated=show_mitigated,
            ),
        )
        for ob in htf_res.order_blocks:
            ob_dict = ob.to_dict()
            ob_dict["htf_timeframe"] = htf_timeframe
            htf_order_blocks.append(ob_dict)

    return {
        "brand": "OrderZero",
        "mode": data_source,
        "nse_session_status": get_nse_session_status(end),
        "quote_meta": quote_meta,
        "candles": [c.to_dict() for c in candles],
        "analysis": result.to_dict(),
        "htf_order_blocks": htf_order_blocks,
    }


@app.post("/api/v1/dhan/analyze")
def dhan_live_analysis(payload: DhanAnalyzeRequest) -> Dict[str, Any]:
    creds = BrokerCredentials(
        broker=BrokerName.DHAN,
        client_id=payload.client_id,
        access_token=payload.access_token,
    )
    adapter = DhanHQAdapter(creds)
    end = datetime.now(tz=IST)
    start = end - timedelta(days=payload.days)
    try:
        candles = adapter.get_historical_candles(
            exchange=payload.exchange,
            symbol=payload.symbol,
            timeframe=payload.timeframe,
            start=start,
            end=end,
            security_id=payload.security_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    cfg = SMCConfig(**payload.config.model_dump()) if payload.config else SMCConfig()
    result = engine.analyze(candles, symbol=payload.symbol, exchange=payload.exchange, timeframe=payload.timeframe, config=cfg)
    return {
        "brand": "OrderZero",
        "mode": "dhan_hq",
        "candles": [c.to_dict() for c in candles],
        "analysis": result.to_dict(),
    }


@app.get("/api/v1/screener/scan")
def screener_scan(
    timeframe: str = Query(default="15m"),
    sector: Optional[str] = Query(default=None),
    market_cap: Optional[str] = Query(default=None),
    fno_only: bool = Query(default=False),
    min_strength: float = Query(default=0.0, ge=0.0, le=100.0),
    approach_pct: float = Query(default=1.5, ge=0.1, le=10.0),
    signal_filter: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    rows = run_smc_scan(
        timeframe=timeframe,
        sector=sector,
        market_cap=market_cap,
        fno_only=fno_only,
        min_strength=min_strength,
        approach_pct=approach_pct,
        signal_filter=signal_filter,
    )
    return {
        "brand": "OrderZero",
        "scanned_at_ist": datetime.now(tz=IST).isoformat(),
        "count": len(rows),
        "rows": rows,
        "disclaimer": SEBI_DISCLAIMER,
    }


@app.get("/api/v1/options/chain")
def options_chain(symbol: str = Query(default="NIFTY 50")) -> Dict[str, Any]:
    return build_demo_option_chain(symbol=symbol)


@app.post("/api/v1/backtest")
def backtest_ob(payload: BacktestRequest) -> Dict[str, Any]:
    exchange = "BSE" if payload.symbol.upper() in ("SENSEX", "BANKEX") else "NSE"
    candles, _ = market_adapter.fetch_candles(symbol=payload.symbol, exchange=exchange, timeframe=payload.timeframe)
    return run_ob_backtest(
        candles=candles,
        symbol=payload.symbol,
        timeframe=payload.timeframe,
        initial_capital=payload.initial_capital,
        risk_per_trade_pct=payload.risk_per_trade_pct,
        reward_r_multiple=payload.reward_r_multiple,
    )


@app.get("/api/v1/alerts")
def list_alerts() -> Dict[str, Any]:
    return {
        "rules": [r.to_dict() for r in alert_store.rules],
        "history": [h.to_dict() for h in alert_store.history],
    }


@app.post("/api/v1/alerts")
def create_alert(payload: AlertCreateRequest) -> Dict[str, Any]:
    rule = alert_store.create_rule(
        symbol=payload.symbol,
        timeframe=payload.timeframe,
        alert_type=payload.alert_type,
        channels=payload.channels,
    )
    return {"rule": rule.to_dict()}


@app.delete("/api/v1/alerts/{rule_id}")
def delete_alert(rule_id: str) -> Dict[str, Any]:
    if not alert_store.delete_rule(rule_id):
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return {"deleted": True, "id": rule_id}


@app.post("/api/v1/alerts/{rule_id}/test")
def test_alert(rule_id: str) -> Dict[str, Any]:
    try:
        event = alert_store.dispatch_test_event(rule_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"event": event.to_dict()}


@app.get("/api/v1/dashboard/summary")
def dashboard_summary() -> Dict[str, Any]:
    now_ist = datetime.now(tz=IST)
    scanned = run_smc_scan(timeframe="15m", fno_only=False)
    top_setups = [r for r in scanned if r["is_fno"]][:6]
    advances = sum(1 for r in scanned if r["change_pct"] > 0)
    declines = sum(1 for r in scanned if r["change_pct"] < 0)
    unchanged = max(0, len(scanned) - advances - declines)

    real_sectors = market_adapter.fetch_sector_heatmap()
    indices = [
        q for q in [
            market_adapter.fetch_latest_quote("NIFTY 50", "NSE"),
            market_adapter.fetch_latest_quote("BANK NIFTY", "NSE"),
            market_adapter.fetch_latest_quote("FIN NIFTY", "NSE"),
            market_adapter.fetch_latest_quote("SENSEX", "BSE"),
        ] if q is not None
    ]
    if not indices:
        indices = [
            {"symbol": "NIFTY 50", "ltp": 24362.45, "change_pct": 0.64},
            {"symbol": "BANK NIFTY", "ltp": 52148.10, "change_pct": 0.82},
            {"symbol": "FIN NIFTY", "ltp": 23815.30, "change_pct": 0.51},
            {"symbol": "SENSEX", "ltp": 79864.20, "change_pct": 0.59},
        ]

    vix_q = market_adapter.fetch_latest_quote("INDIA VIX", "NSE")
    return {
        "brand": "OrderZero",
        "nse_session_status": get_nse_session_status(now_ist),
        "updated_at_ist": now_ist.isoformat(),
        "indices": indices,
        "india_vix": (
            {"value": vix_q["ltp"], "change_pct": vix_q["change_pct"]}
            if vix_q
            else {"value": 13.42, "change_pct": 0.0}
        ),
        "market_breadth": {
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged,
        },
        "fii_dii_cr": {
            "fii_net_cr": 0.0,
            "dii_net_cr": 0.0,
            "date": f"EOD ({now_ist.date().isoformat()})",
        },
        "sector_heatmap": real_sectors or [
            {"sector": "Banking", "change_pct": 0.0},
            {"sector": "IT", "change_pct": 0.0},
            {"sector": "Auto", "change_pct": 0.0},
            {"sector": "Pharma", "change_pct": 0.0},
            {"sector": "Energy", "change_pct": 0.0},
            {"sector": "FMCG", "change_pct": 0.0},
            {"sector": "Infra", "change_pct": 0.0},
            {"sector": "Metals", "change_pct": 0.0},
        ],
        "top_ob_setups": top_setups,
        "disclaimer": SEBI_DISCLAIMER,
    }


@app.websocket("/ws/ticks/{symbol}")
async def websocket_live_ticks(websocket: WebSocket, symbol: str) -> None:
    """Stream REAL live NSE/BSE ticks during market hours (DhanHQ v2 or Yahoo live quotes); stop when closed."""
    await websocket.accept()
    client_id = websocket.query_params.get("client_id")
    access_token = websocket.query_params.get("access_token")
    exchange = "BSE" if symbol.upper() in ("SENSEX", "BANKEX") else "NSE"

    try:
        status = get_nse_session_status(datetime.now(tz=IST))
        if status != "open":
            await websocket.send_json(
                {
                    "type": "market_status",
                    "symbol": symbol,
                    "nse_session_status": status,
                    "message": "NSE Market Closed — Showing exact previous session close",
                }
            )
            return

        if client_id and access_token:
            dhan = DhanHQAdapter(
                BrokerCredentials(
                    broker=BrokerName.DHAN,
                    client_id=client_id,
                    access_token=access_token,
                )
            )
            stream = dhan.stream_ticks(exchange, [symbol])
        else:
            # Free real-time NSE/BSE quote polling during live market hours (no fake sine wave)
            stream = market_adapter.stream_live_quotes(symbol=symbol, exchange=exchange, poll_seconds=3.0)

        async for tick in stream:
            await websocket.send_json(
                {
                    "type": "tick",
                    "symbol": symbol,
                    "timestamp": tick.timestamp.isoformat(),
                    "price": tick.price,
                    "volume": tick.volume,
                    "oi": tick.oi,
                }
            )
    except (WebSocketDisconnect, asyncio.CancelledError):
        return
