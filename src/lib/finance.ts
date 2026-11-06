import type { Assumptions, Deal, Loan, Strategy } from "@/lib/types";

export interface Slice {
  payment: number;
  interest: number;
  principal: number;
  balanceAfter: number;
}

export interface YearRow {
  year: number;
  grossRent: number;
  egi: number;
  opex: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  principal: number;
  interest: number;
  balance: number;
  value: number;
  equity: number;
  saleProceeds: number;
  cumulativeCashFlow: number;
  irrIfSold: number | null;
}

export interface Analysis {
  strategy: Strategy;
  rehab: number;
  scheduledMonthly: number;
  gprMonthly: number;
  vacancyMonthly: number;
  egiMonthly: number;
  opexMonthly: number;
  noiAnnual: number;
  debtServiceAnnual: number;
  cashFlowAnnual: number;
  cashFlowMonthly: number;
  loanAmount: number;
  loanPayment: number;
  closingCosts: number;
  cashInvested: number;
  infiniteReturn: boolean;
  capRate: number | null;
  yieldOnCost: number | null;
  cashOnCash: number | null;
  grm: number | null;
  dscr: number | null;
  breakEvenRatio: number | null;
  rentToPrice: number | null;
  opexRatio: number | null;
  pricePerSqft: number | null;
  pricePerDoor: number | null;
  costBasis: number;
  valueNow: number;
  equityNow: number;
  years: YearRow[];
  irr: number | null;
  expenseLines: { label: string; annual: number }[];
  flip: {
    profit: number;
    roi: number | null;
    annualized: number | null;
    totalCost: number;
    interest: number;
    holdMonths: number;
    netSale: number;
    cashInvested: number;
  } | null;
  brrrr: {
    cashIn: number;
    refiLoan: number;
    refiCosts: number;
    payoff: number;
    cashOut: number;
    cashLeft: number;
  } | null;
  wholesale: {
    mao: number;
    contract: number;
    buyerPrice: number;
    spread: number;
    rulePercent: number;
    rehab: number;
  } | null;
}

function n(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

function ratio(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 1e-6) return null;
  return num / den;
}

export function effectiveRehab(deal: Deal): number {
  return deal.rehabItems.reduce((s, item) => s + n(item.cost), 0);
}

export function loanPrincipal(loan: Loan, price: number, arv: number): number {
  if (loan.type === "cash") return 0;
  if (loan.amountMode === "dollars") return Math.max(0, n(loan.amount));
  const base = loan.ltvBase === "arv" ? arv : price;
  return Math.max(0, base * (n(loan.ltvPercent) / 100));
}

function pmt(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return principal / months;
  const g = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * g) / (g - 1);
}

export function buildSchedule(loan: Loan, amount: number, months: number): Slice[] {
  const out: Slice[] = [{ payment: 0, interest: 0, principal: 0, balanceAfter: amount }];
  if (amount <= 0 || loan.type === "cash") {
    for (let m = 1; m <= months; m++) out.push({ payment: 0, interest: 0, principal: 0, balanceAfter: 0 });
    return out;
  }
  const r = n(loan.rate) / 100 / 12;
  const term = Math.max(1, Math.round(n(loan.termYears) * 12));
  const ioMonths = loan.type === "interest_only" ? term : Math.min(term, Math.max(0, Math.round(n(loan.interestOnlyYears) * 12)));
  const amortMonths = Math.max(1, term - ioMonths);
  const amortPayment = loan.type === "interest_only" ? 0 : pmt(amount, r, amortMonths);
  let balance = amount;
  for (let m = 1; m <= months; m++) {
    if (balance <= 0.5 || m > term) {
      out.push({ payment: 0, interest: 0, principal: 0, balanceAfter: 0 });
      balance = 0;
      continue;
    }
    const interest = balance * r;
    let principal = 0;
    let payment = 0;
    if (m <= ioMonths) {
      payment = interest;
      if (m === term) {
        principal = balance;
        payment += principal;
        balance = 0;
      }
    } else {
      payment = amortPayment;
      principal = Math.min(balance, Math.max(0, payment - interest));
      if (m === term) principal = balance;
      payment = interest + principal;
      balance = Math.max(0, balance - principal);
    }
    out.push({ payment, interest, principal, balanceAfter: balance });
  }
  return out;
}

