"""Unit tests for Step 4 backend services: Screener, Backtester, Options Chain, and Alerts."""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta

from app.adapters.demo import DemoBrokerAdapter
from app.core.market_hours import IST
from app.services.alerts import AlertStore
from app.services.backtester import run_ob_backtest
from app.services.options_chain import compute_max_pain, parse_nse_option_chain_json
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

    def test_max_pain_uses_only_supplied_open_interest(self) -> None:
        strikes = [
            {"strike": 100, "ce_oi": 0, "pe_oi": 10},
            {"strike": 110, "ce_oi": 10, "pe_oi": 10},
            {"strike": 120, "ce_oi": 10, "pe_oi": 0},
        ]
        self.assertEqual(compute_max_pain(strikes), 110.0)

    def test_options_snapshot_parser_labels_caller_supplied_data(self) -> None:
        payload = {
            "records": {"underlyingValue": 100.0},
            "filtered": {"data": [{
                "strikePrice": 100,
                "CE": {"openInterest": 10, "lastPrice": 2.5},
                "PE": {"openInterest": 12, "lastPrice": 3.0},
            }]},
        }
        result = parse_nse_option_chain_json(payload, "NIFTY 50")
        self.assertIsNotNone(result)
        self.assertEqual(result["source"], "provided_snapshot")
        self.assertEqual(result["strikes"][0]["ce_oi"], 10)

    def test_alert_store_create_dispatch_and_delete(self) -> None:
        store = AlertStore()
        rule = store.create_rule("RELIANCE", "15m", "bos_choch", ["in_app"])
        event = store.dispatch_test_event(rule.id, price=1298.5)
        self.assertEqual(event.symbol, "RELIANCE")
        self.assertIn("RELIANCE", event.message)
        self.assertTrue(store.delete_rule(rule.id))


if __name__ == "__main__":
    unittest.main()
