# OrderBlock — Proprietary SMC Day-Trading Terminal for Indian Equities & F&O

> **100% Free Educational Platform** | Reverse-Engineered 1:1 from `order-block.com` | Indian NSE F&O Universe (222 Stocks)
> 
> **SEBI Non-Advisory Compliance Notice:** This platform is strictly an algorithmic technical price-structure visualization and statistical filtering tool for educational purposes. It does not provide buy/sell recommendations, investment advice, or portfolio management services.

---

## 🌟 What Makes OrderBlock Unique?

Unlike conventional crypto/ICT charting tools or generic indicator screeners, **OrderBlock** implements a proprietary 5-step institutional order flow funnel designed specifically for the 09:15–15:30 IST Indian trading session:

### 1. Market Breadth 0.00% Baseline Scatter Strip
- Plots all **222 active NSE F&O stocks** as real-time interactive dots along a centered 0.00% baseline.
- **Color Coding:** Emerald green (`#10B981`) for advance, Rose red (`#F43F5E`) for decline.
- **Top 3 Picks Visualized:** Highlighted with bright pulse rings directly on the scatter strip.
- **Sectors Flow Bar:** Aggregates net institutional order flow across Banking, IT, Auto, Energy, Metals, Pharma, and FMCG.

### 2. Proprietary Strength Formula & 2:1 Direction Gate
- **Formula:** $\text{Strength} = \frac{\text{one-directional move from open}}{\text{50-day Average Daily Move (ADM)}}$
- **2:1 Direction Gate:** A stock must travel at least **2.0 times** more in its favored direction than in its adverse counter-direction. If a stock retraces more than half of its directional travel, its score resets to `0.0` (eliminating chop and fakeouts).

### 3. Dual Bullish / Bearish Contender Boards
- Live rankings of the **Top 20 Bullish** and **Top 20 Bearish** stocks.
- Displays: Ticker, Sector, Percentile rank (90th–99th), Sparkline trajectory, Current Price, % Change, and ADM-Normalized Strength Score.

### 4. Top 3 Filtered Picks per Direction
From the 20 contenders, the engine extracts the **Top 3 High-Probability Picks** applying two strict institutional filters:
1. **Sector Concentration Cap:** Maximum of 2 stocks allowed from any single sector (prevents portfolio correlation risk).
2. **Event-Risk / Outlier Filter:** Any stock moving $> 3.5\times$ its 50-day ADM (earnings or news spikes) is flagged as unmanageable risk and disqualified from the Top 3 picks.

### 5. 10-Second Diagnostic Popup (Zone Inspector)
Clicking any contender opens the diagnostic inspection modal:
- **7-Row Stack:** Percentile, Status, Order Block Zone $[Low, High]$, Entry $Z$, Stop $S_1$, Target $R_1$, Target $R_2$, Risk-to-Reward ratio ($\ge 2.5:1$).
- **Live Candle Chart:** 5-minute candlestick chart with order block zones, VWAP line, and structural levels.
- **1-Click Journal Integration:** Pre-fills the Trade Journal with entry, stop loss, target, and position sizing.

### 6. Interactive Playbook Flowchart & Trade Journal
- **5-Step Daily Routine:** 09:20 Breadth Scan $\rightarrow$ 09:25 Choose Bias $\rightarrow$ 09:30 Shortlist 20 to 3 $\rightarrow$ 09:35 Inspect Zone $\rightarrow$ Size & Log.
- **30-Day P&L Heatmap:** Visual calendar tracking daily trading consistency and win-rate statistics.

---

## 🎨 Design Tokens & Aesthetics

- **Background:** `#090D16` Deep void canvas
- **Card Surface:** `#111726` with subtle borders (`#1F293D`)
- **Bullish / Demand Zones:** `#10B981` Emerald green
- **Bearish / Supply Zones:** `#F43F5E` Rose red
- **Targets & Key Levels:** `#F59E0B` Amber
- **Accents:** `#06B6D4` Cyan
- **Typography:** `Inter Tight` for data headers and metrics; `JetBrains Mono` for numeric prices and coordinates.