function merge(schedules: Slice[][], months: number): Slice[] {
  const out: Slice[] = [];
  for (let m = 0; m <= months; m++) {
    let payment = 0;
    let interest = 0;
    let principal = 0;
    let balanceAfter = 0;
    for (const s of schedules) {
      const sl = s[m] ?? s[s.length - 1];
      if (!sl) continue;
      payment += sl.payment;
      interest += sl.interest;
      principal += sl.principal;
      balanceAfter += sl.balanceAfter;
    }
    out.push({ payment, interest, principal, balanceAfter });
  }
  return out;
}

function sliceYear(sched: Slice[], year: number) {
  let payment = 0;
  let interest = 0;
  let principal = 0;
  for (let m = (year - 1) * 12 + 1; m <= year * 12; m++) {
    const s = sched[m];
    if (!s) break;
    payment += s.payment;
    interest += s.interest;
    principal += s.principal;
  }
  const end = sched[Math.min(sched.length - 1, year * 12)];
  return { payment, interest, principal, balance: end?.balanceAfter ?? 0 };
}

function sumRange(sched: Slice[], from: number, to: number, key: keyof Slice): number {
  let t = 0;
  for (let m = from; m <= to; m++) t += sched[m]?.[key] ?? 0;
  return t;
}

export function irrAnnual(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;
  if (!cashflows.some((c) => c > 0) || !cashflows.some((c) => c < 0)) return null;
  const npv = (rate: number) => cashflows.reduce((s, c, t) => s + c / Math.pow(1 + rate, t), 0);
  let lo = -0.9;
  let hi = 5;
  let npvLo = npv(lo);
  let npvHi = npv(hi);
  for (let k = 0; k < 10 && npvLo * npvHi > 0; k++) {
    hi = hi * 2 + 1;
    npvHi = npv(hi);
  }
  if (npvLo * npvHi > 0) return null;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-4) return mid;
    if (npvLo * v <= 0) {
      hi = mid;
      npvHi = v;
    } else {
      lo = mid;
      npvLo = v;
    }
  }
  return (lo + hi) / 2;
}

interface OpYear {
  scheduledAnnual: number;
  gprAnnual: number;
  vacancyAnnual: number;
  egiAnnual: number;
  opexAnnual: number;
  noiAnnual: number;
  lines: { label: string; annual: number }[];
}

function operatingYear(deal: Deal, year: number): OpYear {
  const a = deal.assumptions;
  const y = Math.max(1, year);
  const rentG = Math.pow(1 + n(a.rentGrowthPercent) / 100, y - 1);
  const expG = Math.pow(1 + n(a.expenseGrowthPercent) / 100, y - 1);
  const base = monthlyIncome(deal);
  const scheduledAnnual = base.scheduled * 12 * rentG;
  const otherAnnual = n(a.otherIncomeMonthly) * 12 * rentG;
  const recoveries = n(a.expenseRecoveriesAnnual) * expG;
  const vacancyAnnual = deal.strategy === "airbnb" ? 0 : scheduledAnnual * (n(a.vacancyPercent) / 100);
  const gprAnnual = scheduledAnnual + otherAnnual;
  const egiAnnual = scheduledAnnual - vacancyAnnual + otherAnnual + recoveries;
  const taxes = n(a.taxesAnnual) * expG;
  const insurance = n(a.insuranceAnnual) * expG;
  const hoa = n(a.hoaMonthly) * 12 * expG;
  const utilities = n(a.utilitiesMonthly) * 12 * expG;
  const other = n(a.otherMonthly) * 12 * expG;
  const management = egiAnnual * (n(a.managementPercent) / 100);
  const repairs = scheduledAnnual * (n(a.repairsPercent) / 100);
  const capex = scheduledAnnual * (n(a.capexPercent) / 100);
  const lines = [
    { label: "Property tax", annual: taxes },
    { label: "Insurance", annual: insurance },
    { label: "HOA", annual: hoa },
    { label: "Utilities", annual: utilities },
    { label: "Other", annual: other },
    { label: "Management", annual: management },
    { label: "Repairs", annual: repairs },
    { label: "Capex reserves", annual: capex },
  ].filter((l) => l.annual > 0.5);
  const opexAnnual = taxes + insurance + hoa + utilities + other + management + repairs + capex;
  return {
    scheduledAnnual,
    gprAnnual,
    vacancyAnnual,
    egiAnnual,
    opexAnnual,
    noiAnnual: egiAnnual - opexAnnual,
    lines,
  };
}

