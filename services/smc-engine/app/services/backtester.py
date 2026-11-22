"""Order Block Historical Backtester (Entry at OB touch, SL beyond OB, Target in R multiples)."""

from __future__ import annotations

from typing import Any, Dict, List

from ..core.engine import SMCEngine
from ..core.models import Candle, Direction, SMCConfig


def run_ob_backtest(
    candles: List[Candle],
    symbol: str = "NIFTY 50",
    timeframe: str = "5m",
    initial_capital: float = 5_00_000.0,
    risk_per_trade_pct: float = 1.0,
    reward_r_multiple: float = 2.0,
    sl_buffer_pct: float = 0.05,
    config: SMCConfig | None = None,
) -> Dict[str, Any]:
    """Simulate mechanical OB-retest trades and compute Win Rate, Profit Factor, Max DD & Equity Curve."""
    engine = SMCEngine()
    cfg = config or SMCConfig(
        internal_swing_length=4,
        swing_length=25,
        displacement_atr_mult=1.3,
        max_obs_shown=50,
        show_mitigated=True,
    )
    analysis = engine.analyze(candles, symbol=symbol, timeframe=timeframe, config=cfg)

    capital = initial_capital
    peak_capital = initial_capital
    max_drawdown_pct = 0.0
    trades: List[Dict[str, Any]] = []
    equity_curve: List[Dict[str, Any]] = [
        {"index": 0, "timestamp": candles[0].timestamp.isoformat(), "equity": round(capital, 2)}
    ]

    gross_profit = 0.0
    gross_loss = 0.0
    wins = 0
    losses = 0

    for ob in sorted(analysis.order_blocks, key=lambda o: o.candle_index):
        entry_idx = ob.tested_index
        if entry_idx is None or entry_idx >= len(candles) - 1:
            continue

        is_long = ob.direction == Direction.BULLISH
        entry_price = ob.top if is_long else ob.bottom
        buffer = entry_price * (sl_buffer_pct / 100.0)
        stop_loss = (ob.bottom - buffer) if is_long else (ob.top + buffer)
        risk_pts = abs(entry_price - stop_loss)
        if risk_pts <= 0:
            continue

        target_price = (
            entry_price + risk_pts * reward_r_multiple
            if is_long
            else entry_price - risk_pts * reward_r_multiple
        )

        exit_idx = len(candles) - 1
        exit_price = candles[-1].close
        outcome = "open_eod"

        for j in range(entry_idx + 1, len(candles)):
            c = candles[j]
            if is_long:
                if c.low <= stop_loss:
                    exit_idx = j
                    exit_price = stop_loss
                    outcome = "sl_hit"
                    break
                if c.high >= target_price:
                    exit_idx = j
                    exit_price = target_price
                    outcome = "target_hit"
                    break
            else:
                if c.high >= stop_loss:
                    exit_idx = j
                    exit_price = stop_loss
                    outcome = "sl_hit"
                    break
                if c.low <= target_price:
                    exit_idx = j
                    exit_price = target_price
                    outcome = "target_hit"
                    break

        risk_rupees = capital * (risk_per_trade_pct / 100.0)
        pnl_r = (
            (exit_price - entry_price) / risk_pts
            if is_long
            else (entry_price - exit_price) / risk_pts
        )
        pnl_inr = risk_rupees * pnl_r
        capital += pnl_inr

        if pnl_inr >= 0:
            wins += 1
            gross_profit += pnl_inr
        else:
            losses += 1
            gross_loss += abs(pnl_inr)

        if capital > peak_capital:
            peak_capital = capital
        dd_pct = ((peak_capital - capital) / peak_capital) * 100.0 if peak_capital > 0 else 0.0
        if dd_pct > max_drawdown_pct:
            max_drawdown_pct = dd_pct

        trades.append(
            {
                "ob_id": ob.id,
                "direction": "LONG" if is_long else "SHORT",
                "entry_time": candles[entry_idx].timestamp.isoformat(),
                "exit_time": candles[exit_idx].timestamp.isoformat(),
                "entry_price": round(entry_price, 2),
                "stop_loss": round(stop_loss, 2),
                "target_price": round(target_price, 2),
                "exit_price": round(exit_price, 2),
                "outcome": outcome,
                "r_multiple": round(pnl_r, 2),
                "pnl_inr": round(pnl_inr, 2),
            }
        )
        equity_curve.append(
            {
                "index": exit_idx,
                "timestamp": candles[exit_idx].timestamp.isoformat(),
                "equity": round(capital, 2),
            }
        )

    total_trades = wins + losses
    win_rate = (wins / total_trades) * 100.0 if total_trades > 0 else 0.0
    profit_factor = (
        round(gross_profit / gross_loss, 2)
        if gross_loss > 0
        else (round(gross_profit, 2) if gross_profit > 0 else 0.0)
    )
    net_pnl = capital - initial_capital

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "initial_capital": round(initial_capital, 2),
        "final_capital": round(capital, 2),
        "net_pnl_inr": round(net_pnl, 2),
        "net_return_pct": round((net_pnl / initial_capital) * 100.0, 2),
        "total_trades": total_trades,
        "wins": wins,
        "losses": losses,
        "win_rate_pct": round(win_rate, 1),
        "profit_factor": profit_factor,
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "reward_r_multiple": reward_r_multiple,
        "trades": trades,
        "equity_curve": equity_curve,
        "disclaimer": (
            "Hypothetical backtest on historical/sample data for educational purposes only. "
            "Past performance does not guarantee future results."
        ),
    }
