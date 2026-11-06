import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { newId } from "@/lib/cn";
import { blankAssumptions, blankLoan } from "@/lib/defaults";
import { dealFromScraped } from "@/lib/from-listing";
import { listingRequest } from "@/lib/listing-fns";
import type { ListingCard, ListingOp, ListingResponse, ScrapedProperty, Suggestion } from "@/lib/listing-types";
import { money } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { Strategy } from "@/lib/types";
import { STRATEGIES } from "@/lib/types";
import { Button, Num, PhotoPlate, Select, TextField } from "@/components/ui";

export const Route = createFileRoute("/import")({ component: ImportPage });

function ImportPage() {
  const navigate = useNavigate();
  const addDeal = useAppStore((s) => s.addDeal);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ListingResponse | null>(null);
  const [property, setProperty] = useState<ScrapedProperty | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("rental");
  const [manual, setManual] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
    beds: 3,
    baths: 2,
    sqft: 1400,
    price: 250000,
    rent: 1800,
    taxes: 2800,
  });

  async function run(op: ListingOp) {
    setBusy(true);
    setError("");
    try {
      const data = await listingRequest({ data: op });
      if (data.property) {
        setProperty(data.property);
        setResult(data);
      } else {
        setResult(data);
        if (data.note) setError(data.note);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The listing service didn’t respond.");
    } finally {
      setBusy(false);
    }
  }

  function save(scraped: ScrapedProperty) {
    const deal = dealFromScraped(scraped, strategy);
    addDeal(deal);
    void navigate({ to: "/deal/$id", params: { id: deal.id } });
  }

  function saveManual() {
    const now = new Date().toISOString();
    const id = newId();
    addDeal({
      id,
      createdAt: now,
      updatedAt: now,
      sample: false,
      status: "underwriting",
      strategy,
      address: manual.address || "Untitled property",
      city: manual.city,
      state: manual.state.toUpperCase(),
      zip: manual.zip,
      county: "",
      neighborhood: "",
      lat: null,
      lng: null,
      beds: manual.beds,
      baths: manual.baths,
      sqft: manual.sqft,
      lotSqft: 0,
      yearBuilt: 0,
      stories: 0,
      garage: 0,
      unitCount: strategy === "multifamily" ? 2 : 1,
      propertyType: "Single family",
      listPrice: manual.price,
      listingStatus: "manual",
      description: "",
      photos: [],
      sourceUrl: "",
      sourceName: "Entered by hand",
      agentName: "",
      brokerage: "",
      mls: "",
      taxesSource: "manual",
      insuranceSource: "estimate",
      rentSource: "manual",
      arvSource: "manual",
      leaseType: "gross",
      assumptions: blankAssumptions({
        purchasePrice: manual.price,
        arv: manual.price,
        rentMonthly: manual.rent,
        taxesAnnual: manual.taxes,
        insuranceAnnual: Math.round(Math.max(900, manual.price * 0.0035)),
        loans: [blankLoan()],
      }),
      rentRoll: [],
      rehabItems: [{ id: newId(), name: "Rehab budget", cost: 0 }],
      comps: [],
      history: [],
      notes: "",
    });
    void navigate({ to: "/deal/$id", params: { id } });
  }

  return (
    <div className="grid gap-6">
      <div className="max-w-2xl">
        <p className="text-xs tracking-widest text-brass uppercase">Public records</p>
        <h1 className="font-serif text-5xl leading-none">Pull a listing into the model.</h1>
        <p className="mt-3 text-muted">
          Search a street address, city, or ZIP, or paste a Realtor.com link. BuyBox reads the public listing feed for price, taxes, photos, and nearby sale and rental comps. Redfin and Zillow block this server, so those links won’t import.
        </p>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ op: "lookup", query });
        }}
      >
        <input
          className="h-11 flex-1 rounded-md border border-line bg-card px-3 outline-none focus:border-moss"
          placeholder="412 Congress Ave, Austin or a Realtor.com URL"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={busy}>{busy ? "Looking…" : "Find property"}</Button>
      </form>
      {error ? <p className="text-sm text-bad">{error}</p> : null}

      {property ? (
        <section className="grid gap-4 rounded-lg border border-line bg-card p-4 md:grid-cols-[16rem_1fr]">
          <PhotoPlate photos={property.photos} label={property.address} className="h-44 rounded-md" />
          <div className="grid gap-3">
            <div>
              <h2 className="font-serif text-3xl">{property.address}</h2>
              <p className="text-muted">{[property.city, property.state, property.zip].filter(Boolean).join(" ")} · {property.propertyType} · {property.status.replaceAll("_", " ")}</p>
            </div>
            <p className="text-sm">
              {property.beds || "—"} bd · {property.baths || "—"} ba · {property.sqft ? `${property.sqft.toLocaleString()} sf` : "sf n/a"} · {property.listPrice ? money(property.listPrice) : property.rentFromListing ? `${money(property.rentFromListing)} / mo rent` : "Price not listed"}
            </p>
            <p className="text-sm text-muted">
              {property.taxAnnual ? `Tax ${money(property.taxAnnual)} (${property.taxYear})` : "Tax not on the record"}
              {property.hoaMonthly ? ` · HOA ${money(property.hoaMonthly)}/mo` : ""}
              {property.market.suggestedRent ? ` · Rent comps ~ ${money(property.market.suggestedRent)}/mo` : ""}
              {property.market.suggestedArv ? ` · Comp value ~ ${money(property.market.suggestedArv)}` : ""}
              {` · ${property.comps.length} comps`}
            </p>
            <div className="grid gap-2 sm:grid-cols-[14rem_auto] sm:items-end">
              <Select label="Analyze as" value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
                {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
              <Button onClick={() => save(property)}>Add to the desk</Button>
            </div>
          </div>
        </section>
      ) : null}

      {result && (result.suggestions.length > 0 || result.listings.length > 0) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ResultList title="Addresses" empty="No address match">
            {result.suggestions.map((row) => (
              <SuggestionRow key={row.propertyId} row={row} disabled={busy} onOpen={() => void run({ op: "detail", propertyId: row.propertyId })} />
            ))}
          </ResultList>
          <ResultList title="For sale nearby" empty="No active listings for that search">
            {result.listings.map((row) => (
              <ListingRow key={row.propertyId} row={row} disabled={busy} onOpen={() => void run({ op: "detail", propertyId: row.propertyId })} />
            ))}
          </ResultList>
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-serif text-2xl">Or enter it yourself</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Use this when a listing site won’t answer. You can still run every calculator.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Address" value={manual.address} onChange={(address) => setManual({ ...manual, address })} />
          <TextField label="City" value={manual.city} onChange={(city) => setManual({ ...manual, city })} />
          <TextField label="State" value={manual.state} onChange={(state) => setManual({ ...manual, state })} />
          <TextField label="ZIP" value={manual.zip} onChange={(zip) => setManual({ ...manual, zip })} />
          <Num label="Price" prefix="$" value={manual.price} onChange={(price) => setManual({ ...manual, price })} />
          <Num label="Rent" prefix="$" value={manual.rent} onChange={(rent) => setManual({ ...manual, rent })} />
          <Num label="Taxes" prefix="$" value={manual.taxes} onChange={(taxes) => setManual({ ...manual, taxes })} />
          <Num label="Beds" value={manual.beds} onChange={(beds) => setManual({ ...manual, beds })} />
          <Num label="Baths" value={manual.baths} onChange={(baths) => setManual({ ...manual, baths })} />
          <Num label="Sqft" value={manual.sqft} onChange={(sqft) => setManual({ ...manual, sqft })} />
          <Select label="Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
            {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
        <div className="mt-4">
          <Button variant="ghost" onClick={saveManual}>Create deal</Button>
        </div>
      </section>
    </div>
  );
}

function ResultList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const emptyNode = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <section>
      <h2 className="mb-2 font-serif text-2xl">{title}</h2>
      <div className="grid gap-2">{emptyNode ? <p className="text-sm text-muted">{empty}</p> : children}</div>
    </section>
  );
}

function SuggestionRow({ row, onOpen, disabled }: { row: Suggestion; onOpen: () => void; disabled: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onOpen} className="rounded-md border border-line bg-card px-3 py-3 text-left">
      <span className="block font-medium">{row.line}</span>
      <span className="text-sm text-muted">{row.city}, {row.state} {row.zip} {row.status ? `· ${row.status}` : ""}</span>
    </button>
  );
}

function ListingRow({ row, onOpen, disabled }: { row: ListingCard; onOpen: () => void; disabled: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onOpen} className="flex gap-3 rounded-md border border-line bg-card p-2 text-left">
      <PhotoPlate photos={row.photo ? [row.photo] : []} label={row.address} className="h-16 w-20 shrink-0 rounded-sm" />
      <span>
        <span className="block font-medium">{row.address}</span>
        <span className="text-sm text-muted">{money(row.price)} · {row.beds || "—"} bd · {row.sqft ? `${row.sqft.toLocaleString()} sf` : "sf n/a"} · {row.city}</span>
      </span>
    </button>
  );
}
