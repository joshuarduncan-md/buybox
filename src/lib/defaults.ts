import { newId } from "@/lib/cn";
import type { Assumptions, Criteria, Deal, Loan, OfferTargets, Strategy, Template } from "@/lib/types";

export function blankLoan(partial: Partial<Loan> = {}): Loan {
  return {
    id: partial.id ?? newId(),
    name: partial.name ?? "Primary loan",
    type: partial.type ?? "amortizing",
    amountMode: partial.amountMode ?? "ltv",
    ltvBase: partial.ltvBase ?? "purchase",
    ltvPercent: partial.ltvPercent ?? 80,
    amount: partial.amount ?? 0,
    rate: partial.rate ?? 6.75,
    termYears: partial.termYears ?? 30,
    interestOnlyYears: partial.interestOnlyYears ?? 0,
    pointsPercent: partial.pointsPercent ?? 0,
    fees: partial.fees ?? 0,
  };
}

export function blankAssumptions(partial: Partial<Assumptions> = {}): Assumptions {
  return {
    purchasePrice: partial.purchasePrice ?? 0,
    arv: partial.arv ?? 0,
    rentMonthly: partial.rentMonthly ?? 0,
    otherIncomeMonthly: partial.otherIncomeMonthly ?? 0,
    vacancyPercent: partial.vacancyPercent ?? 5,
    taxesAnnual: partial.taxesAnnual ?? 0,
    insuranceAnnual: partial.insuranceAnnual ?? 0,
    hoaMonthly: partial.hoaMonthly ?? 0,
    utilitiesMonthly: partial.utilitiesMonthly ?? 0,
    otherMonthly: partial.otherMonthly ?? 0,
    managementPercent: partial.managementPercent ?? 8,
    repairsPercent: partial.repairsPercent ?? 5,
    capexPercent: partial.capexPercent ?? 5,
    expenseRecoveriesAnnual: partial.expenseRecoveriesAnnual ?? 0,
    rentGrowthPercent: partial.rentGrowthPercent ?? 3,
    expenseGrowthPercent: partial.expenseGrowthPercent ?? 2,
    appreciationPercent: partial.appreciationPercent ?? 3,
    holdYears: partial.holdYears ?? 10,
    sellCostPercent: partial.sellCostPercent ?? 6,
    buyClosingPercent: partial.buyClosingPercent ?? 2,
    buyClosingFlat: partial.buyClosingFlat ?? 1500,
    holdingMonths: partial.holdingMonths ?? 0,
    seasonMonths: partial.seasonMonths ?? 0,
    adr: partial.adr ?? 180,
    occupancyPercent: partial.occupancyPercent ?? 62,
    cleaningFeePerStay: partial.cleaningFeePerStay ?? 140,
    avgStayNights: partial.avgStayNights ?? 3,
    platformFeePercent: partial.platformFeePercent ?? 3,
    refiLtvPercent: partial.refiLtvPercent ?? 75,
    refiRate: partial.refiRate ?? 6.75,
    refiTermYears: partial.refiTermYears ?? 30,
    refiCostsPercent: partial.refiCostsPercent ?? 3,
    refiInterestOnly: partial.refiInterestOnly ?? false,
    assignmentFee: partial.assignmentFee ?? 10000,
    arvRulePercent: partial.arvRulePercent ?? 70,
    loans: partial.loans ?? [blankLoan()],
  };
}

export function financingPreset(strategy: Strategy): Loan[] {
  if (strategy === "flip") {
    return [blankLoan({ name: "Hard money", type: "interest_only", ltvPercent: 90, rate: 12, termYears: 1, pointsPercent: 2 })];
  }
  if (strategy === "brrrr") {
    return [blankLoan({ name: "Bridge", type: "interest_only", ltvPercent: 80, rate: 10, termYears: 2, pointsPercent: 1.5 })];
  }
  if (strategy === "wholesale") {
    return [blankLoan({ name: "Cash", type: "cash", ltvPercent: 0, rate: 0, termYears: 0 })];
  }
  if (strategy === "commercial" || strategy === "multifamily") {
    return [blankLoan({ name: "Agency / bank", ltvPercent: 75, rate: 6.5, termYears: 25 })];
  }
  return [blankLoan()];
}

