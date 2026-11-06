import { createServerFn } from "@tanstack/react-start";
import type { ListingOp, ListingResponse } from "@/lib/listing-types";

function validate(data: unknown): ListingOp {
  if (!data || typeof data !== "object") throw new Error("Invalid request");
  const row = data as Record<string, unknown>;
  if (row.op === "lookup") {
    if (typeof row.query !== "string" || row.query.trim().length < 3) throw new Error("Enter at least 3 characters");
    return { op: "lookup", query: row.query.trim().slice(0, 180) };
  }
  if (row.op === "detail") {
    if (typeof row.propertyId !== "string" || !/^\d{5,}$/.test(row.propertyId)) throw new Error("Missing listing id");
    return { op: "detail", propertyId: row.propertyId };
  }
  if (row.op === "search") {
    if (typeof row.location !== "string" || row.location.trim().length < 3) throw new Error("Enter a city, ZIP, or address");
    const status = row.status === "sold" || row.status === "for_rent" || row.status === "for_sale" ? row.status : "for_sale";
    return { op: "search", location: row.location.trim().slice(0, 120), status };
  }
  throw new Error("Unknown listing request");
}

export const listingRequest = createServerFn({ method: "POST" })
  .validator(validate)
  .handler(async ({ data }): Promise<ListingResponse> => {
    const { runListing } = await import("./listings.server");
    return runListing(data);
  });
