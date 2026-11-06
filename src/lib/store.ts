import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { newId } from "@/lib/cn";
import { defaultCriteria, defaultOffer } from "@/lib/defaults";
import { sampleDeals } from "@/lib/samples";
import type { Brand, Criteria, Deal, LenderContact, OfferTargets, Template } from "@/lib/types";

export interface PortfolioFile {
  deals?: Deal[];
  criteria?: Criteria;
  offer?: OfferTargets;
  templates?: Template[];
  brand?: Brand;
  lenders?: LenderContact[];
}

interface AppState {
  deals: Deal[];
  criteria: Criteria;
  offer: OfferTargets;
  templates: Template[];
  brand: Brand;
  lenders: LenderContact[];
  compareIds: string[];
  mutateDeal: (id: string, fn: (deal: Deal) => Deal) => void;
  addDeal: (deal: Deal) => void;
  deleteDeal: (id: string) => void;
  duplicateDeal: (id: string) => string | null;
  removeSamples: () => void;
  setCriteria: (criteria: Criteria) => void;
  setOffer: (offer: OfferTargets) => void;
  saveTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  setBrand: (brand: Brand) => void;
  addLender: (lender: LenderContact) => void;
  removeLender: (id: string) => void;
  toggleCompare: (id: string) => void;
  importPortfolio: (file: PortfolioFile) => void;
}

const brandDefault: Brand = {
  company: "BuyBox",
  analyst: "",
  email: "",
  phone: "",
  footer: "Prepared for discussion. This is a model, not an appraisal, a commitment to lend, or tax advice.",
  logoDataUrl: "",
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      deals: sampleDeals(),
      criteria: defaultCriteria(),
      offer: defaultOffer(),
      templates: [],
      brand: brandDefault,
      lenders: [],
      compareIds: ["sample-cleveland", "sample-indy"],
      mutateDeal: (id, fn) =>
        set((s) => ({
          deals: s.deals.map((deal) => (deal.id === id ? { ...fn(deal), updatedAt: new Date().toISOString() } : deal)),
        })),
      addDeal: (deal) => set((s) => ({ deals: [deal, ...s.deals.filter((d) => d.id !== deal.id)] })),
      deleteDeal: (id) =>
        set((s) => ({
          deals: s.deals.filter((d) => d.id !== id),
          compareIds: s.compareIds.filter((x) => x !== id),
        })),
      duplicateDeal: (id) => {
        const deal = get().deals.find((d) => d.id === id);
        if (!deal) return null;
        const copy: Deal = {
          ...structuredClone(deal),
          id: newId(),
          sample: false,
          address: `${deal.address} (copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ deals: [copy, ...s.deals] }));
        return copy.id;
      },
      removeSamples: () => set((s) => ({ deals: s.deals.filter((d) => !d.sample), compareIds: s.compareIds.filter((id) => !id.startsWith("sample-")) })),
      setCriteria: (criteria) => set({ criteria }),
      setOffer: (offer) => set({ offer }),
      saveTemplate: (template) =>
        set((s) => ({ templates: [template, ...s.templates.filter((t) => t.id !== template.id)].slice(0, 30) })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      setBrand: (brand) => set({ brand }),
      addLender: (lender) => set((s) => ({ lenders: [lender, ...s.lenders] })),
      removeLender: (id) => set((s) => ({ lenders: s.lenders.filter((l) => l.id !== id) })),
      toggleCompare: (id) =>
        set((s) => {
          const has = s.compareIds.includes(id);
          if (has) return { compareIds: s.compareIds.filter((x) => x !== id) };
          return { compareIds: [...s.compareIds, id].slice(-4) };
        }),
      importPortfolio: (file) =>
        set((s) => ({
          deals: Array.isArray(file.deals) ? file.deals : s.deals,
          criteria: file.criteria ?? s.criteria,
          offer: file.offer ?? s.offer,
          templates: Array.isArray(file.templates) ? file.templates : s.templates,
          brand: file.brand ? { ...brandDefault, ...file.brand } : s.brand,
          lenders: Array.isArray(file.lenders) ? file.lenders : s.lenders,
        })),
    }),
    {
      name: "lotwright-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        deals: s.deals,
        criteria: s.criteria,
        offer: s.offer,
        templates: s.templates,
        brand: s.brand,
        lenders: s.lenders,
        compareIds: s.compareIds,
      }),
    },
  ),
);
