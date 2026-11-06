export interface ScrapedComp {
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
  lat: number | null;
  lng: number | null;
  distanceMiles: number | null;
}

export interface ScrapedProperty {
  propertyId: string;
  sourceUrl: string;
  status: string;
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
  units: number;
  propertyType: string;
  listPrice: number;
  rentFromListing: number | null;
  hoaMonthly: number;
  taxAnnual: number | null;
  taxYear: number | null;
  estimate: number | null;
  description: string;
  photos: string[];
  agentName: string;
  brokerage: string;
  mls: string;
  history: { date: string; event: string; price: number }[];
  comps: ScrapedComp[];
  market: {
    medianSoldPpsf: number | null;
    medianListPpsf: number | null;
    medianRent: number | null;
    suggestedArv: number | null;
    suggestedRent: number | null;
  };
}

export interface ListingCard {
  propertyId: string;
  status: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  photo: string;
  date: string;
}

export interface Suggestion {
  propertyId: string;
  line: string;
  city: string;
  state: string;
  zip: string;
  status: string;
}

export interface ListingResponse {
  suggestions: Suggestion[];
  listings: ListingCard[];
  property: ScrapedProperty | null;
  note: string | null;
}

export type ListingOp =
  | { op: "lookup"; query: string }
  | { op: "detail"; propertyId: string }
  | { op: "search"; location: string; status: "for_sale" | "sold" | "for_rent" };
