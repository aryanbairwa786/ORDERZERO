# OrderBlock Terminal (OrderZero) — Complete 1:1 Replication Guide

Welcome to **OrderBlock Terminal** (100% Free, Reverse-Engineered from `order-block.com`).

Everything has been completely rebuilt to match `order-block.com` exactly:
- **Exact Dark Palette:** `#090D16` deep void background, `#10B981` emerald demand, `#F43F5E` rose supply, `#F59E0B` target levels.
- **Matching Typography:** Google Fonts `Inter Tight` (data headers & metrics) + `JetBrains Mono` (price levels, ticks & coordinates).
- **All 200+ Active NSE F&O Stocks:** Real 222-symbol database with sectors, lot sizes, base prices, and 50-day Average Daily Move (ADM).
- **Proprietary Strength Metric:** $\text{Strength} = \frac{\text{one-directional move from open}}{\text{50-day ADM}}$.
- **2:1 Direction Gate:** Movement in favored direction must be at least $2.0\times$ adverse counter-travel; otherwise score resets to `0.0`.
- **Dual Boards:** Top 20 Bullish & Top 20 Bearish contenders with sparklines, percentiles, and live rule tags.
- **Top 3 Filtered Picks:** Automated Sector Cap ($\le 2$ per sector) and Event-Risk Filter ($>3.5\times$ ADM excluded).
- **10-Second Diagnostic Popup:** Identifies $Z$ (Entry Zone), $S_1$ (Stop / Invalidation), $R_1 / R_2$ (Targets), Risk-to-Reward ratio, VWAP, and completed 5m candle chart.
- **5-Step Daily Routine Flowchart:** Step-by-step interactive playbook from 09:20 IST breadth scan to trade execution and journal logging.
- **Trade Journal:** Auto-prefilled from the diagnostic popup with a 30-day P&L calendar heatmap.
- **100% Free Forever:** Zero paywalls, zero subscription fees.

---

## 🚀 How to Deploy / Update on GitHub, Vercel & Render

You have a ready-made ZIP archive inside this folder:
📁 `orderblock_complete_update.zip`

### Option A: Drag & Drop via GitHub Web (No Git CLI needed)
1. Go to your GitHub repository: [https://github.com/aryanbairwa786/ORDERZERO](https://github.com/aryanbairwa786/ORDERZERO)
2. Extract `orderblock_complete_update.zip` on your computer or simply drag and drop the updated files/folders (`apps`, `services`, `README.md`, etc.) directly into the GitHub web page.
3. Click **Commit changes**.
4. **Vercel** and **Render** will automatically detect the commit and deploy the new version in ~2 minutes!

### Option B: If Git CLI is installed
```bash
git add .
git commit -m "feat: complete 1:1 OrderBlock terminal replication (222 F&O stocks, breadth strip, dual boards, popup, playbook)"
git push origin main
```

---

## 💻 Local Quickstart

### Run with Docker (1 Command)
```bash
docker compose up --build
```
Then visit:
- **Terminal:** `http://localhost:3000/dashboard`
- **Playbook & Flowchart:** `http://localhost:3000/playbook`
- **Trade Journal:** `http://localhost:3000/journal`
- **Disclosures:** `http://localhost:3000/disclosures`
- **Full Chart:** `http://localhost:3000/chart/NIFTY%2050`

### Run Without Docker

**Terminal 1 (Python FastAPI SMC Engine):**
```bash
cd services/smc-engine
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Next.js 14 Web Frontend):**
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📊 Complete 5-Step OrderBlock Routine

1. **09:20 IST — Read Breadth & Sectors:** Check the top 0.00% baseline scatter strip. If green dots dominate $\rightarrow$ Bullish Day. If red dots dominate $\rightarrow$ Bearish Day.
2. **09:25 IST — Choose Board:** Pick the direction with dominant breadth momentum.
3. **09:30 IST — Check Top 3 Picks:** Filtered with Sector Cap ($\le 2$ per sector) and event-risk filter.
4. **09:35 IST — Open Diagnostic Popup:** Inspect the 10-second zone checklist: Entry $Z$, Invalidation $S_1$, Target $R_1 / R_2$, Risk:Reward $\ge 2.5:1$.
5. **Execute & Log to Journal:** Click "Log to Journal" directly from the popup to pre-fill your trade details and record your setup tags.
