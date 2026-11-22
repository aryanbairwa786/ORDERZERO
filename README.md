# OrderZero

OrderZero is an educational Indian-market terminal inspired by public descriptions of OrderBlock's workflow: review market breadth, compare bullish and bearish candidates, inspect chart structure, and record a plan in a journal. It is an independent project; it is not affiliated with OrderBlock.

## What is included

- A 222-symbol reference universe with generated rankings, breadth, candidate zones, and flowchart examples on the terminal.
- A chart page that can display unofficial Yahoo Finance history. If upstream history is unavailable, the API returns synthetic candles with an explicit warning.
- A reference-roster screener that requests unofficial Yahoo Finance quotes and omits symbols without a valid response.
- A playbook, a browser-local trade journal, risk disclosures, and an options page explaining why no option chain is shown.
- A Python FastAPI service under `services/smc-engine` for the existing analytics routes.

## Data and cost limits

The terminal board is generated demo data. It is not a live exchange scan, does not use current open interest, and should not be used to make trading decisions. The chart and screener may use Yahoo Finance's unofficial endpoints; availability, delay, completeness, and usage rights are not guaranteed. Synthetic chart candles are labelled and are never represented as market data.

This repository contains no subscription billing. You can run the demo without a paid API key. Public hosting providers and authorized market-data services set their own quotas, terms, and prices, so this project cannot guarantee that hosting or live data will remain free. No licensed live options chain is configured; the app does not invent OI, IV, volume, PCR, or max-pain values.

The journal saves entries in the current browser's local storage. It does not sync between devices or provide account backup.

## Run the web app

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. To make a production build, run `npm run build` and then `npm start`.

## Deploy

The Next.js application is at the repository root. For Vercel, use the repository root as the project root and let it run the standard install/build commands. The Python service lives at `services/smc-engine` and can be deployed separately if you use its endpoints. Keep provider credentials in the host's secret settings; never commit `.env` files or tokens.

The default web demo does not require an environment file. `.env.example` contains placeholder names only.

## Safety and scope

OrderZero is for education and software demonstration. It is not investment advice, a signal service, a broker, or a trade execution system. Smart-money-concept labels are algorithmic interpretations of supplied candles, not evidence of institutional orders. Check data provenance, timestamps, and calculations independently.

See the in-app **Method & Disclosures** page for current feature and data notes.
