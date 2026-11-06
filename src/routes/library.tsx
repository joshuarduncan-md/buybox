import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { newId } from "@/lib/cn";
import { builtInTemplates } from "@/lib/defaults";
import { GLOSSARY, LENDER_DIRECTORY } from "@/lib/glossary";
import { useAppStore, type PortfolioFile } from "@/lib/store";
import { STRATEGIES } from "@/lib/types";
import { Button, TextField } from "@/components/ui";

export const Route = createFileRoute("/library")({ component: LibraryPage });

function LibraryPage() {
  const templates = useAppStore((s) => s.templates);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const brand = useAppStore((s) => s.brand);
  const setBrand = useAppStore((s) => s.setBrand);
  const lenders = useAppStore((s) => s.lenders);
  const addLender = useAppStore((s) => s.addLender);
  const removeLender = useAppStore((s) => s.removeLender);
  const removeSamples = useAppStore((s) => s.removeSamples);
  const importPortfolio = useAppStore((s) => s.importPortfolio);
  const [openTerm, setOpenTerm] = useState<string | null>(GLOSSARY[0]?.term ?? null);
  const [lender, setLender] = useState({ name: "", kind: "DSCR", phone: "", email: "", notes: "", url: "" });
  const [message, setMessage] = useState("");

  function exportFile() {
    const state = useAppStore.getState();
    const payload: PortfolioFile = {
      deals: state.deals,
      criteria: state.criteria,
      offer: state.offer,
      templates: state.templates,
      brand: state.brand,
      lenders: state.lenders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buybox-desk.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-8">
      <div className="max-w-xl">
        <p className="text-xs tracking-widest text-brass uppercase">Library</p>
        <h1 className="font-serif text-5xl leading-none">Templates, brand, and the words.</h1>
        <p className="mt-3 text-muted">Deals stay in this browser. Export a file if you want a copy on another device. Reports use the brand below.</p>
      </div>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Assumption templates</h2>
        <div className="grid gap-2">
          {[...builtInTemplates(), ...templates].map((tpl) => (
            <div key={tpl.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-3">
              <div>
                <div className="font-medium">{tpl.name}</div>
                <div className="text-sm text-muted">{STRATEGIES.find((s) => s.id === tpl.strategy)?.label}{tpl.builtIn ? " · built in" : ""}</div>
              </div>
              {tpl.builtIn ? null : <Button variant="ghost" onClick={() => deleteTemplate(tpl.id)}>Remove</Button>}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">Save a template from inside a deal. Applying one keeps that property’s price, rent, taxes, and insurance.</p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Report brand</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Company" value={brand.company} onChange={(company) => setBrand({ ...brand, company })} />
          <TextField label="Prepared by" value={brand.analyst} onChange={(analyst) => setBrand({ ...brand, analyst })} />
          <TextField label="Email" value={brand.email} onChange={(email) => setBrand({ ...brand, email })} />
          <TextField label="Phone" value={brand.phone} onChange={(phone) => setBrand({ ...brand, phone })} />
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted">Footer</span>
          <textarea className="min-h-24 rounded-md border border-line bg-card p-3 outline-none focus:border-moss" value={brand.footer} onChange={(e) => setBrand({ ...brand, footer: e.target.value })} />
        </label>
        <label className="text-sm">
          Logo
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 400_000) {
                setMessage("Use a logo under 400 KB.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setBrand({ ...useAppStore.getState().brand, logoDataUrl: String(reader.result || "") });
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="Logo" className="h-12 w-auto" /> : null}
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Lenders</h2>
        <div className="grid gap-2">
          {LENDER_DIRECTORY.map((row) => (
            <div key={row.name} className="rounded-md border border-line bg-card px-3 py-3 text-sm">
              <div className="font-medium">{row.name}</div>
              <div className="text-muted">{row.kind} · {row.note}</div>
              {row.url ? <a className="text-moss underline" href={row.url} target="_blank" rel="noreferrer">Site</a> : null}
            </div>
          ))}
        </div>
        <h3 className="font-serif text-xl">Your contacts</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Name" value={lender.name} onChange={(name) => setLender({ ...lender, name })} />
          <TextField label="Kind" value={lender.kind} onChange={(kind) => setLender({ ...lender, kind })} />
          <TextField label="Phone" value={lender.phone} onChange={(phone) => setLender({ ...lender, phone })} />
          <TextField label="Email" value={lender.email} onChange={(email) => setLender({ ...lender, email })} />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (!lender.name.trim()) return;
            addLender({ id: newId(), ...lender });
            setLender({ name: "", kind: "DSCR", phone: "", email: "", notes: "", url: "" });
          }}
        >
          Save contact
        </Button>
        {lenders.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
            <span>{row.name} · {row.kind} {row.phone}</span>
            <Button variant="ghost" onClick={() => removeLender(row.id)}>Remove</Button>
          </div>
        ))}
      </section>

      <section className="grid gap-2">
        <h2 className="font-serif text-2xl">Glossary</h2>
        {GLOSSARY.map((item) => (
          <button key={item.term} type="button" className="rounded-md border border-line bg-card px-3 py-3 text-left" onClick={() => setOpenTerm(openTerm === item.term ? null : item.term)}>
            <span className="font-medium">{item.term}</span>
            {openTerm === item.term ? <span className="mt-1 block text-sm text-muted">{item.def}</span> : null}
          </button>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        <Button onClick={exportFile}>Export desk</Button>
        <label className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line bg-card px-4 text-sm">
          Import desk
          <input
            className="sr-only"
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text()) as PortfolioFile;
                if (!parsed || typeof parsed !== "object") throw new Error("empty");
                importPortfolio(parsed);
                setMessage("Imported.");
              } catch {
                setMessage("That file isn’t a BuyBox desk export.");
              }
            }}
          />
        </label>
        <Button variant="danger" onClick={removeSamples}>Remove sample deals</Button>
      </section>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
