import type { ListingCard, ListingOp, ListingResponse, ScrapedComp, ScrapedProperty, Suggestion } from "@/lib/listing-types";

const GQL = "https://api.frontdoor.realtor.com/graphql";
const SUGGEST = "https://parser-external.geo.moveaws.com/suggest";

const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "*/*",
  "User-Agent": "Realtor.com/26.9.25.0774600 CFNetwork/3860.200.71 Darwin/25.1.0",
  "rdc-client-name": "RDC_NATIVE_MOBILE-iPhone-com.move.Realtor",
  "rdc-client-version": "26.9.25",
  "apollographql-client-name": "com.move.Realtor-apollo-ios",
  "apollographql-client-version": "26.9.25-26.9.25.0774600",
  "X-APOLLO-OPERATION-TYPE": "query",
};

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 10 * 60 * 1000;

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function https(url: string): string {
  if (!url) return "";
  return url.replace(/^http:\/\//i, "https://");
}

function propertyIdFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!/realtor\.com$/i.test(u.hostname) && !u.hostname.endsWith(".realtor.com")) return null;
    const split = u.pathname.match(/_M(\d+)-(\d+)/);
    if (split) return split[1] + split[2];
    const plain = u.pathname.match(/_M(\d{6,})/);
    if (plain) return plain[1];
    const q = u.searchParams.get("property_id") ?? u.searchParams.get("ex") ?? "";
    if (/^\d{6,}$/.test(q)) return q;
    return null;
  } catch {
    return null;
  }
}

