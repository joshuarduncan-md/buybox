import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { defaultCriteria } from "@/lib/defaults";
import { useAppStore } from "@/lib/store";
import type { Criteria, Rule } from "@/lib/types";
import { Button, Num, TextField } from "@/components/ui";

export const Route = createFileRoute("/criteria")({ component: CriteriaPage });

function CriteriaPage() {
  const criteria = useAppStore((s) => s.criteria);
  const setCriteria = useAppStore((s) => s.setCriteria);
  const patch = (partial: Partial<Criteria>) => setCriteria({ ...useAppStore.getState().criteria, ...partial });
  const [stateDraft, setStateDraft] = useState(criteria.states.join(", "));

  return (
    <div className="grid gap-5">
      <div className="max-w-xl">
        <p className="text-xs tracking-widest text-brass uppercase">Buy box</p>
        <h1 className="font-serif text-5xl leading-none">Screen before you fall in love.</h1>
        <p className="mt-3 text-muted">
          Income deals are checked on cash flow, returns, and DSCR. Flips use profit and ROI. Wholesale deals have to sit at or under the MAO. Turn a rule off if it doesn’t apply to how you buy.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RuleField label="Min monthly cash flow" money rule={criteria.minCashFlow} onChange={(minCashFlow) => patch({ minCashFlow })} />
        <RuleField label="Min cash-on-cash" suffix="%" rule={criteria.minCoc} onChange={(minCoc) => patch({ minCoc })} />
        <RuleField label="Min cap rate" suffix="%" rule={criteria.minCap} onChange={(minCap) => patch({ minCap })} />
        <RuleField label="Min DSCR" rule={criteria.minDscr} onChange={(minDscr) => patch({ minDscr })} />
        <RuleField label="Min IRR" suffix="%" rule={criteria.minIrr} onChange={(minIrr) => patch({ minIrr })} />
        <RuleField label="Min rent / price" suffix="%" rule={criteria.minRentRatio} onChange={(minRentRatio) => patch({ minRentRatio })} />
        <RuleField label="Max purchase price" money rule={criteria.maxPrice} onChange={(maxPrice) => patch({ maxPrice })} />
        <RuleField label="Max price / sqft" money rule={criteria.maxPricePerSqft} onChange={(maxPricePerSqft) => patch({ maxPricePerSqft })} />
        <RuleField label="Min beds" rule={criteria.minBeds} onChange={(minBeds) => patch({ minBeds })} />
        <RuleField label="Min flip profit" money rule={criteria.minFlipProfit} onChange={(minFlipProfit) => patch({ minFlipProfit })} />
        <RuleField label="Min flip ROI" suffix="%" rule={criteria.minFlipRoi} onChange={(minFlipRoi) => patch({ minFlipRoi })} />
      </div>
      <div className="max-w-md">
        <TextField
          label="States, blank for all"
          value={stateDraft}
          onChange={(value) => {
            setStateDraft(value);
            const states = value.split(/[^A-Za-z]+/).map((s) => s.toUpperCase()).filter((s) => s.length === 2);
            patch({ states });
          }}
        />
      </div>
      <Button variant="ghost" onClick={() => { setCriteria(defaultCriteria()); setStateDraft(""); }}>Reset buy box</Button>
    </div>
  );
}

function RuleField({
  label,
  rule,
  onChange,
  suffix,
  money,
}: {
  label: string;
  rule: Rule;
  onChange: (rule: Rule) => void;
  suffix?: string;
  money?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-end gap-3 rounded-lg border border-line bg-card p-3">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-5 accent-moss" checked={rule.enabled} onChange={(e) => onChange({ ...rule, enabled: e.target.checked })} />
        On
      </label>
      <Num label={label} prefix={money ? "$" : undefined} suffix={suffix} value={rule.value} onChange={(value) => onChange({ ...rule, value })} />
    </div>
  );
}
