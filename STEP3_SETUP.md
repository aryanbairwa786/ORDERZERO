# OrderZero — Step 3 Setup & Run Guide (Chart Page + SMC/MTF Overlays + DhanHQ v2)

## 1. Run the FastAPI SMC Engine (Port 8000)

```bash
cd services/smc-engine
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 -m unittest discover -s tests -v   # Verifies all 13 unit tests (SMC + DhanHQ v2)
uvicorn app.main:app --reload --port 8000
```

## 2. Run the OrderZero Next.js 14+ Terminal (Port 3000)

```bash
cd apps/web
cp ../../.env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` (redirects automatically to `/chart/NIFTY%2050`).

## 3. Connect Your Own DhanHQ v2 Live Account (Optional)

1. Click **Demo • Connect DhanHQ** in the top toolbar.
2. Enter your personal **Dhan Client ID** and **DhanHQ v2 Access Token**.
3. OrderZero switches from Demo Mode to your live DhanHQ v2 REST historical candles and binary WebSocket tick feed (`series.update()` batched via `requestAnimationFrame`).
