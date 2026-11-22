/**
 * OrderBlock Core Analytical Engine (Reverse-Engineered Methodology).
 *
 * Rules:
 * 1. Strength Formula:
 *    strength = today's one-directional move from open / stock's average daily move (ADM-50)
 * 2. Direction Gate:
 *    A move counts ONLY when clearly one-sided: distance travelled on one side of open
 *    must be MORE THAN TWICE (>2.0x) the distance on the other side. Otherwise score = 0.
 * 3. Board Selection:
 *    Cleanly rising names -> Bullish Board (Top 20).
 *    Cleanly falling names -> Bearish Board (Top 20).
 * 4. Top 3 Pick Filters:
 *    - Sector Cap: Maximum 2 stocks per sector across the top 3.
 *    - Extreme excursion: a generated move above the static ADM threshold gets a review flag.
 * 5. Zone Reconstruction:
 *    - OB Box: Last opposite candle range [obLow, obHigh]
 *    - Z: Reference planning level
 *    - S1 / R1: Invalidation stop level
 *    - R1/R2 or S1/S2: Liquidity targets
 *    - R:R: Modeled reward / risk ratio
 *    - VWAP: Volume-weighted session reference
 */

import { FNO_STOCKS, FNOInstrument } from "./fno-universe";

export type RuleStatus =
  | "PICK · BULLISH #1"
  | "PICK · BULLISH #2"
  | "PICK · BULLISH #3"
  | "PICK · BEARISH #1"
  | "PICK · BEARISH #2"
  | "PICK · BEARISH #3"
  | "QUALIFIED"
  | "NOT PICKED · sector cap"
  | "NOT PICKED · extreme move"
  | "BELOW THRESHOLD";

export interface StockOrderBlockCard {
  symbol: string;
  name: string;
  sector: string;
  marketCap: "Large" | "Mid";
  lotSize: number;
  ltp: number;
  open: number;
  high: number;
  low: number;
  changePct: number;
  oneDirectionalMovePct: number;
  oppositeMovePct: number;
  adm50: number;
  strengthScore: number; // e.g. 1.84 (normalized against ADM)
  percentile: string;    // e.g. "p99.8"
  rank: number;
  totalBoardCount: number;
  boardType: "bullish" | "bearish";
  ruleStatus: RuleStatus;
  ruleExplanation: string;

