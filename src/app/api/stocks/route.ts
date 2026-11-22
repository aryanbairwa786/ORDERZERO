import { NextResponse } from "next/server";
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const SYMBOL_PATTERN = /^[A-Z0-9^=._&-]{1,32}$/;
const DATA_NOTICE =
  "Unofficial Yahoo Finance data; quotes may be delayed, incomplete, rate-limited, or unavailable. Missing quotes are omitted, not simulated.";

type YahooResult = {
  meta?: Record<string, unknown>;
  timestamp?: number[];
  indicators?: { quote?: Array<Record<string, Array<number | null> | undefined>> };
};

async function fetchYahooQuote(symbol: string) {
  const url =
    YAHOO_BASE +
    "/" +
    encodeURIComponent(symbol) +
    "?interval=1d&range=2d";
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error("Yahoo Finance request failed.");

  const body = await response.json();
  const result = body.chart?.result?.[0] as YahooResult | undefined;
  if (!result?.meta) throw new Error("Quote metadata is unavailable.");

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0] ?? {};
  const timestamps = result.timestamp ?? [];
  const lastIndex = timestamps.length - 1;
  const ltp = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
  if (!Number.isFinite(ltp) || ltp <= 0 || !Number.isFinite(previousClose) || previousClose <= 0) {
    throw new Error("Valid quote and previous close are unavailable.");
  }

  const candleValue = (key: string) => {
    const values = quote[key] as Array<number | null> | undefined;
    const value = values?.[lastIndex];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };
  const providerTime = Number(meta.regularMarketTime ?? timestamps[lastIndex] ?? 0);

  return {
    symbol: String(meta.symbol ?? symbol),
    name: String(meta.shortName ?? meta.longName ?? symbol),
    exchange: String(meta.exchangeName ?? "NSE"),
    ltp,
    change: ltp - previousClose,
    changePercent: ((ltp - previousClose) / previousClose) * 100,
    open: candleValue("open"),
    high: candleValue("high"),
    low: candleValue("low"),
    close: ltp,
    volume: candleValue("volume"),
    prevClose: previousClose,
    timestamp: providerTime > 0 ? providerTime * 1000 : Date.now(),
    dataSource: "yahoo_finance_unofficial" as const,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = (searchParams.get("symbols") || "RELIANCE.NS")
    .split(",")
    .slice(0, 50)
    .map((symbol) => symbol.trim().toUpperCase());
  const symbolList = [...new Set(requested.filter((symbol) => SYMBOL_PATTERN.test(symbol)))];

  const results = await Promise.allSettled(symbolList.map(fetchYahooQuote));
  const stocks: Record<string, Awaited<ReturnType<typeof fetchYahooQuote>>> = {};
  const missingSymbols: string[] = [];

  results.forEach((result, index) => {
    const requestedSymbol = symbolList[index];
    if (result.status === "fulfilled") {
      stocks[requestedSymbol] = result.value;
    } else {
      missingSymbols.push(requestedSymbol);
    }
  });

  return NextResponse.json({
    stocks,
    timestamp: Date.now(),
    data_mode: "unofficial_yahoo_finance",
    data_notice: DATA_NOTICE,
    missing_symbols: missingSymbols,
  });
}
