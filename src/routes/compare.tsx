import { Link, createFileRoute } from "@tanstack/react-router";
import { analyze, strategyFamily } from "@/lib/finance";
import { cocLabel, money, pct } from "@/lib/format";
import { screenDeal } from "@/lib/screen";
import { useAppStore } from "@/lib/store";
import { STRATEGIES } from "@/lib/types";

export const Route = createFileRoute("/compare")({ component: ComparePage });

function ComparePage() {
  const deals = useAppStore((s) => s.deals);
  const ids = useAppStore((s) => s.compareIds);
  const toggle = useAppStore((s) => s.toggleCompare);
  const criteria = useAppStore((s) => s.criteria);
  const picked = ids.map((id) => deals.find((d) => d.id === id)).filter((d) => d != null);
  const rows = picked.map((deal) => ({ deal, analysis: analyze(deal), screen: screenDeal(deal, criteria) }));

  const cells = [
    ["Strategy", (r: (typeof rows)[number]) => STRATEGIES.find((s) => s.id === r.deal.strategy)?.label ?? ""],
    ["Price", (r: (typeof rows)[number]) => money(r.deal.assumptions.purchasePrice)],
    ["ARV", (r: (typeof rows)[number]) => money(r.deal.assumptions.arv)],
    ["Rent / mo", (r: (typeof rows)[number]) => money(r.analysis.scheduledMonthly)],
    ["Cash flow", (r: (typeof rows)[number]) => (strategyFamily(r.deal.strategy) === "income" ? money(r.analysis.cashFlowMonthly) : "—")],
    ["Cash-on-cash", (r: (typeof rows)[number]) => (strategyFamily(r.deal.strategy) === "income" ? cocLabel(r.analysis.infiniteReturn, r.analysis.cashOnCash) : "—")],
    ["Cap rate", (r: (typeof rows)[number]) => pct(r.analysis.capRate)],
    ["DSCR", (r: (typeof rows)[number]) => (r.analysis.dscr == null ? "—" : r.analysis.dscr.toFixed(2))],
    ["IRR", (r: (typeof rows)[number]) => pct(r.analysis.irr)],
    ["Flip profit", (r: (typeof rows)[number]) => (r.analysis.flip ? money(r.analysis.flip.profit) : "—")],
    ["Cash left", (r: (typeof rows)[number]) => (r.analysis.brrrr ? money(r.analysis.brrrr.cashLeft) : "—")],
    ["Buy box", (r: (typeof rows)[number]) => (r.screen.pass ? "In" : "Out")],
  ] as const;

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs tracking-widest text-brass uppercase">Side by side</p>
        <h1 className="font-serif text-5xl leading-none">Which deal actually wins.</h1>
        <p className="mt-3 max-w-xl text-muted">Pin up to four properties from the desk. The compare set stays in this browser.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {deals.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={() => toggle(deal.id)}
            className={ids.includes(deal.id) ? "h-11 rounded-full bg-moss px-4 text-sm text-paper" : "h-11 rounded-full border border-line bg-card px-4 text-sm"}
          >
            {deal.address}
          </button>
        ))}
      </div>
      {rows.length < 2 ? (
        <p className="text-sm text-muted">Pick at least two deals.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-card-2">
              <tr>
                <th className="px-3 py-3 font-medium text-muted">Metric</th>
                {rows.map((r) => (
                  <th key={r.deal.id} className="px-3 py-3 font-serif text-lg font-normal">
                    <Link to="/deal/$id" params={{ id: r.deal.id }}>{r.deal.address}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cells.map(([label, read]) => (
                <tr key={label} className="border-t border-line bg-card">
                  <th className="px-3 py-2 font-medium text-muted">{label}</th>
                  {rows.map((r) => (
                    <td key={r.deal.id} className="px-3 py-2 tabular-nums">{read(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
