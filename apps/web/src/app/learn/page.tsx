"use client";

import { useState } from "react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { SebiDisclaimerBar } from "@/components/compliance/SebiDisclaimerBar";

const GUIDES = [
  {
    id: "ob",
    enTitle: "Order Blocks (OB)",
    hiTitle: "ऑर्डर ब्लॉक (Order Block)",
    enBody:
      "A Bullish Order Block is the last bearish candle before a strong upward impulse that breaks market structure (BOS/CHoCH). Institutional desks often leave resting limit orders in this zone, causing price to react on retest.",
    hiBody:
      "बुलिश ऑर्डर ब्लॉक उस मज़बूत तेज़ी (impulse) से ठीक पहले की आखिरी लाल (bearish) कैंडल होती है जो मार्केट स्ट्रक्चर (BOS/CHoCH) को तोड़ती है। बड़े संस्थानों के बचे हुए ऑर्डर अक्सर इस ज़ोन में रहते हैं, जहाँ कीमत वापस आने पर रिएक्ट करती है।",
  },
  {
    id: "bos",
    enTitle: "BOS & CHoCH (Market Structure)",
    hiTitle: "BOS और CHoCH (मार्केट स्ट्रक्चर)",
    enBody:
      "Break of Structure (BOS) confirms trend continuation when a candle closes beyond the prior swing high/low in the trend direction. Change of Character (CHoCH) signals a potential reversal when price breaks the opposing swing.",
    hiBody:
      "ब्रेक ऑफ स्ट्रक्चर (BOS) ट्रेंड के जारी रहने की पुष्टि करता है जब कैंडल पिछले स्विंग हाई/लो के पार बंद होती है। चेंज ऑफ कैरेक्टर (CHoCH) संभावित ट्रेंड रिवर्सल का संकेत देता है।",
  },
  {
    id: "fvg",
    enTitle: "Fair Value Gaps (FVG / Imbalance)",
    hiTitle: "फेयर वैल्यू गैप (FVG / असंतुलन)",
    enBody:
      "A 3-candle price imbalance where candle 1's high does not overlap candle 3's low (bullish FVG). Markets frequently revisit these inefficiencies before continuing. OrderZero auto-hides FVGs once 100% filled.",
    hiBody:
      "यह 3-कैंडल का प्राइस इम्बैलेंस है जहाँ पहली कैंडल का हाई तीसरी कैंडल के लो को नहीं छूता। मार्केट अक्सर इस गैप को भरने के लिए वापस आता है। 100% भरने पर OrderZero इसे ऑटो-हाइड कर देता है।",
  },
  {
    id: "liq",
    enTitle: "Liquidity Pools & Stop Hunts (Sweeps)",
    hiTitle: "लिक्विडिटी और स्टॉप हंट (Sweep)",
    enBody:
      "Equal Highs (EQH) and Equal Lows (EQL) accumulate retail stop-losses. A Liquidity Sweep happens when a candle wick pierces those stops and closes back inside the range—often right before a sharp reversal.",
    hiBody:
      "इक्वल हाई (EQH) और इक्वल लो (EQL) के पास रिटेल स्टॉप-लॉस जमा होते हैं। लिक्विडिटी स्वीप तब होता है जब कैंडल की विक स्टॉप-लॉस को हिट करके वापस रेंज के अंदर बंद हो जाती है।",
  },
];

export default function LearnPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-white">
      <AppNavbar />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {lang === "en" ? "SMC Education Hub" : "SMC एजुकेशन हब (हिन्दी)"}
            </h1>
            <p className="text-xs text-zinc-400">
              {lang === "en"
                ? "Illustrated Smart Money Concepts guides for NSE & BSE traders"
                : "भारतीय शेयर बाजार (NSE & BSE) ट्रेडर्स के लिए चित्रित SMC गाइड"}
            </p>
          </div>
          <div className="flex rounded-lg border border-zinc-800 bg-[#141417] p-1 text-xs">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded px-3 py-1 font-semibold ${
                lang === "en" ? "bg-[#10B981] text-[#09090B]" : "text-zinc-400"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`rounded px-3 py-1 font-semibold ${
                lang === "hi" ? "bg-[#8B5CF6] text-white" : "text-zinc-400"
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-zinc-800 bg-[#141417] p-5"
            >
              <div className="mb-3 rounded-lg border border-zinc-800 bg-[#09090B] p-3">
                <svg viewBox="0 0 280 90" className="h-20 w-full">
                  <rect
                    x="18"
                    y="48"
                    width="235"
                    height="26"
                    fill="rgba(16,185,129,0.18)"
                    stroke="#10B981"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="18"
                    y1="61"
                    x2="253"
                    y2="61"
                    stroke="#10B981"
                    strokeDasharray="4 3"
                    strokeWidth="1"
                  />
                  <polyline
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    points="20,58 55,68 95,22 145,56 215,14 255,10"
                  />
                  <text x="115" y="18" fill="#8B5CF6" fontSize="9" fontFamily="monospace">
                    BOS / CHoCH
                  </text>
                  <text x="24" y="44" fill="#10B981" fontSize="9" fontFamily="monospace">
                    OB 50% Mean Threshold
                  </text>
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">
                {lang === "en" ? g.enTitle : g.hiTitle}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                {lang === "en" ? g.enBody : g.hiBody}
              </p>
            </div>
          ))}
        </div>
      </main>
      <SebiDisclaimerBar />
    </div>
  );
}