async function gql<T>(query: string, variables: Record<string, unknown>, op: string): Promise<T> {
  const key = op + JSON.stringify(variables) + query.length;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const res = await fetch(GQL, {
    method: "POST",
    headers: { ...HEADERS, "X-APOLLO-OPERATION-NAME": op },
    body: JSON.stringify({ query, variables, operationName: op }),
    signal: AbortSignal.timeout(22000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Listing service returned ${res.status}. ${text.slice(0, 140)}`);
  }
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(body.errors[0]?.message || "Listing query failed");
  if (!body.data) throw new Error("Listing service returned an empty payload");
  cache.set(key, { at: Date.now(), data: body.data });
  return body.data;
}

const SEARCH = `query Search($query: HomeSearchCriteria!, $limit: Int) {
  home_search(query: $query, limit: $limit) {
    total
    results {
      property_id
      status
      list_price
      last_sold_price
      last_sold_date
      permalink
      primary_photo { href }
      description { beds baths_consolidated sqft year_built type }
      location { address { line city state_code postal_code coordinate { lat lon } } }
    }
  }
}`;

const SEARCH_SAFE = `query Search($query: HomeSearchCriteria!, $limit: Int) {
  home_search(query: $query, limit: $limit) {
    total
    results {
      property_id
      status
      list_price
      last_sold_price
      last_sold_date
      primary_photo { href }
      description { beds baths_consolidated sqft year_built type }
      location { address { line city state_code postal_code } }
    }
  }
}`;

interface RawHome {
  property_id?: string;
  status?: string;
  list_price?: number | null;
  last_sold_price?: number | null;
  last_sold_date?: string | null;
  permalink?: string | null;
  primary_photo?: { href?: string | null } | null;
  description?: {
    beds?: number | null;
    baths_consolidated?: string | null;
    sqft?: number | null;
    year_built?: number | null;
    type?: string | null;
  } | null;
  location?: {
    address?: {
      line?: string | null;
      city?: string | null;
      state_code?: string | null;
      postal_code?: string | null;
      coordinate?: { lat?: number | null; lon?: number | null } | null;
    } | null;
  } | null;
}

async function searchHomes(location: string, status: "for_sale" | "sold" | "for_rent", limit: number): Promise<RawHome[]> {
  const variables = { query: { status: [status], search_location: { location } }, limit };
  try {
    const data = await gql<{ home_search?: { results?: RawHome[] } }>(SEARCH, variables, "Search");
    return data.home_search?.results ?? [];
  } catch {
    const data = await gql<{ home_search?: { results?: RawHome[] } }>(SEARCH_SAFE, variables, "Search");
    return data.home_search?.results ?? [];
  }
}

function toCard(row: RawHome): ListingCard {
  const status = str(row.status);
  const sold = num(row.last_sold_price);
  const list = num(row.list_price);
  const price = status === "sold" ? sold || list : list || sold;
  const addr = row.location?.address;
  return {
    propertyId: str(row.property_id),
    status,
    price,
    address: str(addr?.line) || "Address unavailable",
    city: str(addr?.city),
    state: str(addr?.state_code),
    zip: str(addr?.postal_code),
    beds: num(row.description?.beds),
    baths: num(row.description?.baths_consolidated),
    sqft: num(row.description?.sqft),
    propertyType: labelType(str(row.description?.type)),
    photo: https(str(row.primary_photo?.href)),
    date: str(row.last_sold_date),
  };
}

function labelType(type: string): string {
  const map: Record<string, string> = {
    single_family: "Single family",
    condos: "Condo",
    condo: "Condo",
    townhomes: "Townhouse",
    townhouse: "Townhouse",
    multi_family: "Multifamily",
    apartment: "Apartment",
    land: "Land",
    mobile: "Mobile",
    farm: "Acreage",
    commercial: "Commercial",
  };
  return map[type] ?? (type ? type.replaceAll("_", " ") : "Property");
}

const DETAIL = `query GetHome($property_id: ID!) {
  home(property_id: $property_id) {
    property_id
    listing_id
    status
    permalink
    list_price
    last_sold_price
    last_sold_date
    price_per_sqft
    description { beds baths_consolidated sqft lot_sqft year_built type sub_type units stories garage name text }
    hoa { fee }
    estimates { current_values { estimate source { name } } }
    tax_history { year tax assessment { total } }
    property_history { date event_name price }
    location {
      address { line city state_code postal_code coordinate { lat lon } }
      county { name }
      neighborhoods { name }
    }
    advertisers { name type office { name } }
    photos { href }
    source { id name }
  }
}`;

interface RawDetail {
  property_id?: string;
  status?: string;
  permalink?: string | null;
  list_price?: number | null;
  description?: {
    beds?: number | null;
    baths_consolidated?: string | null;
    sqft?: number | null;
    lot_sqft?: number | null;
    year_built?: number | null;
    type?: string | null;
    units?: number | null;
    stories?: number | null;
    garage?: number | null;
    text?: string | null;
  } | null;
  hoa?: { fee?: number | null } | null;
  estimates?: { current_values?: { estimate?: number | null; source?: { name?: string | null } | null }[] | null } | null;
  tax_history?: { year?: number | null; tax?: number | null }[] | null;
  property_history?: { date?: string | null; event_name?: string | null; price?: number | null }[] | null;
  location?: {
    address?: {
      line?: string | null;
      city?: string | null;
      state_code?: string | null;
      postal_code?: string | null;
      coordinate?: { lat?: number | null; lon?: number | null } | null;
    } | null;
    county?: { name?: string | null } | null;
    neighborhoods?: { name?: string | null }[] | null;
  } | null;
  advertisers?: { name?: string | null; type?: string | null; office?: { name?: string | null } | null }[] | null;
  photos?: { href?: string | null }[] | null;
  source?: { name?: string | null } | null;
}

function miles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function median(values: number[]): number | null {
  const xs = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid]! : (xs[mid - 1]! + xs[mid]!) / 2;
}

function compFrom(row: RawHome, kind: ScrapedComp["kind"], subject: { lat: number | null; lng: number | null }): ScrapedComp | null {
  const card = toCard(row);
  if (!card.propertyId) return null;
  const price = card.price;
  if (price <= 0) return null;
  const lat = row.location?.address?.coordinate?.lat ?? null;
  const lng = row.location?.address?.coordinate?.lon ?? null;
  const basis: ScrapedComp["priceBasis"] = kind === "rent" ? "rent" : kind === "sold" && num(row.last_sold_price) > 0 ? "sold" : "list";
  let distance: number | null = null;
  if (subject.lat != null && subject.lng != null && lat != null && lng != null) {
    distance = miles(subject.lat, subject.lng, lat, lng);
  }
  return {
    id: card.propertyId,
    kind,
    address: card.address,
    city: card.city,
    state: card.state,
    zip: card.zip,
    price,
    priceBasis: basis,
    beds: card.beds,
    baths: card.baths,
    sqft: card.sqft,
    yearBuilt: num(row.description?.year_built),
    propertyType: card.propertyType,
    date: card.date,
    photo: card.photo,
    lat,
    lng,
    distanceMiles: distance,
  };
}

async function suggest(query: string): Promise<Suggestion[]> {
  const url = `${SUGGEST}?input=${encodeURIComponent(query)}&client_id=rdc-home&limit=8`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Address search returned ${res.status}`);
  const body = (await res.json()) as {
    autocomplete?: {
      area_type?: string;
      mpr_id?: string;
      line?: string;
      city?: string;
      state_code?: string;
      postal_code?: string;
      prop_status?: string[];
    }[];
  };
  return (body.autocomplete ?? [])
    .filter((row) => row.area_type === "address" && row.mpr_id)
    .slice(0, 8)
    .map((row) => ({
      propertyId: String(row.mpr_id),
      line: row.line || "Address",
      city: row.city || "",
      state: row.state_code || "",
      zip: row.postal_code || "",
      status: (row.prop_status ?? []).join(", ").replaceAll("_", " "),
    }));
}

async function loadDetail(propertyId: string): Promise<ScrapedProperty> {
  if (!/^\d{5,}$/.test(propertyId)) throw new Error("That listing id doesn’t look valid");
  const data = await gql<{ home: RawDetail | null }>(DETAIL, { property_id: propertyId }, "GetHome");
  const home = data.home;
  if (!home) throw new Error("No public record came back for that property");
  const addr = home.location?.address;
  const taxes = (home.tax_history ?? []).filter((t) => num(t.tax) > 0).sort((a, b) => num(b.year) - num(a.year));
  const tax = taxes[0];
  const estimate = (home.estimates?.current_values ?? []).map((v) => num(v.estimate)).find((v) => v > 10000) ?? null;
  const agent = (home.advertisers ?? []).find((a) => str(a.name)) ?? home.advertisers?.[0];
  const photos = (home.photos ?? []).map((p) => https(str(p.href))).filter(Boolean).slice(0, 16);
  const lat = addr?.coordinate?.lat ?? null;
  const lng = addr?.coordinate?.lon ?? null;
  const status = str(home.status);
  const listPriceRaw = num(home.list_price);
  const isRent = status === "for_rent";
  const where = str(addr?.postal_code) || [str(addr?.city), str(addr?.state_code)].filter(Boolean).join(", ");
  const subjectBeds = num(home.description?.beds);
  const subjectSqft = num(home.description?.sqft);
  const subjectType = labelType(str(home.description?.type));

  const [soldRows, activeRows, rentRows] = await Promise.all([
    where ? searchHomes(where, "sold", 24).catch(() => []) : Promise.resolve([]),
    where ? searchHomes(where, "for_sale", 16).catch(() => []) : Promise.resolve([]),
    where ? searchHomes(where, "for_rent", 16).catch(() => []) : Promise.resolve([]),
  ]);

  const rank = (row: RawHome) => {
    let score = 0;
    const beds = num(row.description?.beds);
    const sqft = num(row.description?.sqft);
    const type = labelType(str(row.description?.type));
    if (subjectType && type === subjectType) score += 3;
    if (subjectBeds && beds && Math.abs(beds - subjectBeds) <= 1) score += 2;
    if (subjectSqft && sqft && Math.abs(sqft - subjectSqft) / subjectSqft <= 0.3) score += 3;
    return score;
  };

  const toComps = (rows: RawHome[], kind: ScrapedComp["kind"]) =>
    rows
      .filter((row) => str(row.property_id) !== propertyId)
      .map((row) => ({ row, comp: compFrom(row, kind, { lat, lng }) }))
      .filter((x): x is { row: RawHome; comp: ScrapedComp } => Boolean(x.comp))
      .sort((a, b) => rank(b.row) - rank(a.row) || str(b.row.last_sold_date).localeCompare(str(a.row.last_sold_date)))
      .slice(0, 8)
      .map((x) => x.comp);

  const comps = [...toComps(soldRows, "sold"), ...toComps(activeRows, "active"), ...toComps(rentRows, "rent")];
  const sold = comps.filter((c) => c.kind === "sold");
  const active = comps.filter((c) => c.kind === "active");
  const rents = comps.filter((c) => c.kind === "rent");
  const soldPpsf = median(sold.filter((c) => c.sqft > 0 && c.priceBasis === "sold").map((c) => c.price / c.sqft));
  const listPpsf = median(active.filter((c) => c.sqft > 0).map((c) => c.price / c.sqft));
  const similarRents = rents.filter((c) => !subjectBeds || Math.abs(c.beds - subjectBeds) <= 1);
  const medianRent = median((similarRents.length >= 3 ? similarRents : rents).map((c) => c.price));
  const ppsf = soldPpsf ?? listPpsf;
  const suggestedArv = ppsf && subjectSqft > 0 ? Math.round(ppsf * subjectSqft) : estimate;

  const history = (home.property_history ?? [])
    .slice(0, 12)
    .map((h) => ({ date: str(h.date), event: str(h.event_name) || "Event", price: num(h.price) }))
    .filter((h) => h.date || h.event);

  return {
    propertyId,
    sourceUrl: home.permalink ? `https://www.realtor.com/realestateandhomes-detail/${home.permalink}` : "",
    status,
    address: str(addr?.line) || "Unknown address",
    city: str(addr?.city),
    state: str(addr?.state_code),
    zip: str(addr?.postal_code),
    county: str(home.location?.county?.name),
    neighborhood: str(home.location?.neighborhoods?.[0]?.name),
    lat,
    lng,
    beds: subjectBeds,
    baths: num(home.description?.baths_consolidated),
    sqft: subjectSqft,
    lotSqft: num(home.description?.lot_sqft),
    yearBuilt: num(home.description?.year_built),
    stories: num(home.description?.stories),
    garage: num(home.description?.garage),
    units: num(home.description?.units) || (subjectType === "Multifamily" ? 2 : 1),
    propertyType: subjectType,
    listPrice: isRent ? 0 : listPriceRaw,
    rentFromListing: isRent ? listPriceRaw : null,
    hoaMonthly: num(home.hoa?.fee),
    taxAnnual: tax ? num(tax.tax) : null,
    taxYear: tax ? num(tax.year) : null,
    estimate,
    description: str(home.description?.text).slice(0, 1600),
    photos,
    agentName: str(agent?.name),
    brokerage: str(agent?.office?.name),
    mls: str(home.source?.name),
    history,
    comps,
    market: {
      medianSoldPpsf: soldPpsf,
      medianListPpsf: listPpsf,
      medianRent,
      suggestedArv,
      suggestedRent: medianRent,
    },
  };
}

export async function runListing(op: ListingOp): Promise<ListingResponse> {
  if (op.op === "detail") {
    const property = await loadDetail(op.propertyId);
    return { suggestions: [], listings: [], property, note: null };
  }
  if (op.op === "search") {
    const rows = await searchHomes(op.location, op.status, 12);
    return { suggestions: [], listings: rows.map(toCard).filter((c) => c.propertyId), property: null, note: null };
  }
  const query = op.query.trim();
  const fromUrl = propertyIdFromUrl(query);
  if (fromUrl) {
    const property = await loadDetail(fromUrl);
    return { suggestions: [], listings: [], property, note: null };
  }
  if (/redfin\.com|zillow\.com|trulia\.com/i.test(query)) {
    return {
      suggestions: [],
      listings: [],
      property: null,
      note: "That site blocks automated reads from here. Paste a Realtor.com link, or search the street address.",
    };
  }
  const [suggestions, firstPass] = await Promise.all([
    suggest(query).catch(() => [] as Suggestion[]),
    searchHomes(query, "for_sale", 8)
      .then((rows) => rows.map(toCard).filter((c) => c.propertyId))
      .catch(() => [] as ListingCard[]),
  ]);
  let listings = firstPass;
  if (listings.length === 0 && suggestions[0]) {
    const place = [suggestions[0].city, suggestions[0].state].filter(Boolean).join(", ");
    if (place) {
      listings = await searchHomes(place, "for_sale", 8)
        .then((rows) => rows.map(toCard).filter((c) => c.propertyId))
        .catch(() => []);
    }
  }
  const note =
    suggestions.length === 0 && listings.length === 0
      ? "Nothing matched. Try a full street address, city and state, or a Realtor.com listing URL."
      : null;
  return { suggestions, listings, property: null, note };
}
