import { analyze, strategyFamily, type Analysis } from "@/lib/finance";
import type { Criteria, Deal } from "@/lib/types";

export interface Check {
  label: string;
  pass: boolean;
  actual: string;
  target: string;
}

export interface Screen {
  pass: boolean;
  checks: Check[];
}

function money0(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function screenDeal(deal: Deal, criteria: Criteria, precomputed?: Analysis): Screen {
  const a = precomputed ?? analyze(deal);
  const family = strategyFamily(deal.strategy);
  const checks: Check[] = [];
  const push = (enabled: boolean, label: string, pass: boolean, actual: string, target: string) => {
    if (!enabled) return;
    checks.push({ label, pass, actual, target });
  };

  if (criteria.states.length > 0) {
    const ok = criteria.states.map((s) => s.toUpperCase()).includes(deal.state.toUpperCase());
    push(true, "State", ok, deal.state || "—", criteria.states.join(", "));
  }
  push(criteria.maxPrice.enabled, "Max price", deal.assumptions.purchasePrice <= criteria.maxPrice.value, money0(deal.assumptions.purchasePrice), money0(criteria.maxPrice.value));
  push(criteria.minBeds.enabled, "Min beds", deal.beds >= criteria.minBeds.value, String(deal.beds || 0), String(criteria.minBeds.value));
  if (deal.sqft > 0) {
    const ppsf = deal.assumptions.purchasePrice / deal.sqft;
    push(criteria.maxPricePerSqft.enabled, "Max $/sqft", ppsf <= criteria.maxPricePerSqft.value, `$${Math.round(ppsf)}`, `$${Math.round(criteria.maxPricePerSqft.value)}`);
  }

  if (family === "income") {
    push(criteria.minCashFlow.enabled, "Cash flow", a.cashFlowMonthly >= criteria.minCashFlow.value, money0(a.cashFlowMonthly) + "/mo", money0(criteria.minCashFlow.value) + "/mo");
    push(criteria.minCoc.enabled, "Cash-on-cash", a.infiniteReturn || (a.cashOnCash ?? -Infinity) >= criteria.minCoc.value, a.infiniteReturn ? "∞" : `${(a.cashOnCash ?? 0).toFixed(1)}%`, `${criteria.minCoc.value}%`);
    push(criteria.minCap.enabled, "Cap rate", (a.capRate ?? -Infinity) >= criteria.minCap.value, `${(a.capRate ?? 0).toFixed(1)}%`, `${criteria.minCap.value}%`);
    push(criteria.minDscr.enabled, "DSCR", (a.dscr ?? Infinity) >= criteria.minDscr.value, a.dscr == null ? "—" : a.dscr.toFixed(2), criteria.minDscr.value.toFixed(2));
    push(criteria.minIrr.enabled, "IRR", (a.irr ?? -Infinity) >= criteria.minIrr.value, a.irr == null ? "—" : `${a.irr.toFixed(1)}%`, `${criteria.minIrr.value}%`);
    const ratio = (a.rentToPrice ?? 0) * 100;
    push(criteria.minRentRatio.enabled, "Rent ratio", ratio >= criteria.minRentRatio.value, `${ratio.toFixed(2)}%`, `${criteria.minRentRatio.value}%`);
  }
  if (family === "flip" && a.flip) {
    push(criteria.minFlipProfit.enabled, "Flip profit", a.flip.profit >= criteria.minFlipProfit.value, money0(a.flip.profit), money0(criteria.minFlipProfit.value));
    push(criteria.minFlipRoi.enabled, "Flip ROI", (a.flip.roi ?? -Infinity) >= criteria.minFlipRoi.value, a.flip.roi == null ? "∞" : `${a.flip.roi.toFixed(1)}%`, `${criteria.minFlipRoi.value}%`);
  }
  if (family === "wholesale" && a.wholesale) {
    push(true, "At or under MAO", a.wholesale.contract <= a.wholesale.mao + 1, money0(a.wholesale.contract), money0(a.wholesale.mao));
  }

  return { pass: checks.every((c) => c.pass), checks };
}
