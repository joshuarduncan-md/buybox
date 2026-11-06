import { Link, createFileRoute } from "@tanstack/react-router";
import { analyze, effectiveRehab, strategyFamily } from "@/lib/finance";
import { cocLabel, money, pct, place } from "@/lib/format";
import { screenDeal } from "@/lib/screen";
import { useAppStore } from "@/lib/store";
import { STRATEGIES } from "@/lib/types";
import { Button, PhotoPlate } from "@/components/ui";

export const Route = createFileRoute("/report/$id")({ component: ReportPage });

function ReportPage() {
  const { id } = Route.useParams();
  const deal = useAppStore((s) => s.deals.find((d) => d.id === id));
  const brand = useAppStore((s) => s.brand);
  const criteria = useAppStore((s) => s.criteria);
  if (!deal) return <p>That deal isn’t on this desk.</p>;
  const analysis = analyze(deal);
  const screen = screenDeal(deal, criteria, analysis);
  const family = strategyFamily(deal.strategy);
  const a = deal.assumptions;

  return (
    <article className="print-sheet mx-auto grid max-w-3xl gap-6">
      <div className="no-print flex gap-2">
        <Button onClick={() => window.print()}>Print or save PDF</Button>
        <Link to="/deal/$id" params={{ id: deal.id }} className="inline-flex h-11 items-center rounded-md border border-line px-4 text-sm">Back to deal</Link>
      </div>
      <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-xs tracking-widest text-brass uppercase">{brand.company || "BuyBox"}</p>
          <h1 className="font-serif text-4xl">{deal.address}</h1>
          <p className="text-muted">{place(deal)} · {STRATEGIES.find((s) => s.id === deal.strategy)?.label}</p>
          <p className="mt-2 text-sm">{brand.analyst} {brand.email} {brand.phone}</p>
        </div>
        {brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="" className="h-14 w-auto" /> : null}
      </header>
      <PhotoPlate photos={deal.photos} label={deal.address} className="h-56 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {family === "flip" && analysis.flip ? (
          <>
            <Figure k="Profit" v={money(analysis.flip.profit)} />
            <Figure k="ROI" v={analysis.flip.roi == null ? "∞" : pct(analysis.flip.roi)} />
            <Figure k="All-in cost" v={money(analysis.flip.totalCost)} />
            <Figure k="Cash in" v={money(analysis.flip.cashInvested)} />
          </>
        ) : family === "wholesale" && analysis.wholesale ? (
          <>
            <Figure k="MAO" v={money(analysis.wholesale.mao)} />
            <Figure k="Contract" v={money(analysis.wholesale.contract)} />
            <Figure k="Assignment" v={money(analysis.wholesale.spread)} />
            <Figure k="Buyer price" v={money(analysis.wholesale.buyerPrice)} />
          </>
        ) : (
          <>
            <Figure k="Cash flow" v={`${money(analysis.cashFlowMonthly)}/mo`} />
            <Figure k="Cash-on-cash" v={cocLabel(analysis.infiniteReturn, analysis.cashOnCash)} />
            <Figure k="Cap rate" v={pct(analysis.capRate)} />
            <Figure k="DSCR" v={analysis.dscr == null ? "—" : analysis.dscr.toFixed(2)} />
          </>
        )}
      </div>
      <section>
        <h2 className="font-serif text-2xl">Assumptions</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
          <Pair k="Purchase" v={money(a.purchasePrice)} />
          <Pair k="ARV" v={money(a.arv)} />
          <Pair k="Rehab" v={money(effectiveRehab(deal))} />
          <Pair k="Rent" v={money(analysis.scheduledMonthly)} />
          <Pair k="Vacancy" v={pct(a.vacancyPercent, 0)} />
          <Pair k="Taxes" v={money(a.taxesAnnual)} />
          <Pair k="Insurance" v={money(a.insuranceAnnual)} />
          <Pair k="NOI" v={money(analysis.noiAnnual)} />
          <Pair k="Loan" v={money(analysis.loanAmount)} />
          <Pair k="Payment" v={money(analysis.loanPayment)} />
          <Pair k="Cash invested" v={money(analysis.cashInvested)} />
          <Pair k="Buy box" v={screen.pass ? "Meets" : "Does not meet"} />
        </dl>
      </section>
      {analysis.brrrr ? (
        <section>
          <h2 className="font-serif text-2xl">Refinance</h2>
          <p className="text-sm">Cash in {money(analysis.brrrr.cashIn)} · new loan {money(analysis.brrrr.refiLoan)} · cash out {money(analysis.brrrr.cashOut)} · left in {money(analysis.brrrr.cashLeft)}</p>
        </section>
      ) : null}
      {analysis.years.length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl">Projection</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1">Year</th>
                <th>Cash flow</th>
                <th>Equity</th>
                <th>IRR if sold</th>
              </tr>
            </thead>
            <tbody>
              {analysis.years.map((y) => (
                <tr key={y.year} className="border-t border-line">
                  <td className="py-1">{y.year}</td>
                  <td className="tabular-nums">{money(y.cashFlow)}</td>
                  <td className="tabular-nums">{money(y.equity)}</td>
                  <td className="tabular-nums">{pct(y.irrIfSold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {deal.comps.filter((c) => c.selected).length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl">Selected comps</h2>
          <ul className="mt-2 text-sm">
            {deal.comps.filter((c) => c.selected).slice(0, 8).map((c) => (
              <li key={`${c.kind}-${c.id}`}>{c.kind} · {c.address} · {money(c.price)} · {c.sqft || "—"} sf</li>
            ))}
          </ul>
        </section>
      ) : null}
      <footer className="border-t border-line pt-3 text-xs text-muted">
        {brand.footer} Figures are a model of the assumptions above, sourced where noted from public listing data. Not an appraisal.
      </footer>
    </article>
  );
}

function Figure({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{k}</div>
      <div className="font-serif text-2xl tabular-nums">{v}</div>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-line py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