  // Structural Levels
  obRange: { low: number; high: number };
  zoneLevelZ: number;       // Z (Entry reference)
  invalidationS1: number;   // S1 for bull, R1 for bear (invalidation level)
  targetR1: number;         // First liquidity target (R1 for bull, S1 for bear)
  targetR2: number;         // Second liquidity target (R2 for bull, S2 for bear)
  targetR3?: number;
  additionalLevels: { label: string; price: number }[]; // S2-S4 or R2-R4
  riskPerShare: number;
  rewardPerShare: number;
  riskRewardRatio: string;  // e.g. "1 : 2.8"
  vwap: number;
  vwapDistancePct: number;
  sessionPath: number[];    // 10-point normalized intraday trajectory for sparkline
  candles5m: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export interface TerminalState {
  dataMode: "synthetic_demo";
  dataNotice: string;
  marketStatus: "OPEN" | "CLOSED";
  sessionTimeIST: string;
  refreshSecondsLeft: number;
  totalFNO: number;
  advancesCount: number;
  declinesCount: number;
  breadthScatter: {
    symbol: string;
    changePct: number;
    strengthScore: number;
    isTopPick: boolean;
    pickLabel?: string;
    board: "bullish" | "bearish" | "neutral";
  }[];
  sectorFlows: { sector: string; changePct: number; count: number }[];
  bullishBoard: StockOrderBlockCard[];
  bearishBoard: StockOrderBlockCard[];
  topBullishPicks: StockOrderBlockCard[];
  topBearishPicks: StockOrderBlockCard[];
}

// Pseudo-deterministic random generator using seed for consistent real-feel session replay
function pseudoHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateTerminalData(sessionDateSeed: string = "demo-session"): TerminalState {
  const instruments = FNO_STOCKS;
  const processed: {
    inst: FNOInstrument;
    ltp: number;
    open: number;
    high: number;
    low: number;
    changePct: number;
    oneDirectionalMovePct: number;
    oppositeMovePct: number;
    passesDirectionGate: boolean;
    strengthScore: number;
    isExtremeMove: boolean;
  }[] = [];

  // Generate realistic OHLC and session moves aligned to 50-day ADM
  instruments.forEach((inst, idx) => {
    const seed = pseudoHash(`${sessionDateSeed}-${inst.symbol}-${idx}`);
    const noise = ((seed % 1000) / 1000) * 2 - 1; // -1.0 to +1.0

    // Sector momentum tilt (IT and Banking bullish, Metals & Energy mixed/bearish)
    let sectorTilt = 0.0;
    if (inst.sector === "IT") sectorTilt = 0.95;
    else if (inst.sector === "Banking") sectorTilt = 0.45;
    else if (inst.sector === "Auto") sectorTilt = 0.60;
    else if (inst.sector === "Realty") sectorTilt = 0.70;
    else if (inst.sector === "Metals") sectorTilt = -0.75;
    else if (inst.sector === "Energy") sectorTilt = -0.35;
    else if (inst.sector === "FMCG") sectorTilt = -0.15;

    const baseAdm = inst.adm50; // in %
    const excursionMult = noise * 1.6 + sectorTilt;
    const changePct = Number((baseAdm * excursionMult).toFixed(2));

    const base = inst.basePrice;
    const ltp = Number((base * (1 + changePct / 100)).toFixed(2));
    const open = base;

    // One-sided vs Adverse Move
    let high = 0;
    let low = 0;
    let oneDirectionalMovePct = 0;
    let oppositeMovePct = 0;

    if (changePct >= 0) {
      high = Number((ltp * 1.004).toFixed(2));
      const adverseExcursion = baseAdm * (((seed % 300) / 1000) * 0.45); // small pull below open
      low = Number((open * (1 - adverseExcursion / 100)).toFixed(2));
      oneDirectionalMovePct = Number(((high - open) / open * 100).toFixed(2));
      oppositeMovePct = Number(((open - low) / open * 100).toFixed(2));
    } else {
      low = Number((ltp * 0.996).toFixed(2));
      const adverseExcursion = baseAdm * (((seed % 300) / 1000) * 0.45); // small pull above open
      high = Number((open * (1 + adverseExcursion / 100)).toFixed(2));
      oneDirectionalMovePct = Number(((open - low) / open * 100).toFixed(2));
      oppositeMovePct = Number(((high - open) / open * 100).toFixed(2));
    }

    // Direction Gate: one side must be > 2.0x the other side!
    const passesDirectionGate = oppositeMovePct === 0 || (oneDirectionalMovePct / Math.max(oppositeMovePct, 0.01)) >= 2.0;

    // Generated example flag; this does not use news or event data.
    const isExtremeMove = oneDirectionalMovePct > baseAdm * 3.6;

    let strengthScore = 0.0;
    if (passesDirectionGate) {
      strengthScore = Number((oneDirectionalMovePct / baseAdm).toFixed(2));
    }

    processed.push({
      inst,
      ltp,
      open,
      high,
      low,
      changePct,
      oneDirectionalMovePct,
      oppositeMovePct,
      passesDirectionGate,
      strengthScore,
      isExtremeMove,
    });
  });

  // Split into Bullish (>0) and Bearish (<0) contenders
  const rawBullish = processed
    .filter((p) => p.changePct > 0 && p.strengthScore > 0)
    .sort((a, b) => b.strengthScore - a.strengthScore);

  const rawBearish = processed
    .filter((p) => p.changePct < 0 && p.strengthScore > 0)
    .sort((a, b) => b.strengthScore - a.strengthScore);

  // Helper to build rich StockOrderBlockCard
  const buildCards = (
    list: typeof processed,
    boardType: "bullish" | "bearish",
    totalBoard: number
  ): StockOrderBlockCard[] => {
    const cards: StockOrderBlockCard[] = [];
    const sectorCountMap: Record<string, number> = {};
    let pickRank = 1;

    list.slice(0, 20).forEach((item, index) => {
      const rank = index + 1;
      const pctValue = boardType === "bullish"
        ? (100 - (rank / totalBoard) * 10).toFixed(1)
        : ((rank / totalBoard) * 10).toFixed(1);
      const percentile = `p${pctValue}`;

      let ruleStatus: RuleStatus = "QUALIFIED";
      let ruleExplanation = `Passed 2:1 direction gate with ${item.strengthScore}x ADM intraday strength.`;

      // Pick logic (Top 3 per board, max 2 per sector)
      if (item.isExtremeMove) {
        ruleStatus = "NOT PICKED · extreme move";
        ruleExplanation = "Generated excursion exceeded the static ADM review threshold; this is not a news-based event flag.";
      } else if (pickRank <= 3) {
        const sectorCount = sectorCountMap[item.inst.sector] || 0;
        if (sectorCount >= 2) {
          ruleStatus = "NOT PICKED · sector cap";
          ruleExplanation = `Max 2 generated picks reached for ${item.inst.sector} sector.`;
        } else {
          sectorCountMap[item.inst.sector] = sectorCount + 1;
          ruleStatus = (boardType === "bullish"
            ? `PICK · BULLISH #${pickRank}`
            : `PICK · BEARISH #${pickRank}`) as RuleStatus;
          ruleExplanation = `Generated top-three shortlist example for the ${boardType} board.`;
          pickRank++;
        }
      }

      // Reconstruct structural levels
      const ltp = item.ltp;
      const adm = item.inst.adm50;
      const obHeight = Number((ltp * (adm * 0.22 / 100)).toFixed(2));

      let obLow = 0;
      let obHigh = 0;
      let zoneLevelZ = 0;
      let invalidationS1 = 0;
      let targetR1 = 0;
      let targetR2 = 0;
      let riskPerShare = 0;
      let rewardPerShare = 0;
      const additionalLevels: { label: string; price: number }[] = [];

      if (boardType === "bullish") {
        obHigh = Number((ltp * 0.992).toFixed(2));
        obLow = Number((obHigh - obHeight).toFixed(2));
        zoneLevelZ = obHigh; // Zone top is entry
        invalidationS1 = Number((obLow - ltp * 0.002).toFixed(2)); // Buffer below OB
        riskPerShare = Number((zoneLevelZ - invalidationS1).toFixed(2));
        targetR1 = Number((zoneLevelZ + riskPerShare * 1.8).toFixed(2));
        targetR2 = Number((zoneLevelZ + riskPerShare * 3.2).toFixed(2));
        rewardPerShare = Number((targetR1 - zoneLevelZ).toFixed(2));

        additionalLevels.push(
          { label: "S2", price: Number((invalidationS1 - riskPerShare * 0.8).toFixed(2)) },
          { label: "S3", price: Number((invalidationS1 - riskPerShare * 1.6).toFixed(2)) },
          { label: "S4", price: Number((invalidationS1 - riskPerShare * 2.5).toFixed(2)) }
        );
      } else {
        obLow = Number((ltp * 1.008).toFixed(2));
        obHigh = Number((obLow + obHeight).toFixed(2));
        zoneLevelZ = obLow; // Zone bottom is short entry
        invalidationS1 = Number((obHigh + ltp * 0.002).toFixed(2)); // Buffer above OB
        riskPerShare = Number((invalidationS1 - zoneLevelZ).toFixed(2));
        targetR1 = Number((zoneLevelZ - riskPerShare * 1.8).toFixed(2));
        targetR2 = Number((zoneLevelZ - riskPerShare * 3.2).toFixed(2));
        rewardPerShare = Number((zoneLevelZ - targetR1).toFixed(2));

        additionalLevels.push(
          { label: "R2", price: Number((invalidationS1 + riskPerShare * 0.8).toFixed(2)) },
          { label: "R3", price: Number((invalidationS1 + riskPerShare * 1.6).toFixed(2)) },
          { label: "R4", price: Number((invalidationS1 + riskPerShare * 2.5).toFixed(2)) }
        );
      }

      const rrRatioNum = Number((rewardPerShare / Math.max(riskPerShare, 0.01)).toFixed(1));
      const riskRewardRatio = `1 : ${rrRatioNum}`;

      const vwap = Number((ltp * (boardType === "bullish" ? 0.994 : 1.006)).toFixed(2));
      const vwapDistancePct = Number(((ltp - vwap) / vwap * 100).toFixed(2));

      // Generate 10-point normalized session trend for sparkline
      const sessionPath = [
        item.open,
        boardType === "bullish" ? item.low : item.high,
        Number((item.open * 0.5 + item.ltp * 0.5).toFixed(2)),
        Number((item.open * 0.3 + item.ltp * 0.7).toFixed(2)),
        Number((item.ltp * 0.95).toFixed(2)),
        Number((item.ltp * 0.98).toFixed(2)),
        Number((item.ltp * 0.97).toFixed(2)),
        Number((item.ltp * 1.01).toFixed(2)),
        Number((item.ltp * 0.995).toFixed(2)),
        item.ltp,
      ];

      // Generate 5-minute candles for embedded lightweight chart
      const candles5m = [];
      const baseTime = Math.floor(new Date("2026-11-20T09:15:00+05:30").getTime() / 1000);
      let prevC = item.open;
      for (let cIdx = 0; cIdx < 36; cIdx++) {
        const time = baseTime + cIdx * 300;
        const progress = cIdx / 35;
        const targetPrice = item.open + (item.ltp - item.open) * progress;
        const cNoise = ((pseudoHash(`${item.inst.symbol}-c-${cIdx}`) % 100) / 100 - 0.48) * (item.ltp * 0.003);
        const cOpen = Number(prevC.toFixed(2));
        const cClose = Number((targetPrice + cNoise).toFixed(2));
        const cHigh = Number((Math.max(cOpen, cClose) + Math.abs(cNoise) * 0.8).toFixed(2));
        const cLow = Number((Math.min(cOpen, cClose) - Math.abs(cNoise) * 0.8).toFixed(2));
        const volume = Math.floor(1000 + (pseudoHash(`${item.inst.symbol}-v-${cIdx}`) % 8000));
        candles5m.push({ time, open: cOpen, high: cHigh, low: cLow, close: cClose, volume });
        prevC = cClose;
      }

      cards.push({
        symbol: item.inst.symbol,
        name: item.inst.name,
        sector: item.inst.sector,
        marketCap: item.inst.marketCap,
        lotSize: item.inst.lotSize,
        ltp,
        open: item.open,
        high: item.high,
        low: item.low,
        changePct: item.changePct,
        oneDirectionalMovePct: item.oneDirectionalMovePct,
        oppositeMovePct: item.oppositeMovePct,
        adm50: item.inst.adm50,
        strengthScore: item.strengthScore,
        percentile,
        rank,
        totalBoardCount: totalBoard,
        boardType,
        ruleStatus,
        ruleExplanation,
        obRange: { low: obLow, high: obHigh },
        zoneLevelZ,
        invalidationS1,
        targetR1,
        targetR2,
        additionalLevels,
        riskPerShare,
        rewardPerShare,
        riskRewardRatio,
        vwap,
        vwapDistancePct,
        sessionPath,
        candles5m,
      });
    });

    return cards;
  };

  const bullishBoard = buildCards(rawBullish, "bullish", rawBullish.length);
  const bearishBoard = buildCards(rawBearish, "bearish", rawBearish.length);

  const topBullishPicks = bullishBoard.filter((b) => b.ruleStatus.startsWith("PICK · BULLISH"));
  const topBearishPicks = bearishBoard.filter((b) => b.ruleStatus.startsWith("PICK · BEARISH"));

  // Calculate sector flows
  const sectorMap: Record<string, { totalChg: number; count: number }> = {};
  processed.forEach((p) => {
    const sec = p.inst.sector;
    if (!sectorMap[sec]) sectorMap[sec] = { totalChg: 0, count: 0 };
    sectorMap[sec].totalChg += p.changePct;
    sectorMap[sec].count += 1;
  });

  const sectorFlows = Object.entries(sectorMap)
    .map(([sector, val]) => ({
      sector,
      changePct: Number((val.totalChg / val.count).toFixed(2)),
      count: val.count,
    }))
    .sort((a, b) => b.changePct - a.changePct);

  // Scatter dots for breadth strip
  const breadthScatter = processed.map((p) => {
    const isBullPick = topBullishPicks.some((tp) => tp.symbol === p.inst.symbol);
    const isBearPick = topBearishPicks.some((tp) => tp.symbol === p.inst.symbol);
    let pickLabel: string | undefined = undefined;
    if (isBullPick) {
      const match = topBullishPicks.find((tp) => tp.symbol === p.inst.symbol);
      pickLabel = match?.ruleStatus;
    } else if (isBearPick) {
      const match = topBearishPicks.find((tp) => tp.symbol === p.inst.symbol);
      pickLabel = match?.ruleStatus;
    }

    return {
      symbol: p.inst.symbol,
      changePct: p.changePct,
      strengthScore: p.strengthScore,
      isTopPick: isBullPick || isBearPick,
      pickLabel,
      board: p.changePct > 0 ? ("bullish" as const) : p.changePct < 0 ? ("bearish" as const) : ("neutral" as const),
    };
  });

  const advances = processed.filter((p) => p.changePct > 0).length;
  const declines = processed.filter((p) => p.changePct < 0).length;

  return {
    dataMode: "synthetic_demo",
    dataNotice: "Generated demo prices, candles, ADM values, and order block levels. No exchange feed is connected.",
    marketStatus: "CLOSED", // Will display session closed banner if outside 09:15-15:30 IST
    sessionTimeIST: "15:30 IST (Previous Session Close)",
    refreshSecondsLeft: 60,
    totalFNO: instruments.length,
    advancesCount: advances,
    declinesCount: declines,
    breadthScatter,
    sectorFlows,
    bullishBoard,
    bearishBoard,
    topBullishPicks,
    topBearishPicks,
  };
}
