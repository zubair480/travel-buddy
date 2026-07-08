import { createId, hashPassword } from "../lib/security.js";
import { getSeedEvents, getSeedNeighborhoods, getSeedVenues } from "../domain/seedData.js";

function countRows(db, tableName) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
}

export function seedDatabaseIfEmpty(db) {
  if (countRows(db, "events") > 0) return;

  const now = new Date().toISOString();
  const adminId = createId("user");
  const userId = createId("user");

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, role, home_city_slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'san-francisco', ?, ?)
  `);

  insertUser.run(adminId, "admin@signalsf.local", hashPassword("admin12345"), "Signal Admin", "admin", now, now);
  insertUser.run(userId, "demo@signalsf.local", hashPassword("demo12345"), "SF Explorer", "user", now, now);

  const insertPreferences = db.prepare(`
    INSERT INTO user_preferences (
      user_id, interests_json, disliked_categories_json, preferred_neighborhood_slugs_json,
      preferred_days_of_week_json, preferred_day_parts_json, indoor_preference, budget_min_cents,
      budget_max_cents, max_travel_minutes, group_context, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPreferences.run(
    userId,
    JSON.stringify(["music", "food", "art"]),
    JSON.stringify([]),
    JSON.stringify(["mission", "hayes-valley", "soma"]),
    JSON.stringify([5, 6]),
    JSON.stringify(["afternoon", "evening"]),
    "mixed",
    0,
    5000,
    30,
    "friends",
    now,
  );

  insertPreferences.run(
    adminId,
    JSON.stringify(["tech", "food"]),
    JSON.stringify([]),
    JSON.stringify(["soma", "mission"]),
    JSON.stringify([4, 5, 6]),
    JSON.stringify(["afternoon", "evening"]),
    "mixed",
    0,
    7000,
    30,
    "solo",
    now,
  );

  const insertProfile = db.prepare(`
    INSERT INTO user_profiles (
      user_id, onboarding_completed, primary_goals_json, current_stage, experience_level,
      target_roles_json, skills_json, networking_intent, preferred_company_stage, bio,
      resume_text, city_hint, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run(
    userId,
    1,
    JSON.stringify(["learn", "connect_in_tech"]),
    "early_career",
    "intermediate",
    JSON.stringify(["product manager", "founding operator"]),
    JSON.stringify(["product", "community", "ai"]),
    "Meet thoughtful builders and operators in SF tech.",
    "startup",
    "Product-minded builder exploring tech events and community-driven learning.",
    "Experience across product, operations, and community-building. Looking for events that can lead to strong peers, collaborators, and practical learning.",
    "San Francisco",
    now,
    now,
  );

  insertProfile.run(
    adminId,
    1,
    JSON.stringify(["build_startup", "connect_in_tech"]),
    "founder",
    "advanced",
    JSON.stringify(["founder", "product lead"]),
    JSON.stringify(["startups", "go-to-market", "ai"]),
    "Find founders, early hires, and technical collaborators.",
    "pre_seed",
    "Admin account seeded for ingestion and founder-oriented discovery.",
    "Operator and founder profile used to test startup-oriented event recommendations.",
    "San Francisco",
    now,
    now,
  );

  const neighborhoods = getSeedNeighborhoods();
  const neighborhoodIdsBySlug = new Map();
  const insertNeighborhood = db.prepare(`
    INSERT INTO neighborhoods (id, city_slug, slug, name, centroid_lat, centroid_lng)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const item of neighborhoods) {
    const id = createId("neighborhood");
    neighborhoodIdsBySlug.set(item.slug, id);
    insertNeighborhood.run(id, item.citySlug, item.slug, item.name, item.centroidLat, item.centroidLng);
  }

  const venues = getSeedVenues();
  const venueIdsBySlug = new Map();
  const insertVenue = db.prepare(`
    INSERT INTO venues (id, name, address_line_1, postal_code, latitude, longitude, neighborhood_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of venues) {
    const id = createId("venue");
    venueIdsBySlug.set(item.slug, id);
    insertVenue.run(id, item.name, item.addressLine1, item.postalCode, item.latitude, item.longitude, neighborhoodIdsBySlug.get(item.neighborhoodSlug), now, now);
  }

  const insertEvent = db.prepare(`
    INSERT INTO events (
      id, source_provider, source_event_id, source_url, title, short_description, description, category, tags_json,
      start_at, end_at, timezone, venue_id, neighborhood_id, image_url, age_restriction, is_indoor, is_outdoor,
      price_min_cents, price_max_cents, currency_code, popularity_score, quality_score, status, source_status,
      normalized_fingerprint, last_seen_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const eventIds = [];
  for (const item of getSeedEvents()) {
    const id = createId("event");
    eventIds.push({ id, sourceEventId: item.sourceEventId });
    insertEvent.run(
      id,
      item.sourceProvider,
      item.sourceEventId,
      item.sourceUrl,
      item.title,
      item.shortDescription,
      item.description,
      item.category,
      JSON.stringify(item.tags),
      item.startAt,
      item.endAt,
      item.timezone,
      venueIdsBySlug.get(item.venueSlug),
      neighborhoodIdsBySlug.get(item.neighborhoodSlug),
      item.imageUrl,
      item.ageRestriction,
      item.isIndoor ? 1 : 0,
      item.isOutdoor ? 1 : 0,
      item.priceMinCents,
      item.priceMaxCents,
      item.currencyCode,
      item.popularityScore,
      item.qualityScore,
      item.status,
      item.sourceStatus,
      item.normalizedFingerprint,
      now,
      now,
      now,
    );
  }

  const eventIdBySource = new Map(eventIds.map((item) => [item.sourceEventId, item.id]));
  db.prepare(`INSERT INTO saved_events (user_id, event_id, saved_at) VALUES (?, ?, ?)`).run(userId, eventIdBySource.get("seed-001"), now);
  db.prepare(`INSERT INTO saved_events (user_id, event_id, saved_at) VALUES (?, ?, ?)`).run(userId, eventIdBySource.get("seed-002"), now);

  const planId = createId("plan");
  db.prepare(`
    INSERT INTO itinerary_plans (id, user_id, city_slug, plan_date, title, notes, created_at, updated_at)
    VALUES (?, ?, 'san-francisco', '2026-07-11', 'Saturday in SF', 'Start around lunch and keep the route compact.', ?, ?)
  `).run(planId, userId, now, now);

  db.prepare(`
    INSERT INTO itinerary_items (id, plan_id, event_id, sort_order, start_at_override, end_at_override, notes)
    VALUES (?, ?, ?, ?, NULL, NULL, NULL)
  `).run(createId("item"), planId, eventIdBySource.get("seed-004"), 1);
  db.prepare(`
    INSERT INTO itinerary_items (id, plan_id, event_id, sort_order, start_at_override, end_at_override, notes)
    VALUES (?, ?, ?, ?, NULL, NULL, NULL)
  `).run(createId("item"), planId, eventIdBySource.get("seed-001"), 2);

  db.prepare(`
    INSERT INTO user_event_feedback (id, user_id, event_id, signal, value, created_at)
    VALUES (?, ?, ?, 'saved', 1, ?)
  `).run(createId("feedback"), userId, eventIdBySource.get("seed-001"), now);
}
