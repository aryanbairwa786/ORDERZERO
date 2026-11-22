// Yahoo Finance is unofficial. The only fallback is explicitly labeled demo data.
import { NextResponse } from 'next/server';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const BASELINE_PRICES: Record<string, number> = {
  'RELIANCE.NS': 1285,
  'TCS.NS': 3920,
  'HDFCBANK.NS': 1745,
  'INFY.NS': 1855,
  'ICICIBANK.NS': 1265,
  'HINDUNILVR.NS': 2380,
  'SBIN.NS': 825,
  'BHARTIARTL.NS': 1565,
  'KOTAKBANK.NS': 1750,
  'ITC.NS': 472,
  'LT.NS': 3585,
  'AXISBANK.NS': 1185,
  'ASIANPAINT.NS': 2480,
  'MARUTI.NS': 11250,
  'SUNPHARMA.NS': 1780,
  'TITAN.NS': 3240,
  'BAJFINANCE.NS': 6650,
  'WIPRO.NS': 560,
  'HCLTECH.NS': 1820,
  'ULTRACEMCO.NS': 11150,
  '^NSEI': 24450,
  '^NSEBANK': 51200,
};

function generateFallbackCandles(basePrice: number, count: number = 80) {
  const candles = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 900; // 15m
  let currentPrice = basePrice * 0.96;
  const volatility = basePrice * 0.004;

  for (let i = count; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const change = (Math.random() - 0.48) * volatility;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.8;
    const low = Math.min(open, close) - Math.random() * volatility * 0.8;
    const volume = Math.floor(Math.random() * 80000 + 20000);

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const allowedIntervals = new Set(['1m', '5m', '15m', '30m', '60m', '1d', '1wk', '1mo']);
  const allowedRanges = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']);
  const requestedInterval = searchParams.get('interval') || '15m';
  const requestedRange = searchParams.get('range') || '60d';
  const interval = allowedIntervals.has(requestedInterval) ? requestedInterval : '15m';
  const range = allowedRanges.has(requestedRange) ? requestedRange : '3mo';
  const inputSymbol = symbol.trim().toUpperCase();
  const symbolAliases: Record<string, string> = {
    'NIFTY 50': '^NSEI',
    'BANK NIFTY': '^NSEBANK',
    'NIFTY IT': '^CNXIT',
    'NIFTY FIN SERVICE': 'NIFTY_FIN_SERVICE.NS',
  };
  const decodedSymbol = symbolAliases[inputSymbol] ?? inputSymbol;
  if (!/^[A-Z0-9^=._&-]{1,32}$/.test(decodedSymbol)) {
    return NextResponse.json({ error: 'Unsupported symbol.' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${YAHOO_BASE}/${encodeURIComponent(decodedSymbol)}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 30 },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const result = data.chart?.result?.[0];

      if (result) {
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};

        const candles = timestamps
          .map((t: number, i: number) => ({
            time: t,
            open: quote.open?.[i] ?? 0,
            high: quote.high?.[i] ?? 0,
            low: quote.low?.[i] ?? 0,
            close: quote.close?.[i] ?? 0,
            volume: quote.volume?.[i] ?? 0,
          }))
          .filter(
            (c: { open: number; high: number; low: number; close: number }) =>
              c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
          );

        if (candles.length > 0) {
          return NextResponse.json({
            mode: 'yahoo_finance_unofficial',
            data_notice: 'Unofficial Yahoo Finance history; it may be delayed, incomplete, or unavailable.',
            symbol: result.meta?.symbol || decodedSymbol,
            name: result.meta?.shortName || result.meta?.longName || decodedSymbol,
            currency: result.meta?.currency || 'INR',
            exchange: result.meta?.exchangeName || 'NSE',
            candles,
            meta: {
              regularMarketPrice: result.meta?.regularMarketPrice || candles[candles.length - 1].close,
              previousClose: result.meta?.chartPreviousClose || result.meta?.previousClose || candles[0].open,
              regularMarketTime: result.meta?.regularMarketTime || timestamps[timestamps.length - 1] || Math.floor(Date.now() / 1000),
            },
          });
        }
      }
    }
  } catch (error) {
  console.warn('Unofficial history unavailable; returning labeled demo candles.');
  }

  // Graceful fallback for offline, rate-limited, or weekend requests
  const base = BASELINE_PRICES[decodedSymbol] || 1500;
  const fallbackCandles = generateFallbackCandles(base, 90);
  const lastCandle = fallbackCandles[fallbackCandles.length - 1];

  return NextResponse.json({
    mode: 'synthetic_demo',
    data_notice: 'Generated example candles because upstream history was unavailable. These values are not market data.',
    symbol: decodedSymbol,
    name: decodedSymbol.replace('.NS', ''),
    currency: 'INR',
    exchange: 'NSE',
    candles: fallbackCandles,
    meta: {
      regularMarketPrice: lastCandle.close,
      previousClose: fallbackCandles[0].open,
      regularMarketTime: lastCandle.time,
    },
  });
}
