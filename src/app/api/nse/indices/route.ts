import { NextResponse } from "next/server";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const INDICES = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^NSEBANK", name: "BANK NIFTY" },
  { symbol: "^CNXIT", name: "NIFTY IT" },
  { symbol: "NIFTY_FIN_SERVICE.NS", name: "NIFTY FIN SERVICE" },
];
const DATA_NOTICE =
  "Unofficial Yahoo Finance index data; values may be delayed, incomplete, rate-limited, or unavailable. Missing indices are omitted.";

async function fetchIndex(index: (typeof INDICES)[number]) {
  const url =
    YAHOO_BASE +
    "/" +
    encodeURIComponent(index.symbol) +
    "?interval=1d&range=2d";
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error("Yahoo Finance request failed.");

  const body = await response.json();
  const meta = body.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("Index metadata is unavailable.");

  const value = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(previousClose) || previousClose <= 0) {
    throw new Error("Valid index quote and previous close are unavailable.");
  }

  return {
    symbol: index.symbol,
    name: index.name,
    value,
    change: value - previousClose,
    changePercent: ((value - previousClose) / previousClose) * 100,
    timestamp: Number(meta.regularMarketTime ?? 0) * 1000,
    dataSource: "yahoo_finance_unofficial",
  };
}

export async function GET() {
  const results = await Promise.allSettled(INDICES.map(fetchIndex));
  const indices = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const missingSymbols = results.flatMap((result, index) =>
    result.status === "rejected" ? [INDICES[index].symbol] : []
  );

  return NextResponse.json({
    indices,
    timestamp: Date.now(),
    data_mode: "unofficial_yahoo_finance",
    data_notice: DATA_NOTICE,
    missing_symbols: missingSymbols,
  });
}
