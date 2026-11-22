-- TimescaleDB schema for Indian Stock Market SMC Platform
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Historical OHLCV cache per exchange, symbol, and timeframe (timestamps stored in TIMESTAMPTZ, queried in Asia/Kolkata)
CREATE TABLE IF NOT EXISTS ohlcv_candles (
    ts          TIMESTAMPTZ NOT NULL,
    exchange    TEXT NOT NULL,          -- NSE, BSE, NFO, BFO, MCX
    symbol      TEXT NOT NULL,          -- NIFTY 50, BANK NIFTY, RELIANCE, etc.
    timeframe   TEXT NOT NULL,          -- 1m, 3m, 5m, 15m, 30m, 1H, 75m, 1D, 1W
    open        DOUBLE PRECISION NOT NULL,
    high        DOUBLE PRECISION NOT NULL,
    low         DOUBLE PRECISION NOT NULL,
    close       DOUBLE PRECISION NOT NULL,
    volume      DOUBLE PRECISION NOT NULL DEFAULT 0,
    oi          BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (exchange, symbol, timeframe, ts)
);

SELECT create_hypertable('ohlcv_candles', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_ohlcv_lookup
    ON ohlcv_candles (exchange, symbol, timeframe, ts DESC);

-- User-owned broker credentials (DPDP Act 2023: access_token_enc & api_secret_enc stored encrypted via AES-256/Fernet)
CREATE TABLE IF NOT EXISTS user_broker_connections (
    id                UUID PRIMARY KEY,
    user_id           UUID NOT NULL,
    broker_name       TEXT NOT NULL,    -- kite, upstox, angelone, fyers, dhan
    broker_client_id  TEXT NOT NULL,
    access_token_enc  BYTEA NOT NULL,
    refresh_token_enc BYTEA,
    token_expires_at  TIMESTAMPTZ,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, broker_name)
);
