"""Unit tests for Step 4 backend services: Screener, Backtester, Options Chain, and Alerts."""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta

from app.adapters.demo import DemoBrokerAdapter
from app.core.market_hours import IST
from app.services.alerts import AlertStore
from app.services.backtester import run_ob_backtest
from app.services.options_chain import build_demo_option_chain, compute_max_pain
from app.services.screener import run_smc_scan


class TestStep4Services(unittest.TestCase):
    def test_screener_returns_filtered_fno_results(self) -> None:
        rows = run_smc_scan(timeframe="15m", sector="Banking", fno_only=True)
        self.assertGreater(len(rows), 0)
        for row in rows:
            self.assertEqual(row["sector"], "Banking")
            self.assertTrue(row["is_fno"])
            self.assertIn("sparkline", row)

    def test_backtester_computes_metrics_and_equity_curve(self) -> None:
        adapter = DemoBrokerAdapter()
        end = datetime(2026, 11, 20, 15, 30, tzinfo=IST)
        start = end - timedelta(days=10)
        candles = adapter.get_historical_candles("NSE", "NIFTY 50", "5m", start, end)
        res = run_ob_backtest(
            candles=candles,
            symbol="NIFTY 50",
            timeframe="5m",
            initial_capital=5_00_000.0,
            reward_r_multiple=2.0,
        )
        self.assertEqual(res["initial_capital"], 5_00_000.0)
        self.assertGreaterEqual(len(res["equity_curve"]), 1)
        self.assertGreaterEqual(res["max_drawdown_pct"], 0.0)

    def test_options_chain_pcr_and_max_pain(self) -> None:
        chain = build_demo_option_chain("NIFTY 50")
        self.assertGreater(chain["pcr"], 0.5)
        self.assertGreater(chain["max_pain"], 20_000.0)
        self.assertEqual(len(chain["strikes"]), 17)
        self.assertEqual(chain["max_pain"], compute_max_pain(chain["strikes"]))

    def test_alert_store_create_dispatch_and_delete(self) -> None:
        store = AlertStore()
        rule = store.create_rule("RELIANCE", "15m", "bos_choch", ["in_app"])
        event = store.dispatch_test_event(rule.id, price=1298.5)
        self.assertEqual(event.symbol, "RELIANCE")
        self.assertIn("RELIANCE", event.message)
        self.assertTrue(store.delete_rule(rule.id))


if __name__ == "__main__":
    unittest.main()
