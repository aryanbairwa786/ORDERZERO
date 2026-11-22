"""SMC Alert Engine & Multi-Channel Dispatcher (In-App, Push, Email, Telegram, WhatsApp)."""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List
from uuid import uuid4

from ..core.market_hours import IST


@dataclass
class AlertRule:
    id: str
    symbol: str
    timeframe: str
    alert_type: str  # ob_enter, ob_mitigated, bos_choch, fvg_fill, liquidity_sweep
    channels: List[str]  # in_app, push, email, telegram, whatsapp
    active: bool = True
    created_at_ist: str = field(default_factory=lambda: datetime.now(tz=IST).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "alert_type": self.alert_type,
            "channels": self.channels,
            "active": self.active,
            "created_at_ist": self.created_at_ist,
        }


@dataclass
class AlertEvent:
    id: str
    rule_id: str
    symbol: str
    timeframe: str
    alert_type: str
    message: str
    price: float
    triggered_at_ist: str
    channels_dispatched: List[str]
    chart_url: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "rule_id": self.rule_id,
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "alert_type": self.alert_type,
            "message": self.message,
            "price": round(self.price, 2),
            "triggered_at_ist": self.triggered_at_ist,
            "channels_dispatched": self.channels_dispatched,
            "chart_url": self.chart_url,
        }


class AlertStore:
    """In-memory alert registry & IST history log (backed by Postgres/Redis in production)."""

    def __init__(self) -> None:
        self.rules: List[AlertRule] = [
            AlertRule(
                id="alrt_nifty_ob",
                symbol="NIFTY 50",
                timeframe="5m",
                alert_type="ob_enter",
                channels=["in_app", "telegram"],
            ),
            AlertRule(
                id="alrt_bnf_sweep",
                symbol="BANK NIFTY",
                timeframe="15m",
                alert_type="liquidity_sweep",
                channels=["in_app", "whatsapp"],
            ),
        ]
        now_ist = datetime.now(tz=IST).isoformat()
        self.history: List[AlertEvent] = [
            AlertEvent(
                id="evt_demo_1",
                rule_id="alrt_nifty_ob",
                symbol="NIFTY 50",
                timeframe="5m",
                alert_type="ob_enter",
                message="NIFTY 50 entered Fresh Bullish OB (₹24,290.00 – ₹24,315.00)",
                price=24308.5,
                triggered_at_ist=now_ist,
                channels_dispatched=["in_app"],
                chart_url="/chart/NIFTY%2050",
            )
        ]

    def create_rule(
        self, symbol: str, timeframe: str, alert_type: str, channels: List[str]
    ) -> AlertRule:
        rule = AlertRule(
            id=f"alrt_{uuid4().hex[:8]}",
            symbol=symbol,
            timeframe=timeframe,
            alert_type=alert_type,
            channels=channels,
        )
        self.rules.insert(0, rule)
        return rule

    def delete_rule(self, rule_id: str) -> bool:
        before = len(self.rules)
        self.rules = [r for r in self.rules if r.id != rule_id]
        return len(self.rules) < before

    def dispatch_test_event(self, rule_id: str, price: float = 24350.0) -> AlertEvent:
        rule = next((r for r in self.rules if r.id == rule_id), None)
        if rule is None:
            raise KeyError(f"Alert rule not found: {rule_id}")

        msg = f"[OrderZero] {rule.symbol} ({rule.timeframe}) triggered {rule.alert_type} at ₹{price:,.2f}"
        dispatched = ["in_app"]
        if "telegram" in rule.channels and os.getenv("TELEGRAM_BOT_TOKEN"):
            _send_telegram(msg)
            dispatched.append("telegram")
        if "whatsapp" in rule.channels and os.getenv("WHATSAPP_BUSINESS_ACCESS_TOKEN"):
            _send_whatsapp(msg)
            dispatched.append("whatsapp")

        event = AlertEvent(
            id=f"evt_{uuid4().hex[:8]}",
            rule_id=rule.id,
            symbol=rule.symbol,
            timeframe=rule.timeframe,
            alert_type=rule.alert_type,
            message=msg,
            price=price,
            triggered_at_ist=datetime.now(tz=IST).isoformat(),
            channels_dispatched=dispatched,
            chart_url=f"/chart/{rule.symbol}",
        )
        self.history.insert(0, event)
        return event


def _send_telegram(text: str) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    req = urllib.request.Request(
        url,
        data=json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        return


def _send_whatsapp(text: str) -> None:
    phone_id = os.getenv("WHATSAPP_BUSINESS_PHONE_NUMBER_ID", "")
    token = os.getenv("WHATSAPP_BUSINESS_ACCESS_TOKEN", "")
    to_number = os.getenv("WHATSAPP_DEFAULT_RECIPIENT", "")
    if not phone_id or not token or not to_number:
        return
    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": text},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        return
