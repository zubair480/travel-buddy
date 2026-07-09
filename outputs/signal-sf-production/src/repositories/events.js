import { getDb } from "../db/client.js";

function mapEvent(row) {
  return {
    id: row.id,
    sourceProvider: row.source_provider,
    sourceEventId: row.source_event_id,
    sourceUrl: row.source_url,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    tags: JSON.parse(row.tags_json),
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    venueId: row.venue_id,
    neighborhoodId: row.neighborhood_id,
    imageUrl: row.image_url,
    ageRestriction: row.age_restriction,
    isIndoor: row.is_indoor === null ? null : Boolean(row.is_indoor),
    isOutdoor: row.is_outdoor === null ? null : Boolean(row.is_outdoor),
    priceMinCents: row.price_min_cents,
    priceMaxCents: row.price_max_cents,
    currencyCode: row.currency_code,
    popularityScore: row.popularity_score,
    qualityScore: row.quality_score,
    status: row.status,
    sourceStatus: row.source_status,
    normalizedFingerprint: row.normalized_fingerprint,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listNeighborhoods() {
  return getDb()
    .prepare(`SELECT * FROM neighborhoods ORDER BY name`)
    .all()
    .map((row) => ({
      id: row.id,
      citySlug: row.city_slug,
      slug: row.slug,
      name: row.name,
      centroidLat: row.centroid_lat,
      centroidLng: row.centroid_lng,
    }));
}

export function listEvents(filters = {}) {
  // Columns are qualified with `events.` because the query joins `venues` and
  // `neighborhoods`, and `neighborhood_id` exists on both `events` and `venues`
  // (a bare reference is an "ambiguous column name" error at runtime).
  const conditions = [`events.status = 'published'`];
  const values = [];

  if (filters.date) {
    conditions.push(`substr(events.start_at, 1, 10) = ?`);
    values.push(filters.date);
  } else {
    if (filters.startDate) {
      conditions.push(`substr(events.start_at, 1, 10) >= ?`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`substr(events.start_at, 1, 10) <= ?`);
      values.push(filters.endDate);
    }
  }
  if (filters.q) {
    conditions.push(`(
      lower(events.title) LIKE ?
      OR lower(events.description) LIKE ?
      OR lower(events.tags_json) LIKE ?
      OR lower(events.source_provider) LIKE ?
      OR lower(events.source_url) LIKE ?
      OR lower(venues.name) LIKE ?
      OR lower(venues.address_line_1) LIKE ?
      OR lower(neighborhoods.name) LIKE ?
      OR lower(neighborhoods.slug) LIKE ?
    )`);
    const pattern = `%${filters.q.toLowerCase()}%`;
    values.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (filters.categories?.length) {
    conditions.push(`events.category IN (${filters.categories.map(() => "?").join(", ")})`);
    values.push(...filters.categories);
  }
  if (filters.neighborhoodIds?.length) {
    conditions.push(`events.neighborhood_id IN (${filters.neighborhoodIds.map(() => "?").join(", ")})`);
    values.push(...filters.neighborhoodIds);
  }
  if (filters.excludeSourceProviders?.length) {
    conditions.push(`events.source_provider NOT IN (${filters.excludeSourceProviders.map(() => "?").join(", ")})`);
    values.push(...filters.excludeSourceProviders);
  }
  if (!filters.includePast && !filters.date && !filters.startDate && !filters.endDate) {
    conditions.push(`substr(events.start_at, 1, 10) >= ?`);
    values.push(new Date().toISOString().slice(0, 10));
  }

  return getDb()
    .prepare(`
      SELECT events.*
      FROM events
      LEFT JOIN venues ON venues.id = events.venue_id
      LEFT JOIN neighborhoods ON neighborhoods.id = events.neighborhood_id
      WHERE ${conditions.join(" AND ")}
    `)
    .all(...values)
    .map(mapEvent);
}

export function findEventById(id) {
  const row = getDb().prepare(`SELECT * FROM events WHERE id = ?`).get(id);
  return row ? mapEvent(row) : null;
}

export function listVenuesByIds(ids) {
  if (ids.length === 0) return [];
  return getDb()
    .prepare(`SELECT * FROM venues WHERE id IN (${ids.map(() => "?").join(", ")})`)
    .all(...ids)
    .map((row) => ({
      id: row.id,
      name: row.name,
      addressLine1: row.address_line_1,
      city: row.city,
      stateCode: row.state_code,
      postalCode: row.postal_code,
      latitude: row.latitude,
      longitude: row.longitude,
      neighborhoodId: row.neighborhood_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
}

export function findVenueByName(name) {
  const row = getDb().prepare(`SELECT * FROM venues WHERE lower(name) = lower(?)`).get(String(name).trim());
  return row
    ? {
        id: row.id,
        name: row.name,
        addressLine1: row.address_line_1,
        city: row.city,
        stateCode: row.state_code,
        postalCode: row.postal_code,
        latitude: row.latitude,
        longitude: row.longitude,
        neighborhoodId: row.neighborhood_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export function createVenue(input) {
  const now = new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO venues (id, name, address_line_1, city, state_code, postal_code, latitude, longitude, neighborhood_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.id,
      input.name,
      input.addressLine1 ?? null,
      input.city ?? "San Francisco",
      input.stateCode ?? "CA",
      input.postalCode ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.neighborhoodId ?? null,
      now,
      now,
    );
  return findVenueByName(input.name);
}

export function upsertEvent(input) {
  const now = new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO events (
        id, source_provider, source_event_id, source_url, title, short_description, description, category, tags_json,
        start_at, end_at, timezone, venue_id, neighborhood_id, image_url, age_restriction, is_indoor, is_outdoor,
        price_min_cents, price_max_cents, currency_code, popularity_score, quality_score, status, source_status,
        normalized_fingerprint, last_seen_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_provider, source_event_id) DO UPDATE SET
        source_url = excluded.source_url,
        title = excluded.title,
        short_description = excluded.short_description,
        description = excluded.description,
        category = excluded.category,
        tags_json = excluded.tags_json,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        timezone = excluded.timezone,
        venue_id = excluded.venue_id,
        neighborhood_id = excluded.neighborhood_id,
        image_url = excluded.image_url,
        age_restriction = excluded.age_restriction,
        is_indoor = excluded.is_indoor,
        is_outdoor = excluded.is_outdoor,
        price_min_cents = excluded.price_min_cents,
        price_max_cents = excluded.price_max_cents,
        currency_code = excluded.currency_code,
        popularity_score = excluded.popularity_score,
        quality_score = excluded.quality_score,
        status = excluded.status,
        source_status = excluded.source_status,
        normalized_fingerprint = excluded.normalized_fingerprint,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `)
    .run(
      input.id,
      input.sourceProvider,
      input.sourceEventId,
      input.sourceUrl,
      input.title,
      input.shortDescription,
      input.description,
      input.category,
      JSON.stringify(input.tags),
      input.startAt,
      input.endAt,
      input.timezone,
      input.venueId,
      input.neighborhoodId,
      input.imageUrl,
      input.ageRestriction,
      input.isIndoor == null ? null : input.isIndoor ? 1 : 0,
      input.isOutdoor == null ? null : input.isOutdoor ? 1 : 0,
      input.priceMinCents,
      input.priceMaxCents,
      input.currencyCode,
      input.popularityScore,
      input.qualityScore,
      input.status,
      input.sourceStatus,
      input.normalizedFingerprint,
      now,
      now,
      now,
    );
}
