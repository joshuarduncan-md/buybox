import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { newId } from "@/lib/cn";
import { applyTemplateKeepingFacts, builtInTemplates, financingPreset, strategyTweaks } from "@/lib/defaults";
import { analyze, effectiveRehab, strategyFamily, withAssumption, type Analysis } from "@/lib/finance";
import { compactMoney, cocLabel, money, pct, place } from "@/lib/format";
import { offerLines, recommendedOffer } from "@/lib/offer";
import { screenDeal } from "@/lib/screen";
import { useAppStore } from "@/lib/store";
import type { Assumptions, Comp, Deal, Loan, Strategy } from "@/lib/types";
import { STATUSES, STRATEGIES } from "@/lib/types";
import { Button, Metric, Num, Panel, PhotoPlate, Pill, Select, TextField } from "@/components/ui";

const TABS = [
  ["overview", "Overview"],
  ["purchase", "Purchase"],
  ["financing", "Financing"],
  ["income", "Income"],
  ["expenses", "Expenses"],
  ["rehab", "Rehab"],
  ["projections", "Projections"],
  ["comps", "Comps"],
  ["offer", "Offer"],
  ["records", "Records"],
] as const;

function toneOf(n: number | null | undefined): "good" | "bad" | "ink" {
  if (n == null || !Number.isFinite(n) || n === 0) return "ink";
  return n > 0 ? "good" : "bad";
}

export function DealWorkspace({ deal }: { deal: Deal }) {
  const navigate = useNavigate();
  const mutate = useAppStore((s) => s.mutateDeal);
  const criteria = useAppStore((s) => s.criteria);
  const offer = useAppStore((s) => s.offer);
  const setOffer = useAppStore((s) => s.setOffer);
  const templates = useAppStore((s) => s.templates);
  const remove = useAppStore((s) => s.deleteDeal);
  const duplicate = useAppStore((s) => s.duplicateDeal);
  const saveTemplate = useAppStore((s) => s.saveTemplate);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.title = `${deal.address} · BuyBox`;
  }, [deal.address]);

  const analysis = useMemo(() => analyze(deal), [deal]);
  const screen = useMemo(() => screenDeal(deal, criteria, analysis), [deal, criteria, analysis]);
  const family = strategyFamily(deal.strategy);

  const setDeal = (partial: Partial<Deal>) => mutate(deal.id, (d) => ({ ...d, ...partial }));
  const setA = (partial: Partial<Assumptions>) =>
    mutate(deal.id, (d) => ({ ...d, assumptions: { ...d.assumptions, ...partial } }));

  const assessor = `https://www.google.com/search?q=${encodeURIComponent(
    `${deal.county} ${deal.state} property appraiser ${deal.address} ${deal.city}`.trim(),
  )}`;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <PhotoPlate photos={deal.photos} label={deal.address} className="h-44 rounded-lg md:h-full" />
        <div className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">{deal.propertyType || "Property"}</p>
              <h1 className="font-serif text-4xl leading-tight">{deal.address}</h1>
              <p className="text-muted">{place(deal)}{deal.neighborhood ? ` · ${deal.neighborhood}` : ""}</p>
            </div>
            <Pill tone={screen.pass ? "good" : "bad"}>{screen.pass ? "Meets buy box" : "Outside buy box"}</Pill>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted">
            <span>{deal.beds || "—"} bd</span>
            <span>{deal.baths || "—"} ba</span>
            <span>{deal.sqft ? `${deal.sqft.toLocaleString()} sf` : "— sf"}</span>
            <span>{deal.yearBuilt || "Year n/a"}</span>
            {deal.sample ? <Pill>Sample</Pill> : null}
            {deal.listingStatus ? <Pill>{deal.listingStatus.replaceAll("_", " ")}</Pill> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select label="Strategy" value={deal.strategy} onChange={(e) => setDeal({ strategy: e.target.value as Strategy })}>
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
            <Select label="Status" value={deal.status} onChange={(e) => setDeal({ status: e.target.value as Deal["status"] })}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
            <Select
              label="Template"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                const tpl = [...builtInTemplates(), ...templates].find((t) => t.id === id);
                if (!tpl) return;
                setDeal({ strategy: tpl.strategy, assumptions: applyTemplateKeepingFacts(deal, tpl) });
              }}
            >
              <option value="">Apply a template…</option>
              {builtInTemplates().map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/report/$id" params={{ id: deal.id }} className="inline-flex h-11 items-center rounded-md bg-moss px-4 text-sm font-medium text-paper">
              Report
            </Link>
            <Button variant="ghost" onClick={() => setDeal({ assumptions: strategyTweaks(deal.strategy, deal.assumptions) })}>
              Typical financing
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const name = window.prompt("Template name", `${deal.address} assumptions`);
                if (!name) return;
                saveTemplate({ id: newId(), name, strategy: deal.strategy, assumptions: deal.assumptions });
              }}
            >
              Save template
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const id = duplicate(deal.id);
                if (id) void navigate({ to: "/deal/$id", params: { id } });
              }}
            >
              Duplicate
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Remove this deal from the desk?")) {
                  remove(deal.id);
                  void navigate({ to: "/" });
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <Headline analysis={analysis} family={family} />
      </div>

      <div className="no-print flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "shrink-0 border-b-2 border-moss px-3 py-3 text-sm font-medium text-ink" : "shrink-0 px-3 py-3 text-sm text-muted"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <Overview deal={deal} analysis={analysis} screen={screen} mounted={mounted} /> : null}
      {tab === "purchase" ? <Purchase deal={deal} setA={setA} setDeal={setDeal} /> : null}
      {tab === "financing" ? <Financing deal={deal} setA={setA} /> : null}
      {tab === "income" ? <Income deal={deal} setA={setA} setDeal={setDeal} /> : null}
      {tab === "expenses" ? <Expenses deal={deal} setA={setA} setDeal={setDeal} /> : null}
      {tab === "rehab" ? <Rehab deal={deal} setDeal={setDeal} /> : null}
      {tab === "projections" ? <Projections deal={deal} analysis={analysis} mounted={mounted} setA={setA} /> : null}
      {tab === "comps" ? <Comps deal={deal} setA={setA} setDeal={setDeal} /> : null}
      {tab === "offer" ? <Offer deal={deal} setA={setA} offer={offer} setOffer={setOffer} /> : null}
      {tab === "records" ? <Records deal={deal} setDeal={setDeal} assessor={assessor} /> : null}
    </div>
  );
}