function monthlyIncome(deal: Deal): { scheduled: number } {
  const a = deal.assumptions;
  if (deal.strategy === "airbnb") {
    const occ = n(a.occupancyPercent) / 100;
    const nights = (365 / 12) * occ;
    const room = n(a.adr) * nights * (1 - n(a.platformFeePercent) / 100);
    const stays = n(a.avgStayNights) > 0 ? nights / n(a.avgStayNights) : 0;
    const cleaning = n(a.cleaningFeePerStay) * stays;
    return { scheduled: room + cleaning };
  }
  const roll = deal.rentRoll.reduce((s, u) => s + n(u.rent), 0);
  const scheduled = deal.rentRoll.length > 0 ? roll : n(a.rentMonthly);
  return { scheduled };
}

function pointsAndFees(loans: { loan: Loan; amount: number }[]): number {
  return loans.reduce((s, l) => s + l.amount * (n(l.loan.pointsPercent) / 100) + n(l.loan.fees), 0);
}

function project(opts: {
  deal: Deal;
  sched: Slice[];
  cashInvested: number;
  value0: number;
  hold: number;
}): { years: YearRow[]; irr: number | null } {
  const a = opts.deal.assumptions;
  const appr = n(a.appreciationPercent) / 100;
  const sell = n(a.sellCostPercent) / 100;
  const years: YearRow[] = [];
  let cumulative = 0;
  const flows: number[] = [-opts.cashInvested];
  for (let year = 1; year <= opts.hold; year++) {
    const op = operatingYear(opts.deal, year);
    const debt = sliceYear(opts.sched, year);
    const cashFlow = op.noiAnnual - debt.payment;
    cumulative += cashFlow;
    const endValue = opts.value0 * Math.pow(1 + appr, year);
    const saleProceeds = endValue * (1 - sell) - debt.balance;
    const equity = endValue - debt.balance;
    flows.push(cashFlow);
    const withSale = flows.slice(0, -1).concat(cashFlow + saleProceeds);
    years.push({
      year,
      grossRent: op.gprAnnual,
      egi: op.egiAnnual,
      opex: op.opexAnnual,
      noi: op.noiAnnual,
      debtService: debt.payment,
      cashFlow,
      principal: debt.principal,
      interest: debt.interest,
      balance: debt.balance,
      value: endValue,
      equity,
      saleProceeds,
      cumulativeCashFlow: cumulative,
      irrIfSold: (() => {
        const r = irrAnnual(withSale);
        return r == null ? null : r * 100;
      })(),
    });
  }
  const terminal = years[years.length - 1];
  const irr = terminal ? terminal.irrIfSold : null;
  return { years, irr };
}