---

## 📁 Repository Structure

```text
ORDERZERO/
├── .env.example
├── docker-compose.yml
├── README.md
├── START_HERE.md
├── STEP3_SETUP.md
├── apps/
│   └── web/                                # Next.js 14+ (App Router), TypeScript, Tailwind, Zustand
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx              # Dark theme, Inter Tight + JetBrains Mono, SEBI banner
│       │   │   ├── page.tsx                # OrderBlock landing page matching order-block.com
│       │   │   ├── dashboard/page.tsx      # Main OrderBlock Terminal (Scatter Strip, Picks, Dual Boards)
│       │   │   ├── playbook/page.tsx       # 5-step daily routine interactive flowchart
│       │   │   ├── journal/page.tsx        # Trade journal with 30-day P&L heatmap & popup pre-fill
│       │   │   ├── disclosures/page.tsx    # Transparent formula, methodology & SEBI disclaimer
│       │   │   ├── chart/[symbol]/         # Multi-pane TradingView chart with SMC zones
│       │   │   ├── screener/               # Full NSE F&O scanner
│       │   │   ├── options/                # Option chain with PCR & Max Pain
│       │   │   └── billing/page.tsx        # 100% Free Forever confirmation page
│       │   ├── components/
│       │   │   ├── terminal/
│       │   │   │   ├── BreadthScatterStrip.tsx  # 222-stock 0% baseline scatter strip
│       │   │   │   ├── BullBearBoards.tsx       # Side-by-side Top 20 Bull/Bear boards
│       │   │   │   ├── OrderBlockPopup.tsx      # 10-second diagnostic zone inspector
│       │   │   │   └── PlaybookFlowchart.tsx    # Interactive routine flowchart & funnel
│       │   │   └── layout/
│       │   │       └── AppNavbar.tsx            # Clean navigation bar
│       │   └── lib/
│       │       ├── fno-universe.ts              # 222 active NSE F&O stocks database
│       │       └── orderblock-engine.ts         # Strength formula, 2:1 gate, sector caps
├── services/
│   └── smc-engine/                         # Python 3.11+ FastAPI backend
│       ├── Dockerfile
│       ├── requirements.txt
│       └── app/
│           ├── main.py                     # FastAPI entrypoint (/api/v1/orderblock/terminal)
│           ├── services/
│           │   └── orderblock_terminal.py  # High-performance 222-stock scanner & ranking
│           └── core/
│               ├── market_hours.py         # NSE IST market hours (09:15–15:30)
│               └── order_blocks.py         # Algorithmic order block detection
└── infra/
    └── deployment/                         # Deployment topology notes
```

---

## 🚀 Deployment Guide

### Deploying to GitHub (Target: `aryanbairwa786/ORDERZERO`)

1. Extract `orderblock_complete_update.zip` or open this repository directory.
2. Push changes:
   ```bash
   git add .
   git commit -m "feat: complete OrderBlock 1:1 replication with 222 F&O universe and diagnostic terminal"
   git push origin main
   ```
   *(Or drag and drop the updated files into GitHub web at `https://github.com/aryanbairwa786/ORDERZERO`)*

### Vercel Deployment (Frontend)
- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js
- **Build Command:** `next build`
- **Output Directory:** `.next`
- Auto-deploys on every commit to `main`.

### Render Deployment (FastAPI Backend)
- **Root Directory:** `services/smc-engine`
- **Environment:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 10000`
- Auto-deploys on every commit to `main`.

---

## 🔒 100% Free Forever Guarantee

- No paywalls or feature gating.
- No Razorpay / Stripe lockouts.
- All 222 F&O stocks, diagnostic popups, breadths, charts, playbooks, and journals are unrestricted and free for everyone.
