export type Strategy =
  | "rental"
  | "flip"
  | "brrrr"
  | "multifamily"
  | "commercial"
  | "airbnb"
  | "wholesale";

export type DealStatus = "watching" | "underwriting" | "offer" | "passed" | "closed";

export type LeaseType = "gross" | "modified" | "nnn";

export interface Loan {
  id: string;
  name: string;
  type: "amortizing" | "interest_only" | "cash";
  amountMode: "ltv" | "dollars";
  ltvBase: "purchase" | "arv";
  ltvPercent: number;
  amount: number;
  rate: number;
  termYears: number;
  interestOnlyYears: number;
  pointsPercent: number;
  fees: number;
}

export interface Unit {
  id: string;
  name: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
}

export interface RehabItem {
  id: string;
  name: string;
  cost: number;
}

export interface Comp {
  id: string;
  kind: "sold" | "active" | "rent";
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  priceBasis: "sold" | "list" | "rent";
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
  date: string;
  photo: string;
  distanceMiles: number | null;
  selected: boolean;
}

export interface HistoryEvent {
  date: string;
  event: string;
  price: number;
}

export interface Assumptions {
  purchasePrice: number;
  arv: number;
  rentMonthly: number;
  otherIncomeMonthly: number;
  vacancyPercent: number;
  taxesAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  utilitiesMonthly: number;
  otherMonthly: number;
  managementPercent: number;
  repairsPercent: number;
  capexPercent: number;
  expenseRecoveriesAnnual: number;
  rentGrowthPercent: number;
  expenseGrowthPercent: number;
  appreciationPercent: number;
  holdYears: number;
  sellCostPercent: number;
  buyClosingPercent: number;
  buyClosingFlat: number;
  holdingMonths: number;
  seasonMonths: number;
  adr: number;
  occupancyPercent: number;
  cleaningFeePerStay: number;
  avgStayNights: number;
  platformFeePercent: number;
  refiLtvPercent: number;
  refiRate: number;
  refiTermYears: number;
  refiCostsPercent: number;
  refiInterestOnly: boolean;
  assignmentFee: number;
  arvRulePercent: number;
  loans: Loan[];
}

export interface Deal {
  id: string;
  createdAt: string;
  updatedAt: string;
  sample: boolean;
  status: DealStatus;
  strategy: Strategy;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  stories: number;
  garage: number;
  unitCount: number;
  propertyType: string;
  listPrice: number;
  listingStatus: string;
  description: string;
  photos: string[];
  sourceUrl: string;
  sourceName: string;
  agentName: string;
  brokerage: string;
  mls: string;
  taxesSource: "listing" | "estimate" | "manual";
  insuranceSource: "estimate" | "manual";
  rentSource: "comps" | "manual" | "listing" | "none";
  arvSource: "comps" | "list" | "estimate" | "manual";
  leaseType: LeaseType;
  assumptions: Assumptions;
  rentRoll: Unit[];
  rehabItems: RehabItem[];
  comps: Comp[];
  history: HistoryEvent[];
  notes: string;
}

export interface Rule {
  enabled: boolean;
  value: number;
}

export interface Criteria {
  minCashFlow: Rule;
  minCoc: Rule;
  minCap: Rule;
  minDscr: Rule;
  minIrr: Rule;
  maxPrice: Rule;
  minBeds: Rule;
  minRentRatio: Rule;
  maxPricePerSqft: Rule;
  minFlipProfit: Rule;
  minFlipRoi: Rule;
  states: string[];
}

export interface OfferTargets {
  useArvRule: boolean;
  arvRulePercent: number;
  arvFee: number;
  useCashFlow: boolean;
  cashFlow: number;
  useCoc: boolean;
  coc: number;
  useCap: boolean;
  cap: number;
  useDscr: boolean;
  dscr: number;
  useFlipProfit: boolean;
  flipProfit: number;
  useFlipRoi: boolean;
  flipRoi: number;
  useRentRule: boolean;
  rentRulePercent: number;
  usePpsf: boolean;
  ppsf: number;
  usePerDoor: boolean;
  perDoor: number;
  useCashLeft: boolean;
  cashLeft: number;
}

export interface Template {
  id: string;
  name: string;
  strategy: Strategy;
  builtIn?: boolean;
  assumptions: Assumptions;
}

export interface Brand {
  company: string;
  analyst: string;
  email: string;
  phone: string;
  footer: string;
  logoDataUrl: string;
}

export interface LenderContact {
  id: string;
  name: string;
  kind: string;
  phone: string;
  email: string;
  notes: string;
  url: string;
}

export const STRATEGIES: { id: Strategy; label: string; blurb: string }[] = [
  { id: "rental", label: "Rental", blurb: "Buy and hold cash flow" },
  { id: "brrrr", label: "BRRRR", blurb: "Rehab, rent, refinance" },
  { id: "flip", label: "Flip", blurb: "Rehab and resell" },
  { id: "multifamily", label: "Multifamily", blurb: "Rent roll and per door" },
  { id: "commercial", label: "Commercial", blurb: "NOI, cap rate, DSCR" },
  { id: "airbnb", label: "Airbnb", blurb: "Short-term occupancy" },
  { id: "wholesale", label: "Wholesale", blurb: "Contract and assignment" },
];

export const STATUSES: { id: DealStatus; label: string }[] = [
  { id: "watching", label: "Watching" },
  { id: "underwriting", label: "Underwriting" },
  { id: "offer", label: "Offer" },
  { id: "closed", label: "Closed" },
  { id: "passed", label: "Passed" },
];
