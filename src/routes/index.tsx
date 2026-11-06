import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { analyze, strategyFamily } from "@/lib/finance";
import { cocLabel, money, pct, place } from "@/lib/format";
import { screenDeal } from "@/lib/screen";
import { useAppStore } from "@/lib/store";
import { STRATEGIES } from "@/lib/types";
import { PhotoPlate, Pill } from "@/components/ui";

export const Route = createFileRoute("/")({ component: Desk });

function Desk() {
  const deals = useAppStore((s) => s.deals);
  const criteria = useAppStore((s) => s.criteria);
  const toggleCompare = useAppStore((s) => s.toggleCompare);
  const compareIds = useAppStore((s) => s.compareIds);
  const rows = deals.map((deal) => {
    const analysis = analyze(deal);
    const screen = screenDeal(deal, criteria, analysis);
    return { deal, analysis, screen };
  });
  const passing = rows.filter((r) => r.screen.pass).length;
  const income = rows.filter((r) => strategyFamily(r.deal.strategy) === "income");
  const avgCoc = income.length
    ? income.reduce((s, r) => s + (r.analysis.infiniteReturn ? 0 : r.analysis.cashOnCash ?? 0), 0) / income.length
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs tracking-widest text-brass uppercase">Pipeline</p>
          <h1 className="font-serif text-5xl leading-none">Every deal, one set of numbers.</h1>
          <p className="mt-3 text-muted">
            Rentals, flips, BRRRR, multifamily, commercial, Airbnb, and wholesale. Import a live listing or open a sample and change the assumptions.
          </p>
        </div>
        <Link to="/import" className="inline-flex h-11 items-center rounded-md bg-moss px-4 text-sm font-medium text-paper">
          Import a listing
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <Stat k="On the desk" v={String(deals.length)} />
        <Stat k="Inside buy box" v={String(passing)} />
        <Stat k="Avg cash-on-cash" v={avgCoc == null ? "—" : pct(avgCoc)} />
        <Stat k="In compare" v={String(compareIds.length)} />
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-6">
          <h2 className="font-serif text-2xl">The desk is empty</h2>
          <p className="mt-2 text-muted">Import an address or enter a property by hand. Nothing here is shared until you export a file from the library.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ deal, analysis, screen }) => {
            const family = strategyFamily(deal.strategy);
            const headline =
              family === "flip" && analysis.flip
                ? `${money(analysis.flip.profit)} profit`
                : family === "wholesale" && analysis.wholesale
                  ? `${money(analysis.wholesale.mao)} MAO`
                  : `${money(analysis.cashFlowMonthly)} / mo`;
            const second =
              family === "flip" && analysis.flip
                ? analysis.flip.roi == null ? "∞ ROI" : `${pct(analysis.flip.roi)} ROI`
                : family === "wholesale" && analysis.wholesale
                  ? `${money(analysis.wholesale.spread)} fee`
                  : cocLabel(analysis.infiniteReturn, analysis.cashOnCash);
            return (
              <article key={deal.id} className="grid overflow-hidden rounded-lg border border-line bg-card md:grid-cols-[11rem_1fr]">
                <PhotoPlate photos={deal.photos} label={deal.address} className="h-36 md:h-full" />
                <div className="grid gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-2xl leading-tight">{deal.address}</h2>
                        {deal.sample ? <Pill>Sample</Pill> : null}
                      </div>
                      <p className="text-sm text-muted">
                        {place(deal)} · {STRATEGIES.find((s) => s.id === deal.strategy)?.label} · {deal.status}
                      </p>
                    </div>
                    <Pill tone={screen.pass ? "good" : "bad"}>{screen.pass ? "In box" : "Out"}</Pill>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
                    <span className="font-medium">{headline}</span>
                    <span>{second}</span>
                    <span className="text-muted">{pct(analysis.capRate)} cap</span>
                    <span className="text-muted">{money(deal.assumptions.purchasePrice)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/deal/$id" params={{ id: deal.id }} className="inline-flex h-11 items-center rounded-md bg-moss px-4 text-sm font-medium text-paper">
                      Open
                    </Link>
                    <button
                      type="button"
                      className="h-11 rounded-md border border-line px-4 text-sm"
                      onClick={() => toggleCompare(deal.id)}
                    >
                      {compareIds.includes(deal.id) ? "In compare" : "Compare"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-xs text-muted">{k}</div>
      <div className="font-serif text-3xl tabular-nums">{v}</div>
    </div>
  );
}
