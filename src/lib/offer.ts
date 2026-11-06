import { analyze, effectiveRehab, withAssumption, type Analysis } from "@/lib/finance";
import type { Deal, OfferTargets } from "@/lib/types";

export interface OfferLine {
  id: string;
  label: string;
  price: number | null;
  note: string;
}

function round100(n: number): number {
  return Math.round(n / 100) * 100;
}

function searchMax(deal: Deal, ok: (row: Analysis) => boolean): number | null {
  const cheap = analyze(withAssumption(deal, { purchasePrice: 1000 }));
  if (!ok(cheap)) return null;
  let lo = 1000;
  let hi = 8_000_000;
  if (ok(analyze(withAssumption(deal, { purchasePrice: hi })))) return round100(hi);
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (ok(analyze(withAssumption(deal, { purchasePrice: mid })))) lo = mid;
    else hi = mid;
  }
  return round100(lo);
}

export function offerLines(deal: Deal, targets: OfferTargets): OfferLine[] {
  const rehab = effectiveRehab(deal);
  const lines: OfferLine[] = [];
  const arv = deal.assumptions.arv > 0 ? deal.assumptions.arv : deal.assumptions.purchasePrice;

  if (targets.useArvRule) {
    const price = arv * (targets.arvRulePercent / 100) - rehab - targets.arvFee;
    lines.push({
      id: "arv",
      label: `${targets.arvRulePercent}% of ARV`,
      price: price > 0 ? round100(price) : null,
      note: `ARV − rehab − ${targets.arvFee.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} fee`,
    });
  }
  if (targets.useCap) {
    const noi = analyze(deal).noiAnnual;
    const price = targets.cap > 0 ? noi / (targets.cap / 100) : null;
    lines.push({
      id: "cap",
      label: `${targets.cap}% cap rate`,
      price: price && price > 0 ? round100(price) : null,
      note: "NOI is held constant (taxes don’t scale with price)",
    });
  }
  if (targets.useRentRule) {
    const rent = analyze(deal).scheduledMonthly;
    const price = targets.rentRulePercent > 0 ? rent / (targets.rentRulePercent / 100) : null;
    lines.push({
      id: "rent",
      label: `${targets.rentRulePercent}% rent rule`,
      price: price && price > 0 ? round100(price) : null,
      note: "Monthly rent ÷ rule",
    });
  }
  if (targets.usePpsf && deal.sqft > 0) {
    lines.push({
      id: "ppsf",
      label: "Max price / sqft",
      price: round100(targets.ppsf * deal.sqft),
      note: `${deal.sqft.toLocaleString()} sqft`,
    });
  }
  if (targets.usePerDoor) {
    const doors = Math.max(1, deal.rentRoll.length || deal.unitCount || 1);
    lines.push({
      id: "door",
      label: "Max price / door",
      price: round100(targets.perDoor * doors),
      note: `${doors} doors`,
    });
  }
  if (targets.useCashFlow && deal.strategy !== "flip" && deal.strategy !== "wholesale") {
    lines.push({
      id: "cf",
      label: `$${targets.cashFlow}/mo cash flow`,
      price: searchMax(deal, (row) => row.cashFlowMonthly >= targets.cashFlow),
      note: "Highest price that still clears the monthly target",
    });
  }
  if (targets.useCoc && deal.strategy !== "flip" && deal.strategy !== "wholesale") {
    lines.push({
      id: "coc",
      label: `${targets.coc}% cash-on-cash`,
      price: searchMax(deal, (row) => row.infiniteReturn || (row.cashOnCash ?? -999) >= targets.coc),
      note: "Highest price that still clears the return",
    });
  }
  if (targets.useDscr && deal.strategy !== "flip" && deal.strategy !== "wholesale") {
    lines.push({
      id: "dscr",
      label: `${targets.dscr.toFixed(2)} DSCR`,
      price: searchMax(deal, (row) => (row.dscr ?? 99) >= targets.dscr),
      note: "NOI ÷ debt service",
    });
  }
  if (targets.useCashLeft && deal.strategy === "brrrr") {
    lines.push({
      id: "left",
      label: `≤ $${targets.cashLeft.toLocaleString()} left in`,
      price: searchMax(deal, (row) => (row.brrrr?.cashLeft ?? 9e9) <= targets.cashLeft),
      note: "After refinance",
    });
  }
  if (targets.useFlipProfit && deal.strategy === "flip") {
    lines.push({
      id: "profit",
      label: `$${targets.flipProfit.toLocaleString()} flip profit`,
      price: searchMax(deal, (row) => (row.flip?.profit ?? -9e9) >= targets.flipProfit),
      note: "After interest, carry, and selling costs",
    });
  }
  if (targets.useFlipRoi && deal.strategy === "flip") {
    lines.push({
      id: "roi",
      label: `${targets.flipRoi}% flip ROI`,
      price: searchMax(deal, (row) => (row.flip?.roi ?? -999) >= targets.flipRoi),
      note: "Profit ÷ cash invested",
    });
  }
  return lines;
}

export function recommendedOffer(lines: OfferLine[]): number | null {
  const prices = lines.map((l) => l.price).filter((p): p is number => p != null && p > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}
