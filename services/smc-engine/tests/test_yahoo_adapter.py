"""Unit tests for the YahooNSEAdapter real NSE/BSE data parser and 75m resampler."""

from __future__ import annotations

import unittest
from datetime import datetime

from app.adapters.yahoo_nse import (
    YahooNSEAdapter,
    resample_candles,
    to_yahoo_ticker,
)
from app.core.market_hours import IST


class TestYahooNSEAdapter(unittest.TestCase):
    def test_indian_symbol_mapping(self) -> None:
        self.assertEqual(to_yahoo_ticker("NIFTY 50"), "^NSEI")
        self.assertEqual(to_yahoo_ticker("BANK NIFTY"), "^NSEBANK")
        self.assertEqual(to_yahoo_ticker("SENSEX", "BSE"), "^BSESN")
        self.assertEqual(to_yahoo_ticker("RELIANCE", "NSE"), "RELIANCE.NS")
        self.assertEqual(to_yahoo_ticker("TCS", "BSE"), "TCS.BO")

    def test_parse_yahoo_json_and_resample_75m(self) -> None:
        base = int(datetime(2026, 11, 20, 9, 15, tzinfo=IST).timestamp())
        payload = {
            "chart": {
                "result": [
                    {
                        "timestamp": [base, base + 900, base + 4500],
                        "indicators": {
                            "quote": [
                                {
                                    "open": [24300.0, 24320.0, 24360.0],
                                    "high": [24330.0, 24355.0, 24410.0],
                                    "low": [24290.0, 24310.0, 24350.0],
                                    "close": [24320.0, 24350.0, 24405.0],
                                    "volume": [100000, 120000, 150000],
                                }
                            ]
                        },
                    }
                ]
            }
        }
        candles = YahooNSEAdapter.parse_yahoo_chart_response(payload)
        self.assertEqual(len(candles), 3)
        self.assertEqual(candles[0].open, 24300.0)
        self.assertEqual(candles[2].close, 24405.0)

        # First two 15m bars (09:15, 09:30) merge into 09:15 75m bar; third (10:30) is new 75m bar
        bars_75m = resample_candles(candles, "75m")
        self.assertEqual(len(bars_75m), 2)
        self.assertEqual(bars_75m[0].high, 24355.0)
        self.assertEqual(bars_75m[0].volume, 220000.0)
        self.assertEqual(bars_75m[1].timestamp.hour, 10)
        self.assertEqual(bars_75m[1].timestamp.minute, 30)


if __name__ == "__main__":
    unittest.main()