export function strategyTweaks(strategy: Strategy, base: Assumptions): Assumptions {
  const next = { ...base, loans: financingPreset(strategy) };
  if (strategy === "flip") {
    next.holdingMonths = 5;
    next.sellCostPercent = 7;
  }
  if (strategy === "brrrr") {
    next.seasonMonths = 6;
    next.holdingMonths = 0;
    next.refiLtvPercent = 75;
    next.refiRate = 6.75;
    next.refiTermYears = 30;
    next.refiCostsPercent = 3;
  }
  if (strategy === "airbnb") {
    next.vacancyPercent = 0;
    next.occupancyPercent = 62;
    next.managementPercent = 18;
    next.utilitiesMonthly = Math.max(base.utilitiesMonthly, 280);
    next.repairsPercent = 4;
    next.capexPercent = 4;
  }
  if (strategy === "commercial") {
    next.vacancyPercent = 7;
    next.managementPercent = 4;
  }
  if (strategy === "multifamily") {
    next.vacancyPercent = 6;
    next.managementPercent = 6;
  }
  if (strategy === "wholesale") {
    next.arvRulePercent = 70;
    next.assignmentFee = base.assignmentFee || 10000;
  }
  return next;
}

export function defaultCriteria(): Criteria {
  return {
    minCashFlow: { enabled: true, value: 150 },
    minCoc: { enabled: true, value: 8 },
    minCap: { enabled: true, value: 6 },
    minDscr: { enabled: true, value: 1.2 },
    minIrr: { enabled: false, value: 12 },
    maxPrice: { enabled: false, value: 500000 },
    minBeds: { enabled: false, value: 2 },
    minRentRatio: { enabled: false, value: 1 },
    maxPricePerSqft: { enabled: false, value: 250 },
    minFlipProfit: { enabled: true, value: 30000 },
    minFlipRoi: { enabled: true, value: 20 },
    states: [],
  };
}

export function defaultOffer(): OfferTargets {
  return {
    useArvRule: true,
    arvRulePercent: 70,
    arvFee: 10000,
    useCashFlow: true,
    cashFlow: 200,
    useCoc: true,
    coc: 8,
    useCap: true,
    cap: 6,
    useDscr: false,
    dscr: 1.25,
    useFlipProfit: true,
    flipProfit: 35000,
    useFlipRoi: true,
    flipRoi: 25,
    useRentRule: false,
    rentRulePercent: 1,
    usePpsf: false,
    ppsf: 200,
    usePerDoor: false,
    perDoor: 90000,
    useCashLeft: true,
    cashLeft: 15000,
  };
}

export function builtInTemplates(): Template[] {
  const rental = blankAssumptions();
  const flip = strategyTweaks("flip", blankAssumptions());
  const brrrr = strategyTweaks("brrrr", blankAssumptions());
  const str = strategyTweaks("airbnb", blankAssumptions());
  const houseHack = blankAssumptions({ vacancyPercent: 0, managementPercent: 0, repairsPercent: 4, capexPercent: 4 });
  return [
    { id: "tpl-rental", name: "Conservative rental", strategy: "rental", builtIn: true, assumptions: rental },
    { id: "tpl-hack", name: "House hack", strategy: "rental", builtIn: true, assumptions: houseHack },
    { id: "tpl-brrrr", name: "BRRRR bridge + 75% refi", strategy: "brrrr", builtIn: true, assumptions: brrrr },
    { id: "tpl-flip", name: "Hard-money flip", strategy: "flip", builtIn: true, assumptions: flip },
    { id: "tpl-str", name: "Short-term rental", strategy: "airbnb", builtIn: true, assumptions: str },
  ];
}

export function applyTemplateKeepingFacts(deal: Deal, template: Template): Assumptions {
  const a = template.assumptions;
  return {
    ...a,
    purchasePrice: deal.assumptions.purchasePrice,
    arv: deal.assumptions.arv,
    rentMonthly: deal.assumptions.rentMonthly,
    taxesAnnual: deal.assumptions.taxesAnnual,
    insuranceAnnual: deal.assumptions.insuranceAnnual,
    hoaMonthly: deal.assumptions.hoaMonthly,
    loans: a.loans.map((loan) => ({ ...loan, id: newId() })),
  };
}

export function touch(deal: Deal, partial: Partial<Deal>): Deal {
  return { ...deal, ...partial, updatedAt: new Date().toISOString() };
}