function Headline({ analysis, family }: { analysis: Analysis; family: ReturnType<typeof strategyFamily> }) {
  if (family === "flip" && analysis.flip) {
    return (
      <>
        <Metric label="Profit" value={money(analysis.flip.profit)} tone={toneOf(analysis.flip.profit)} />
        <Metric label="ROI" value={analysis.flip.roi == null ? "∞" : pct(analysis.flip.roi)} />
        <Metric label="Annualized" value={analysis.flip.annualized == null ? "—" : pct(analysis.flip.annualized)} hint={`${analysis.flip.holdMonths} month hold`} />
        <Metric label="Cash in" value={money(analysis.flip.cashInvested)} />
      </>
    );
  }
  if (family === "wholesale" && analysis.wholesale) {
    return (
      <>
        <Metric label="MAO" value={money(analysis.wholesale.mao)} tone="brass" />
        <Metric label="Contract" value={money(analysis.wholesale.contract)} />
        <Metric label="Assignment" value={money(analysis.wholesale.spread)} tone={toneOf(analysis.wholesale.spread)} />
        <Metric label="Buyer price" value={money(analysis.wholesale.buyerPrice)} />
      </>
    );
  }
  return (
    <>
      <Metric label="Cash flow" value={money(analysis.cashFlowMonthly)} tone={toneOf(analysis.cashFlowMonthly)} hint="per month" />
      <Metric label="Cash-on-cash" value={cocLabel(analysis.infiniteReturn, analysis.cashOnCash)} />
      <Metric label="Cap rate" value={pct(analysis.capRate)} hint={analysis.yieldOnCost != null ? `${pct(analysis.yieldOnCost)} on cost` : undefined} />
      <Metric label="DSCR" value={analysis.dscr == null ? "All cash" : analysis.dscr.toFixed(2)} hint={analysis.irr != null ? `${pct(analysis.irr)} IRR` : undefined} />
    </>
  );
}

