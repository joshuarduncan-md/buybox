import { newId } from "@/lib/cn";
import { blankAssumptions, blankLoan } from "@/lib/defaults";
import type { ScrapedProperty } from "@/lib/listing-types";
import type { Comp, Deal, Strategy } from "@/lib/types";

function guessStrategy(property: ScrapedProperty): Strategy {
  if (property.status === "for_rent") return "rental";
  const units = property.units || 1;
  if (property.propertyType === "Commercial") return "commercial";
  if (property.propertyType === "Multifamily" || units >= 2) return "multifamily";
  return "rental";
}

export function dealFromScraped(property: ScrapedProperty, strategy?: Strategy): Deal {
  const now = new Date().toISOString();
  const chosen = strategy ?? guessStrategy(property);
  const purchase = property.listPrice || property.estimate || 0;
  const arv = property.market.suggestedArv || property.estimate || purchase;
  const taxes = property.taxAnnual && property.taxAnnual > 0 ? property.taxAnnual : Math.round(purchase * 0.011);
  const insurance = Math.round(Math.max(900, (purchase || property.estimate || 250000) * 0.0035));
  const comps: Comp[] = property.comps.map((c) => ({ ...c, selected: c.kind !== "active" }));
  const units = Math.max(1, property.units || 1);
  const perUnit = property.rentFromListing || property.market.suggestedRent || 0;
  const rentRoll =
    chosen === "multifamily" && units > 1 && units <= 16
      ? Array.from({ length: units }, (_, i) => ({
          id: newId(),
          name: `Unit ${i + 1}`,
          beds: 2,
          baths: 1,
          sqft: property.sqft ? Math.round(property.sqft / units) : 0,
          rent: perUnit ? Math.round(perUnit) : 0,
        }))
      : [];
  const rentMonthly =
    rentRoll.length > 0 ? 0 : chosen === "multifamily" && units > 16 && perUnit ? Math.round(perUnit * units) : perUnit;

  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    sample: false,
    status: "underwriting",
    strategy: chosen,
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zip,
    county: property.county,
    neighborhood: property.neighborhood,
    lat: property.lat,
    lng: property.lng,
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
    lotSqft: property.lotSqft,
    yearBuilt: property.yearBuilt,
    stories: property.stories,
    garage: property.garage,
    unitCount: units,
    propertyType: property.propertyType,
    listPrice: property.listPrice,
    listingStatus: property.status,
    description: property.description,
    photos: property.photos,
    sourceUrl: property.sourceUrl,
    sourceName: "Realtor.com public listing",
    agentName: property.agentName,
    brokerage: property.brokerage,
    mls: property.mls,
    taxesSource: property.taxAnnual ? "listing" : "estimate",
    insuranceSource: "estimate",
    rentSource: property.rentFromListing ? "listing" : property.market.suggestedRent ? "comps" : "none",
    arvSource: property.market.suggestedArv ? "comps" : property.estimate ? "estimate" : property.listPrice ? "list" : "manual",
    leaseType: "gross",
    assumptions: blankAssumptions({
      purchasePrice: purchase,
      arv,
      rentMonthly,
      taxesAnnual: taxes,
      insuranceAnnual: insurance,
      hoaMonthly: property.hoaMonthly,
      loans: [blankLoan()],
    }),
    rentRoll,
    rehabItems: [{ id: newId(), name: "Rehab budget", cost: 0 }],
    comps,
    history: property.history,
    notes: "",
  };
}