function emptyAnalysis(strategy: Strategy): Analysis {
  return {
    strategy,
    rehab: 0,
    scheduledMonthly: 0,
    gprMonthly: 0,
    vacancyMonthly: 0,
    egiMonthly: 0,
    opexMonthly: 0,
    noiAnnual: 0,
    debtServiceAnnual: 0,
    cashFlowAnnual: 0,
    cashFlowMonthly: 0,
    loanAmount: 0,
    loanPayment: 0,
    closingCosts: 0,
    cashInvested: 0,
    infiniteReturn: false,
    capRate: null,
    yieldOnCost: null,
    cashOnCash: null,
    grm: null,
    dscr: null,
    breakEvenRatio: null,
    rentToPrice: null,
    opexRatio: null,
    pricePerSqft: null,
    pricePerDoor: null,
    costBasis: 0,
    valueNow: 0,
    equityNow: 0,
    years: [],
    irr: null,
    expenseLines: [],
    flip: null,
    brrrr: null,
    wholesale: null,
  };
}

export function analyze(deal: Deal): Analysis {
  const a = deal.assumptions;
  const price = Math.max(0, n(a.purchasePrice));
  const arv = n(a.arv) > 0 ? n(a.arv) : price;
  const rehab = effectiveRehab(deal);
  const funded = a.loans.map((loan) => ({ loan, amount: loanPrincipal(loan, price, arv) }));
  const loanAmount = funded.reduce((s, l) => s + l.amount, 0);
  const months = 12 * 41;
  const schedules = funded.map((l) => buildSchedule(l.loan, l.amount, months));
  const sched = merge(schedules, months);
  const closingCosts = price * (n(a.buyClosingPercent) / 100) + n(a.buyClosingFlat) + pointsAndFees(funded);
  const op = operatingYear(deal, 1);
  const doors = Math.max(1, deal.rentRoll.length || deal.unitCount || 1);
  const base: Analysis = {
    ...emptyAnalysis(deal.strategy),
    rehab,
    scheduledMonthly: op.scheduledAnnual / 12,
    gprMonthly: op.gprAnnual / 12,
    vacancyMonthly: op.vacancyAnnual / 12,
    egiMonthly: op.egiAnnual / 12,
    opexMonthly: op.opexAnnual / 12,
    noiAnnual: op.noiAnnual,
    loanAmount,
    closingCosts,
    expenseLines: op.lines,
    pricePerSqft: ratio(price, deal.sqft),
    pricePerDoor: price / doors,
    costBasis: price + rehab + closingCosts,
    capRate: ratio(op.noiAnnual * 100, price),
    yieldOnCost: ratio(op.noiAnnual * 100, price + rehab + closingCosts),
    grm: ratio(price, op.scheduledAnnual),
    rentToPrice: ratio(op.scheduledAnnual / 12, price),
    opexRatio: ratio(op.opexAnnual * 100, op.egiAnnual),
  };

  const opsCarryMonthly = n(a.taxesAnnual) / 12 + n(a.insuranceAnnual) / 12 + n(a.hoaMonthly) + n(a.utilitiesMonthly) + n(a.otherMonthly);

  if (deal.strategy === "wholesale") {
    const rule = n(a.arvRulePercent) || 70;
    const mao = arv * (rule / 100) - rehab;
    const spread = n(a.assignmentFee);
    return {
      ...base,
      wholesale: { mao, contract: price, buyerPrice: price + spread, spread, rulePercent: rule, rehab },
      cashInvested: 0,
      valueNow: arv,
      equityNow: arv - price,
    };
  }

  if (deal.strategy === "flip") {
    const holdMonths = Math.max(1, Math.round(n(a.holdingMonths) || 6));
    const interest = sumRange(sched, 1, holdMonths, "interest");
    const carryOps = opsCarryMonthly * holdMonths;
    const payoff = sched[holdMonths]?.balanceAfter ?? 0;
    const sellCosts = arv * (n(a.sellCostPercent) / 100);
    const netSale = arv - sellCosts - payoff;
    const cashInvested = price - loanAmount + closingCosts + rehab + carryOps + interest;
    const profit = netSale - cashInvested;
    const roi = ratio(profit * 100, cashInvested);
    const annualized = roi == null ? null : roi * (12 / holdMonths);
    const totalCost = price + closingCosts + rehab + carryOps + interest + sellCosts;
    return {
      ...base,
      loanPayment: sched[1]?.payment ?? 0,
      cashInvested,
      infiniteReturn: cashInvested <= 0 && profit > 0,
      cashOnCash: ratio(profit * 100, cashInvested),
      valueNow: arv,
      equityNow: arv - loanAmount,
      flip: { profit, roi, annualized, totalCost, interest, holdMonths, netSale, cashInvested },
    };
  }

  let active = sched;
  let cashInvested = 0;
  let brrrr: Analysis["brrrr"] = null;
  if (deal.strategy === "brrrr") {
    const season = Math.max(0, Math.round(n(a.seasonMonths)));
    const payoff = sched[season]?.balanceAfter ?? loanAmount;
    const carryDebt = sumRange(sched, 1, season, "payment");
    const cashIn = price - loanAmount + closingCosts + rehab + opsCarryMonthly * season + carryDebt;
    const refiLoan = arv * (n(a.refiLtvPercent) / 100);
    const refiCosts = refiLoan * (n(a.refiCostsPercent) / 100);
    const cashOut = refiLoan - refiCosts - payoff;
    const cashLeft = cashIn - cashOut;
    const refiLoanShape: Loan = {
      id: "refi",
      name: "Refinance",
      type: a.refiInterestOnly ? "interest_only" : "amortizing",
      amountMode: "dollars",
      ltvBase: "arv",
      ltvPercent: n(a.refiLtvPercent),
      amount: refiLoan,
      rate: n(a.refiRate),
      termYears: n(a.refiTermYears) || 30,
      interestOnlyYears: 0,
      pointsPercent: 0,
      fees: 0,
    };
    active = buildSchedule(refiLoanShape, refiLoan, months);
    cashInvested = cashLeft;
    brrrr = { cashIn, refiLoan, refiCosts, payoff, cashOut, cashLeft };
  } else {
    const holdM = Math.max(0, Math.round(n(a.holdingMonths)));
    const carryDebt = sumRange(sched, 1, holdM, "payment");
    cashInvested = price - loanAmount + closingCosts + rehab + opsCarryMonthly * holdM + carryDebt;
  }

  const debtY1 = sliceYear(active, 1);
  const cashFlowAnnual = op.noiAnnual - debtY1.payment;
  const infiniteReturn = cashInvested <= 1 && cashFlowAnnual > 0;
  const hold = Math.min(40, Math.max(1, Math.round(n(a.holdYears) || 10)));
  const value0 = rehab > 0 || deal.strategy === "brrrr" ? arv : price;
  const projected = project({ deal, sched: active, cashInvested, value0, hold });
  const balance0 = active[0]?.balanceAfter ?? 0;

  return {
    ...base,
    debtServiceAnnual: debtY1.payment,
    cashFlowAnnual,
    cashFlowMonthly: cashFlowAnnual / 12,
    loanPayment: active[1]?.payment ?? 0,
    loanAmount: deal.strategy === "brrrr" ? (brrrr?.refiLoan ?? loanAmount) : loanAmount,
    cashInvested,
    infiniteReturn,
    cashOnCash: infiniteReturn ? null : ratio(cashFlowAnnual * 100, cashInvested),
    dscr: ratio(op.noiAnnual, debtY1.payment),
    breakEvenRatio: ratio((op.opexAnnual + debtY1.payment) * 100, op.scheduledAnnual),
    valueNow: value0,
    equityNow: value0 - balance0,
    years: projected.years,
    irr: projected.irr,
    brrrr,
  };
}

export function withAssumption(deal: Deal, partial: Partial<Assumptions>): Deal {
  return { ...deal, assumptions: { ...deal.assumptions, ...partial, loans: partial.loans ?? deal.assumptions.loans } };
}

export function strategyFamily(strategy: Strategy): "income" | "flip" | "wholesale" {
  if (strategy === "flip") return "flip";
  if (strategy === "wholesale") return "wholesale";
  return "income";
}
