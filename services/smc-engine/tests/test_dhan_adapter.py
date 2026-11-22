"""Unit tests for the DhanHQ API v2 adapter and binary WebSocket packet decoder."""

from __future__ import annotations

import json
import struct
import unittest
from datetime import datetime

from app.adapters.base import BrokerCredentials, BrokerName
from app.adapters.dhan import (
    DHAN_INDEX_SECURITY_MAP,
    FEED_RESPONSE_FULL,
    FEED_RESPONSE_QUOTE,
    FEED_RESPONSE_TICKER,
    DhanHQAdapter,
    build_dhan_subscribe_message,
    parse_dhan_binary_packet,
)
from app.core.market_hours import IST


class TestDhanHQAdapter(unittest.TestCase):
    def test_parse_ticker_binary_packet(self) -> None:
        epoch = int(datetime(2026, 11, 20, 10, 15, 0, tzinfo=IST).timestamp())
        packet = struct.pack("<BHBI f I", FEED_RESPONSE_TICKER, 16, 1, 13, 24385.25, epoch)
        tick = parse_dhan_binary_packet(packet)
        self.assertIsNotNone(tick)
        assert tick is not None
        self.assertAlmostEqual(tick.price, 24385.25, places=2)
        self.assertEqual(tick.timestamp.hour, 10)
        self.assertEqual(tick.timestamp.minute, 15)

    def test_parse_quote_and_full_binary_packets(self) -> None:
        epoch = int(datetime(2026, 11, 20, 14, 30, 0, tzinfo=IST).timestamp())
        quote_pkt = struct.pack(
            "<BHBI f H I f I", FEED_RESPONSE_QUOTE, 26, 1, 25, 52140.5, 15, epoch, 52100.0, 480_000
        )
        quote_tick = parse_dhan_binary_packet(quote_pkt)
        self.assertIsNotNone(quote_tick)
        assert quote_tick is not None
        self.assertAlmostEqual(quote_tick.price, 52140.5, places=2)
        self.assertEqual(quote_tick.volume, 480_000.0)

        full_pkt = struct.pack(
            "<BHBI f H I f I I I I",
            FEED_RESPONSE_FULL,
            38,
            2,
            13,
            24410.75,
            25,
            epoch,
            24390.0,
            950_000,
            120_000,
            145_000,
            1_85_00_000,
        )
        full_tick = parse_dhan_binary_packet(full_pkt)
        self.assertIsNotNone(full_tick)
        assert full_tick is not None
        self.assertAlmostEqual(full_tick.price, 24410.75, places=2)
        self.assertEqual(full_tick.oi, 1_85_00_000)

    def test_subscribe_payload_and_historical_parser(self) -> None:
        msg = json.loads(build_dhan_subscribe_message([("IDX_I", "13"), ("IDX_I", "25")], 17))
        self.assertEqual(msg["RequestCode"], 17)
        self.assertEqual(msg["InstrumentCount"], 2)
        self.assertEqual(msg["InstrumentList"][0]["SecurityId"], "13")

        epoch = int(datetime(2026, 11, 20, 9, 15, 0, tzinfo=IST).timestamp())
        candles = DhanHQAdapter.parse_historical_response(
            {
                "timestamp": [epoch, epoch + 300],
                "open": [24300.0, 24320.0],
                "high": [24335.0, 24360.0],
                "low": [24290.0, 24315.0],
                "close": [24320.0, 24355.0],
                "volume": [125000.0, 148000.0],
                "open_interest": [15000000, 15025000],
            }
        )
        self.assertEqual(len(candles), 2)
        self.assertEqual(candles[1].close, 24355.0)
        self.assertEqual(candles[1].oi, 15025000)

    def test_index_security_id_resolution(self) -> None:
        adapter = DhanHQAdapter(
            BrokerCredentials(broker=BrokerName.DHAN, client_id="1000001", access_token="demo_jwt")
        )
        sec_id, seg, instr = adapter.resolve_instrument("NSE", "NIFTY 50")
        self.assertEqual((sec_id, seg, instr), DHAN_INDEX_SECURITY_MAP["NIFTY 50"])


if __name__ == "__main__":
    unittest.main()
