import { EVENT_CATEGORIES } from "../domain/constants.js";
import { createId } from "../lib/security.js";
import { createVenue, findVenueByName, upsertEvent, listNeighborhoods } from "../repositories/events.js";

const categorySet = new Set(EVENT_CATEGORIES);

function normalizeCategory(rawCategory) {
  const slug = String(rawCategory ?? "community").trim().toLowerCase();
  if (categorySet.has(slug)) return slug;
  if (slug.includes("music")) return "music";
  if (slug.includes("food")) return "food";
  if (slug.includes("comedy")) return "comedy";
  if (slug.includes("art")) return "art";
  if (slug.includes("tech")) return "tech";
  if (slug.includes("family")) return "family";
  if (slug.includes("outdoor")) return "outdoors";
  if (slug.includes("night")) return "nightlife";
  return "community";
}

function normalizeAgeRestriction(raw) {
  const text = String(raw ?? "").toLowerCase();
  if (text.includes("21")) return "21_plus";
  if (text.includes("18")) return "18_plus";
  return "all_ages";
}

function parsePriceText(text) {
  if (!text) return { min: null, max: null };
  if (String(text).toLowerCase().includes("free")) return { min: 0, max: 0 };
  const values = Array.from(String(text).matchAll(/\$([0-9]+(?:\.[0-9]{2})?)/g)).map((match) => Math.round(Number(match[1]) * 100));
  if (!values.length) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function buildFingerprint(record) {
  return `${record.title.trim().toLowerCase().replace(/\s+/g, "-")}|${(record.venueName ?? "unknown").trim().toLowerCase().replace(/\s+/g, "-")}|${record.startAt.slice(0, 10)}`;
}

function findNeighborhoodId(slug) {
  return listNeighborhoods().find((item) => item.slug === slug)?.id ?? null;
}

function findVenueIdByName(name) {
  return findVenueByName(name)?.id ?? null;
}

function ensureVenueId(record, neighborhoodId) {
  if (record.venueId) return record.venueId;
  if (!record.venueName) return null;
  const existingVenueId = findVenueIdByName(record.venueName);
  if (existingVenueId) return existingVenueId;
  return createVenue({
    id: createId("venue"),
    name: record.venueName,
    addressLine1: record.addressLine1 ?? record.address ?? null,
    city: "San Francisco",
    stateCode: "CA",
    postalCode: record.postalCode ?? null,
    latitude: record.latitude ?? null,
    longitude: record.longitude ?? null,
    neighborhoodId,
  })?.id ?? null;
}

export function ingestSourceRecords(records) {
  const imported = [];

  for (const record of records) {
    const price = parsePriceText(record.priceText);
    const neighborhoodId = findNeighborhoodId(record.neighborhoodSlug);
    const venueId = ensureVenueId(record, neighborhoodId);
    const normalized = {
      id: createId("event"),
      sourceProvider: record.provider,
      sourceEventId: record.providerEventId,
      sourceUrl: record.sourceUrl ?? "#",
      title: record.title.trim(),
      shortDescription: record.description?.slice(0, 140) ?? null,
      description: record.description ?? null,
      category: normalizeCategory(record.category),
      tags: (record.tags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean),
      startAt: record.startAt,
      endAt: record.endAt ?? null,
      timezone: record.timezone ?? "America/Los_Angeles",
      venueId,
      neighborhoodId,
      imageUrl: record.imageUrl ?? null,
      ageRestriction: normalizeAgeRestriction(record.ageRestrictionText),
      isIndoor: record.isIndoor ?? null,
      isOutdoor: record.isOutdoor ?? null,
      priceMinCents: price.min,
      priceMaxCents: price.max,
      currencyCode: "USD",
      popularityScore: Number(record.popularityScore ?? 50),
      qualityScore: Number(record.qualityScore ?? 60),
      status: "published",
      sourceStatus: "fresh",
      normalizedFingerprint: buildFingerprint(record),
    };
    upsertEvent(normalized);
    imported.push(normalized);
  }

  return imported;
}