function Overview({
  deal,
  analysis,
  screen,
  mounted,
}: {
  deal: Deal;
  analysis: Analysis;
  screen: ReturnType<typeof screenDeal>;
  mounted: boolean;
}) {
  const shocks = [-10, -5, 0, 5, 10].map((pctChange) => {
    const price = deal.assumptions.purchasePrice * (1 + pctChange / 100);
    const row = analyze(withAssumption(deal, { purchasePrice: Math.round(price) }));
    return { pctChange, row };
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Where the money goes">
        <div className="grid gap-3">
          {analysis.expenseLines.length === 0 ? <p className="text-sm text-muted">Add rent and expenses to see the stack.</p> : null}
          {analysis.expenseLines.map((line) => {
            const max = Math.max(...analysis.expenseLines.map((l) => l.annual), 1);
            return (
              <div key={line.label} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                <span>{line.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-card-2">
                  <span className="block h-full bg-moss" style={{ width: `${(line.annual / max) * 100}%` }} />
                </span>
                <span className="tabular-nums">{money(line.annual)}</span>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm md:grid-cols-4">
            <Mini k="NOI" v={money(analysis.noiAnnual)} />
            <Mini k="Debt service" v={money(analysis.debtServiceAnnual)} />
            <Mini k="GRM" v={analysis.grm == null ? "—" : analysis.grm.toFixed(1)} />
            <Mini k="Break-even" v={pct(analysis.breakEvenRatio)} />
            <Mini k="Opex ratio" v={pct(analysis.opexRatio)} />
            <Mini k="$ / sqft" v={analysis.pricePerSqft == null ? "—" : money(analysis.pricePerSqft)} />
            <Mini k="$ / door" v={money(analysis.pricePerDoor)} />
            <Mini k="Rent ratio" v={analysis.rentToPrice == null ? "—" : pct(analysis.rentToPrice * 100, 2)} />
          </div>
        </div>
      </Panel>
      <Panel title="Buy box">
        <ul className="grid gap-2">
          {screen.checks.length === 0 ? <li className="text-sm text-muted">No rules are turned on.</li> : null}
          {screen.checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
              <span>{c.label}</span>
              <span className={c.pass ? "text-good" : "text-bad"}>
                {c.actual} <span className="text-muted">/ {c.target}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Price sensitivity">
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">{strategyFamily(deal.strategy) === "flip" ? "Profit" : "Cash flow"}</th>
                <th className="py-2 font-medium">{strategyFamily(deal.strategy) === "flip" ? "ROI" : "CoC"}</th>
                <th className="py-2 font-medium">Cap</th>
              </tr>
            </thead>
            <tbody>
              {shocks.map((s) => (
                <tr key={s.pctChange} className="border-t border-line">
                  <td className="py-2 tabular-nums">{s.pctChange > 0 ? `+${s.pctChange}%` : `${s.pctChange}%`} · {money(s.row.strategy === "wholesale" ? deal.assumptions.purchasePrice : Math.round(deal.assumptions.purchasePrice * (1 + s.pctChange / 100)))}</td>
                  <td className="py-2 tabular-nums">{s.row.flip ? money(s.row.flip.profit) : money(s.row.cashFlowMonthly)}</td>
                  <td className="py-2 tabular-nums">{s.row.flip ? (s.row.flip.roi == null ? "∞" : pct(s.row.flip.roi)) : cocLabel(s.row.infiniteReturn, s.row.cashOnCash)}</td>
                  <td className="py-2 tabular-nums">{pct(s.row.capRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {mounted && analysis.years.length > 1 ? (
        <Panel title="Cash flow, ten years out">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.years.map((y) => ({ year: y.year, cash: Math.round(y.cashFlow) }))}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area dataKey="cash" stroke="var(--color-moss)" fill="var(--color-moss)" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
      {analysis.brrrr ? (
        <Panel title="Refinance">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <Mini k="Cash in before refi" v={money(analysis.brrrr.cashIn)} />
            <Mini k="New loan" v={money(analysis.brrrr.refiLoan)} />
            <Mini k="Payoff" v={money(analysis.brrrr.payoff)} />
            <Mini k="Refi costs" v={money(analysis.brrrr.refiCosts)} />
            <Mini k="Cash out" v={money(analysis.brrrr.cashOut)} />
            <Mini k="Left in deal" v={money(analysis.brrrr.cashLeft)} />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{k}</div>
      <div className="tabular-nums font-medium">{v}</div>
    </div>
  );
}

function Purchase({ deal, setA, setDeal }: { deal: Deal; setA: (p: Partial<Assumptions>) => void; setDeal: (p: Partial<Deal>) => void }) {
  const a = deal.assumptions;
  return (
    <div className="grid gap-4">
      <Panel title="Basis">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Num label="Purchase price" prefix="$" value={a.purchasePrice} onChange={(purchasePrice) => { setA({ purchasePrice }); setDeal({ arvSource: deal.arvSource }); }} />
          <Num label="After-repair value" prefix="$" value={a.arv} onChange={(arv) => { setA({ arv }); setDeal({ arvSource: "manual" }); }} hint={`Source: ${deal.arvSource}`} />
          <Num label="List price (reference)" prefix="$" value={deal.listPrice} onChange={(listPrice) => setDeal({ listPrice })} />
          <Num label="Buying costs" suffix="%" value={a.buyClosingPercent} onChange={(buyClosingPercent) => setA({ buyClosingPercent })} />
          <Num label="Buying costs flat" prefix="$" value={a.buyClosingFlat} onChange={(buyClosingFlat) => setA({ buyClosingFlat })} />
          <Num label="Selling costs" suffix="%" value={a.sellCostPercent} onChange={(sellCostPercent) => setA({ sellCostPercent })} />
          <Num label="Hold / carry months" value={a.holdingMonths} onChange={(holdingMonths) => setA({ holdingMonths })} hint="Before rent or during a flip" />
          <Num label="Appreciation" suffix="%" value={a.appreciationPercent} onChange={(appreciationPercent) => setA({ appreciationPercent })} />
          <Num label="Projection years" value={a.holdYears} onChange={(holdYears) => setA({ holdYears: Math.min(40, Math.max(1, holdYears)) })} />
          {deal.strategy === "brrrr" ? <Num label="Months to refinance" value={a.seasonMonths} onChange={(seasonMonths) => setA({ seasonMonths })} /> : null}
          {deal.strategy === "wholesale" ? (
            <>
              <Num label="Assignment fee" prefix="$" value={a.assignmentFee} onChange={(assignmentFee) => setA({ assignmentFee })} />
              <Num label="ARV rule" suffix="%" value={a.arvRulePercent} onChange={(arvRulePercent) => setA({ arvRulePercent })} />
            </>
          ) : null}
        </div>
      </Panel>
      <Panel title="Property facts">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Address" value={deal.address} onChange={(address) => setDeal({ address })} />
          <TextField label="City" value={deal.city} onChange={(city) => setDeal({ city })} />
          <TextField label="State" value={deal.state} onChange={(state) => setDeal({ state: state.toUpperCase().slice(0, 2) })} />
          <TextField label="ZIP" value={deal.zip} onChange={(zip) => setDeal({ zip })} />
          <Num label="Beds" value={deal.beds} onChange={(beds) => setDeal({ beds })} />
          <Num label="Baths" value={deal.baths} onChange={(baths) => setDeal({ baths })} />
          <Num label="Square feet" value={deal.sqft} onChange={(sqft) => setDeal({ sqft })} />
          <Num label="Lot sqft" value={deal.lotSqft} onChange={(lotSqft) => setDeal({ lotSqft })} />
          <Num label="Year built" value={deal.yearBuilt} onChange={(yearBuilt) => setDeal({ yearBuilt })} />
          <Num label="Units" value={deal.unitCount} onChange={(unitCount) => setDeal({ unitCount })} />
          <TextField label="Type" value={deal.propertyType} onChange={(propertyType) => setDeal({ propertyType })} />
        </div>
      </Panel>
    </div>
  );
}

function Financing({ deal, setA }: { deal: Deal; setA: (p: Partial<Assumptions>) => void }) {
  const loans = deal.assumptions.loans;
  const update = (id: string, partial: Partial<Loan>) =>
    setA({ loans: loans.map((loan) => (loan.id === id ? { ...loan, ...partial } : loan)) });
  return (
    <div className="grid gap-4">
      {loans.map((loan, index) => (
        <Panel
          key={loan.id}
          title={loan.name || `Loan ${index + 1}`}
          action={
            loans.length > 1 ? (
              <Button variant="ghost" onClick={() => setA({ loans: loans.filter((l) => l.id !== loan.id) })}>Remove</Button>
            ) : null
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Name" value={loan.name} onChange={(name) => update(loan.id, { name })} />
            <Select label="Structure" value={loan.type} onChange={(e) => update(loan.id, { type: e.target.value as Loan["type"] })}>
              <option value="amortizing">Amortizing</option>
              <option value="interest_only">Interest only</option>
              <option value="cash">Cash</option>
            </Select>
            <Select label="Amount from" value={loan.amountMode} onChange={(e) => update(loan.id, { amountMode: e.target.value as Loan["amountMode"] })}>
              <option value="ltv">Loan-to-value</option>
              <option value="dollars">Dollar amount</option>
            </Select>
            {loan.amountMode === "ltv" ? (
              <>
                <Num label="LTV" suffix="%" value={loan.ltvPercent} onChange={(ltvPercent) => update(loan.id, { ltvPercent })} />
                <Select label="LTV base" value={loan.ltvBase} onChange={(e) => update(loan.id, { ltvBase: e.target.value as Loan["ltvBase"] })}>
                  <option value="purchase">Purchase price</option>
                  <option value="arv">ARV</option>
                </Select>
              </>
            ) : (
              <Num label="Loan amount" prefix="$" value={loan.amount} onChange={(amount) => update(loan.id, { amount })} />
            )}
            <Num label="Rate" suffix="%" value={loan.rate} onChange={(rate) => update(loan.id, { rate })} />
            <Num label="Term" suffix="yrs" value={loan.termYears} onChange={(termYears) => update(loan.id, { termYears })} />
            <Num label="Interest-only" suffix="yrs" value={loan.interestOnlyYears} onChange={(interestOnlyYears) => update(loan.id, { interestOnlyYears })} hint="Ignored when the whole loan is interest-only" />
            <Num label="Points" suffix="%" value={loan.pointsPercent} onChange={(pointsPercent) => update(loan.id, { pointsPercent })} />
            <Num label="Lender fees" prefix="$" value={loan.fees} onChange={(fees) => update(loan.id, { fees })} />
          </div>
        </Panel>
      ))}
      <Button variant="ghost" onClick={() => setA({ loans: [...loans, financingPreset(deal.strategy)[0] ?? { id: newId(), name: "Second lien", type: "amortizing", amountMode: "dollars", ltvBase: "purchase", ltvPercent: 0, amount: 0, rate: 10, termYears: 10, interestOnlyYears: 0, pointsPercent: 1, fees: 0 }] })}>
        Add a loan
      </Button>
      {deal.strategy === "brrrr" ? (
        <Panel title="Refinance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Num label="LTV of ARV" suffix="%" value={deal.assumptions.refiLtvPercent} onChange={(refiLtvPercent) => setA({ refiLtvPercent })} />
            <Num label="Rate" suffix="%" value={deal.assumptions.refiRate} onChange={(refiRate) => setA({ refiRate })} />
            <Num label="Term" suffix="yrs" value={deal.assumptions.refiTermYears} onChange={(refiTermYears) => setA({ refiTermYears })} />
            <Num label="Costs" suffix="%" value={deal.assumptions.refiCostsPercent} onChange={(refiCostsPercent) => setA({ refiCostsPercent })} />
            <Select label="Payment" value={deal.assumptions.refiInterestOnly ? "io" : "am"} onChange={(e) => setA({ refiInterestOnly: e.target.value === "io" })}>
              <option value="am">Amortizing</option>
              <option value="io">Interest only</option>
            </Select>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Income({ deal, setA, setDeal }: { deal: Deal; setA: (p: Partial<Assumptions>) => void; setDeal: (p: Partial<Deal>) => void }) {
  const a = deal.assumptions;
  return (
    <div className="grid gap-4">
      <Panel title={deal.strategy === "airbnb" ? "Short-term income" : "Rent"}>
        {deal.strategy === "airbnb" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Num label="Average daily rate" prefix="$" value={a.adr} onChange={(adr) => setA({ adr })} />
            <Num label="Occupancy" suffix="%" value={a.occupancyPercent} onChange={(occupancyPercent) => setA({ occupancyPercent })} />
            <Num label="Platform fee" suffix="%" value={a.platformFeePercent} onChange={(platformFeePercent) => setA({ platformFeePercent })} />
            <Num label="Cleaning fee" prefix="$" value={a.cleaningFeePerStay} onChange={(cleaningFeePerStay) => setA({ cleaningFeePerStay })} />
            <Num label="Average stay" suffix="nights" value={a.avgStayNights} onChange={(avgStayNights) => setA({ avgStayNights })} />
            <Num label="Other income" prefix="$" suffix="/mo" value={a.otherIncomeMonthly} onChange={(otherIncomeMonthly) => setA({ otherIncomeMonthly })} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Num label="Monthly rent" prefix="$" value={a.rentMonthly} hint={deal.rentRoll.length ? "Ignored while a rent roll is present" : `Source: ${deal.rentSource}`} onChange={(rentMonthly) => { setA({ rentMonthly }); setDeal({ rentSource: "manual" }); }} />
            <Num label="Other income" prefix="$" suffix="/mo" value={a.otherIncomeMonthly} onChange={(otherIncomeMonthly) => setA({ otherIncomeMonthly })} />
            <Num label="Vacancy" suffix="%" value={a.vacancyPercent} onChange={(vacancyPercent) => setA({ vacancyPercent })} />
            <Num label="Rent growth" suffix="%" value={a.rentGrowthPercent} onChange={(rentGrowthPercent) => setA({ rentGrowthPercent })} />
          </div>
        )}
      </Panel>
      {deal.strategy !== "airbnb" ? (
        <Panel
          title="Rent roll"
          action={<Button variant="ghost" onClick={() => setDeal({ rentRoll: [...deal.rentRoll, { id: newId(), name: `Unit ${deal.rentRoll.length + 1}`, beds: 2, baths: 1, sqft: 0, rent: 0 }] })}>Add unit</Button>}
        >
          {deal.rentRoll.length === 0 ? <p className="text-sm text-muted">No units yet. A rent roll replaces the single monthly rent.</p> : null}
          <div className="grid gap-3">
            {deal.rentRoll.map((unit) => (
              <div key={unit.id} className="grid gap-2 rounded-md border border-line p-3 md:grid-cols-6">
                <TextField label="Unit" value={unit.name} onChange={(name) => setDeal({ rentRoll: deal.rentRoll.map((u) => u.id === unit.id ? { ...u, name } : u) })} />
                <Num label="Beds" value={unit.beds} onChange={(beds) => setDeal({ rentRoll: deal.rentRoll.map((u) => u.id === unit.id ? { ...u, beds } : u) })} />
                <Num label="Baths" value={unit.baths} onChange={(baths) => setDeal({ rentRoll: deal.rentRoll.map((u) => u.id === unit.id ? { ...u, baths } : u) })} />
                <Num label="Sqft" value={unit.sqft} onChange={(sqft) => setDeal({ rentRoll: deal.rentRoll.map((u) => u.id === unit.id ? { ...u, sqft } : u) })} />
                <Num label="Rent" prefix="$" value={unit.rent} onChange={(rent) => setDeal({ rentRoll: deal.rentRoll.map((u) => u.id === unit.id ? { ...u, rent } : u) })} />
                <div className="flex items-end">
                  <Button variant="ghost" onClick={() => setDeal({ rentRoll: deal.rentRoll.filter((u) => u.id !== unit.id) })}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Expenses({ deal, setA, setDeal }: { deal: Deal; setA: (p: Partial<Assumptions>) => void; setDeal: (p: Partial<Deal>) => void }) {
  const a = deal.assumptions;
  return (
    <Panel title="Operating expenses">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Num label="Taxes" prefix="$" suffix="/yr" hint={deal.taxesSource} value={a.taxesAnnual} onChange={(taxesAnnual) => { setA({ taxesAnnual }); setDeal({ taxesSource: "manual" }); }} />
        <Num label="Insurance" prefix="$" suffix="/yr" hint={deal.insuranceSource} value={a.insuranceAnnual} onChange={(insuranceAnnual) => { setA({ insuranceAnnual }); setDeal({ insuranceSource: "manual" }); }} />
        <Num label="HOA" prefix="$" suffix="/mo" value={a.hoaMonthly} onChange={(hoaMonthly) => setA({ hoaMonthly })} />
        <Num label="Utilities" prefix="$" suffix="/mo" value={a.utilitiesMonthly} onChange={(utilitiesMonthly) => setA({ utilitiesMonthly })} />
        <Num label="Other" prefix="$" suffix="/mo" value={a.otherMonthly} onChange={(otherMonthly) => setA({ otherMonthly })} />
        <Num label="Management" suffix="% of EGI" value={a.managementPercent} onChange={(managementPercent) => setA({ managementPercent })} />
        <Num label="Repairs" suffix="% of rent" value={a.repairsPercent} onChange={(repairsPercent) => setA({ repairsPercent })} />
        <Num label="Capex reserve" suffix="% of rent" value={a.capexPercent} onChange={(capexPercent) => setA({ capexPercent })} />
        <Num label="Expense growth" suffix="%" value={a.expenseGrowthPercent} onChange={(expenseGrowthPercent) => setA({ expenseGrowthPercent })} />
        <Num label="Expense recoveries" prefix="$" suffix="/yr" value={a.expenseRecoveriesAnnual} onChange={(expenseRecoveriesAnnual) => setA({ expenseRecoveriesAnnual })} />
        <Select label="Lease" value={deal.leaseType} onChange={(e) => setDeal({ leaseType: e.target.value as Deal["leaseType"] })}>
          <option value="gross">Gross</option>
          <option value="modified">Modified gross</option>
          <option value="nnn">NNN</option>
        </Select>
      </div>
      {deal.leaseType === "nnn" ? (
        <div className="mt-3">
          <Button variant="ghost" onClick={() => setA({ expenseRecoveriesAnnual: Math.round(a.taxesAnnual + a.insuranceAnnual) })}>
            Set recoveries to taxes + insurance
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function Rehab({ deal, setDeal }: { deal: Deal; setDeal: (p: Partial<Deal>) => void }) {
  const total = effectiveRehab(deal);
  const chips = ["Kitchen", "Baths", "Roof", "HVAC", "Electrical", "Plumbing", "Flooring", "Paint", "Windows", "Exterior", "Contingency"];
  return (
    <Panel title="Rehab budget" action={<span className="tabular-nums text-sm">{money(total)}</span>}>
      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map((name) => (
          <button key={name} type="button" className="rounded-full border border-line bg-paper px-3 py-2 text-xs" onClick={() => setDeal({ rehabItems: [...deal.rehabItems, { id: newId(), name, cost: 0 }] })}>
            {name}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {deal.rehabItems.map((item) => (
          <div key={item.id} className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
            <TextField label="Item" value={item.name} onChange={(name) => setDeal({ rehabItems: deal.rehabItems.map((r) => r.id === item.id ? { ...r, name } : r) })} />
            <Num label="Cost" prefix="$" value={item.cost} onChange={(cost) => setDeal({ rehabItems: deal.rehabItems.map((r) => r.id === item.id ? { ...r, cost } : r) })} />
            <div className="flex items-end">
              <Button variant="ghost" onClick={() => setDeal({ rehabItems: deal.rehabItems.filter((r) => r.id !== item.id) })}>Remove</Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Projections({
  deal,
  analysis,
  mounted,
  setA,
}: {
  deal: Deal;
  analysis: Analysis;
  mounted: boolean;
  setA: (p: Partial<Assumptions>) => void;
}) {
  if (deal.strategy === "flip" || deal.strategy === "wholesale") {
    return <p className="text-sm text-muted">Year-by-year projections are for holds. Switch to a rental, BRRRR, multifamily, commercial, or Airbnb strategy to see them. Flip profit is on the overview.</p>;
  }
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Num label="Years" value={deal.assumptions.holdYears} onChange={(holdYears) => setA({ holdYears: Math.min(40, Math.max(1, holdYears)) })} />
        <Num label="Rent growth" suffix="%" value={deal.assumptions.rentGrowthPercent} onChange={(rentGrowthPercent) => setA({ rentGrowthPercent })} />
        <Num label="Appreciation" suffix="%" value={deal.assumptions.appreciationPercent} onChange={(appreciationPercent) => setA({ appreciationPercent })} />
      </div>
      {mounted ? (
        <div className="h-56 rounded-lg border border-line bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.years}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={64} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area dataKey="cashFlow" name="Cash flow" stroke="var(--color-moss)" fill="var(--color-moss)" fillOpacity={0.15} />
              <Area dataKey="equity" name="Equity" stroke="var(--color-brass)" fill="var(--color-brass)" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-card-2 text-muted">
            <tr>
              {["Year", "Rent", "NOI", "Debt", "Cash flow", "Principal", "Value", "Equity", "If sold", "IRR"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analysis.years.map((y) => (
              <tr key={y.year} className="border-t border-line bg-card">
                <td className="px-3 py-2">{y.year}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.grossRent)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.noi)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.debtService)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.cashFlow)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.principal)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.value)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.equity)}</td>
                <td className="px-3 py-2 tabular-nums">{money(y.saleProceeds)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(y.irrIfSold)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Sale proceeds are net of selling costs and the loan payoff if you sold at the end of that year. IRR includes that sale. Operating cash flow does not.</p>
    </div>
  );
}

function Comps({ deal, setA, setDeal }: { deal: Deal; setA: (p: Partial<Assumptions>) => void; setDeal: (p: Partial<Deal>) => void }) {
  const groups: { kind: Comp["kind"]; title: string }[] = [
    { kind: "sold", title: "Sold" },
    { kind: "active", title: "Active listings" },
    { kind: "rent", title: "Rentals" },
  ];
  const flip = (comp: Comp) =>
    setDeal({ comps: deal.comps.map((c) => (c.id === comp.id && c.kind === comp.kind ? { ...c, selected: !c.selected } : c)) });
  const applyValue = () => {
    const picked = deal.comps.filter((c) => c.selected && c.kind !== "rent" && c.sqft > 0 && c.price > 0);
    if (!picked.length || deal.sqft <= 0) return;
    const ppsf = picked.reduce((s, c) => s + c.price / c.sqft, 0) / picked.length;
    setA({ arv: Math.round(ppsf * deal.sqft) });
    setDeal({ arvSource: "comps" });
  };
  const applyRent = () => {
    const picked = deal.comps.filter((c) => c.selected && c.kind === "rent" && c.price > 0);
    if (!picked.length) return;
    const rent = Math.round(picked.reduce((s, c) => s + c.price, 0) / picked.length);
    if (deal.rentRoll.length) return;
    setA({ rentMonthly: rent });
    setDeal({ rentSource: "comps" });
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={applyValue}>Use selected sales as ARV</Button>
        <Button variant="ghost" onClick={applyRent}>Use selected rents</Button>
      </div>
      <p className="text-sm text-muted">
        Sold prices are the public sold price when the state discloses it. In non-disclosure states you may only see the last list price, marked as list.
      </p>
      {deal.comps.length === 0 ? <p className="text-sm text-muted">No comps yet. Import a live listing, or add this deal by hand and underwrite without them.</p> : null}
      {groups.map((group) => {
        const rows = deal.comps.filter((c) => c.kind === group.kind);
        if (!rows.length) return null;
        return (
          <Panel key={group.kind} title={group.title}>
            <div className="grid gap-2">
              {rows.map((comp) => (
                <label key={`${comp.kind}-${comp.id}`} className="flex items-center gap-3 rounded-md border border-line p-2 text-sm">
                  <input type="checkbox" className="size-5 shrink-0 accent-moss" checked={comp.selected} onChange={() => flip(comp)} />
                  {comp.photo ? <img src={comp.photo} alt="" className="h-14 w-16 shrink-0 rounded-sm object-cover" /> : <span className="lot-plate h-14 w-16 shrink-0 rounded-sm" />}
                  <span>
                    <span className="block font-medium">{comp.address}</span>
                    <span className="text-muted">
                      {money(comp.price)} {comp.priceBasis} · {comp.beds || "—"} bd · {comp.sqft ? `${comp.sqft.toLocaleString()} sf` : "sf n/a"}
                      {comp.distanceMiles != null ? ` · ${comp.distanceMiles.toFixed(1)} mi` : ""} {comp.date ? ` · ${comp.date}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function Offer({
  deal,
  setA,
  offer,
  setOffer,
}: {
  deal: Deal;
  setA: (p: Partial<Assumptions>) => void;
  offer: ReturnType<typeof useAppStore.getState>["offer"];
  setOffer: (o: ReturnType<typeof useAppStore.getState>["offer"]) => void;
}) {
  const lines = offerLines(deal, offer);
  const rec = recommendedOffer(lines);
  const Field = ({ on, label, value, setOn, setValue, suffix, prefix }: { on: boolean; label: string; value: number; setOn: (v: boolean) => void; setValue: (n: number) => void; suffix?: string; prefix?: string }) => (
    <div className="grid grid-cols-[auto_1fr] items-end gap-3">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-5 accent-moss" checked={on} onChange={(e) => setOn(e.target.checked)} />
        Use
      </label>
      <Num label={label} suffix={suffix} prefix={prefix} value={value} onChange={setValue} />
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel title="Targets" action={rec ? <span className="font-serif text-xl text-brass">{money(rec)}</span> : null}>
        <div className="grid gap-3">
          <Field on={offer.useArvRule} label="Percent of ARV" suffix="%" value={offer.arvRulePercent} setOn={(useArvRule) => setOffer({ ...offer, useArvRule })} setValue={(arvRulePercent) => setOffer({ ...offer, arvRulePercent })} />
          <Num label="Fee or profit taken out of ARV rule" prefix="$" value={offer.arvFee} onChange={(arvFee) => setOffer({ ...offer, arvFee })} />
          <Field on={offer.useCashFlow} label="Min monthly cash flow" prefix="$" value={offer.cashFlow} setOn={(useCashFlow) => setOffer({ ...offer, useCashFlow })} setValue={(cashFlow) => setOffer({ ...offer, cashFlow })} />
          <Field on={offer.useCoc} label="Min cash-on-cash" suffix="%" value={offer.coc} setOn={(useCoc) => setOffer({ ...offer, useCoc })} setValue={(coc) => setOffer({ ...offer, coc })} />
          <Field on={offer.useCap} label="Min cap rate" suffix="%" value={offer.cap} setOn={(useCap) => setOffer({ ...offer, useCap })} setValue={(cap) => setOffer({ ...offer, cap })} />
          <Field on={offer.useDscr} label="Min DSCR" value={offer.dscr} setOn={(useDscr) => setOffer({ ...offer, useDscr })} setValue={(dscr) => setOffer({ ...offer, dscr })} />
          <Field on={offer.useFlipProfit} label="Min flip profit" prefix="$" value={offer.flipProfit} setOn={(useFlipProfit) => setOffer({ ...offer, useFlipProfit })} setValue={(flipProfit) => setOffer({ ...offer, flipProfit })} />
          <Field on={offer.useFlipRoi} label="Min flip ROI" suffix="%" value={offer.flipRoi} setOn={(useFlipRoi) => setOffer({ ...offer, useFlipRoi })} setValue={(flipRoi) => setOffer({ ...offer, flipRoi })} />
          <Field on={offer.useRentRule} label="Rent-to-price rule" suffix="%" value={offer.rentRulePercent} setOn={(useRentRule) => setOffer({ ...offer, useRentRule })} setValue={(rentRulePercent) => setOffer({ ...offer, rentRulePercent })} />
          <Field on={offer.usePpsf} label="Max price per sqft" prefix="$" value={offer.ppsf} setOn={(usePpsf) => setOffer({ ...offer, usePpsf })} setValue={(ppsf) => setOffer({ ...offer, ppsf })} />
          <Field on={offer.usePerDoor} label="Max price per door" prefix="$" value={offer.perDoor} setOn={(usePerDoor) => setOffer({ ...offer, usePerDoor })} setValue={(perDoor) => setOffer({ ...offer, perDoor })} />
          <Field on={offer.useCashLeft} label="Max cash left after refi" prefix="$" value={offer.cashLeft} setOn={(useCashLeft) => setOffer({ ...offer, useCashLeft })} setValue={(cashLeft) => setOffer({ ...offer, cashLeft })} />
        </div>
      </Panel>
      <Panel title="Highest price that still works">
        <p className="mb-3 text-sm text-muted">The recommended offer is the lowest ceiling. Return targets are searched; the cap rate and rent rule are solved directly.</p>
        <ul className="grid gap-2">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm">
              <span>
                <span className="block font-medium">{line.label}</span>
                <span className="text-muted">{line.note}</span>
              </span>
              <span className="tabular-nums">{line.price == null ? "No price clears" : money(line.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Button disabled={rec == null} onClick={() => rec != null && setA({ purchasePrice: rec })}>Use {rec == null ? "—" : money(rec)} as purchase price</Button>
        </div>
      </Panel>
    </div>
  );
}

function Records({ deal, setDeal, assessor }: { deal: Deal; setDeal: (p: Partial<Deal>) => void; assessor: string }) {
  return (
    <div className="grid gap-4">
      <Panel title="Listing contact and public record">
        <div className="grid gap-2 text-sm">
          <p>{deal.agentName || "No listing agent on this record."}{deal.brokerage ? ` · ${deal.brokerage}` : ""}</p>
          <p className="text-muted">{deal.mls ? `MLS: ${deal.mls}` : "MLS name not on the feed."} {deal.sourceName ? `· ${deal.sourceName}` : ""}</p>
          <p className="text-muted">Owner name and phone are not in the public listing feed. Use the county assessor for the owner of record.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <a className="inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-sm" href={assessor} target="_blank" rel="noreferrer">County record search</a>
            {deal.sourceUrl ? <a className="inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-sm" href={deal.sourceUrl} target="_blank" rel="noreferrer">Open listing</a> : null}
          </div>
        </div>
      </Panel>
      {deal.photos.length > 1 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {deal.photos.slice(0, 8).map((src) => (
            <img key={src} src={src} alt="" className="h-28 w-full rounded-md object-cover" />
          ))}
        </div>
      ) : null}
      <Panel title="Price history">
        {deal.history.length === 0 ? <p className="text-sm text-muted">No history imported.</p> : (
          <ul className="grid gap-2 text-sm">
            {deal.history.map((h, i) => (
              <li key={`${h.date}-${i}`} className="flex justify-between gap-3 border-b border-line py-1">
                <span>{h.date} · {h.event}</span>
                <span className="tabular-nums">{h.price > 0 ? money(h.price) : "Undisclosed"}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Notes">
        <textarea className="min-h-32 w-full rounded-md border border-line bg-paper p-3 outline-none focus:border-moss" value={deal.notes} onChange={(e) => setDeal({ notes: e.target.value })} />
        {deal.description ? <p className="mt-3 text-sm text-muted">{deal.description}</p> : null}
      </Panel>
    </div>
  );
}
