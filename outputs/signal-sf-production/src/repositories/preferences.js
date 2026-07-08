import { getDb } from "../db/client.js";

function mapPreferences(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    interests: JSON.parse(row.interests_json),
    dislikedCategories: JSON.parse(row.disliked_categories_json),
    preferredNeighborhoodSlugs: JSON.parse(row.preferred_neighborhood_slugs_json),
    preferredDaysOfWeek: JSON.parse(row.preferred_days_of_week_json),
    preferredDayParts: JSON.parse(row.preferred_day_parts_json),
    indoorPreference: row.indoor_preference,
    budgetMinCents: row.budget_min_cents,
    budgetMaxCents: row.budget_max_cents,
    maxTravelMinutes: row.max_travel_minutes,
    groupContext: row.group_context,
    updatedAt: row.updated_at,
  };
}

export function findPreferencesByUserId(userId) {
  return mapPreferences(getDb().prepare(`SELECT * FROM user_preferences WHERE user_id = ?`).get(userId));
}

export function upsertPreferences(preferences) {
  getDb()
    .prepare(`
      INSERT INTO user_preferences (
        user_id, interests_json, disliked_categories_json, preferred_neighborhood_slugs_json,
        preferred_days_of_week_json, preferred_day_parts_json, indoor_preference, budget_min_cents,
        budget_max_cents, max_travel_minutes, group_context, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        interests_json = excluded.interests_json,
        disliked_categories_json = excluded.disliked_categories_json,
        preferred_neighborhood_slugs_json = excluded.preferred_neighborhood_slugs_json,
        preferred_days_of_week_json = excluded.preferred_days_of_week_json,
        preferred_day_parts_json = excluded.preferred_day_parts_json,
        indoor_preference = excluded.indoor_preference,
        budget_min_cents = excluded.budget_min_cents,
        budget_max_cents = excluded.budget_max_cents,
        max_travel_minutes = excluded.max_travel_minutes,
        group_context = excluded.group_context,
        updated_at = excluded.updated_at
    `)
    .run(
      preferences.userId,
      JSON.stringify(preferences.interests),
      JSON.stringify(preferences.dislikedCategories),
      JSON.stringify(preferences.preferredNeighborhoodSlugs),
      JSON.stringify(preferences.preferredDaysOfWeek),
      JSON.stringify(preferences.preferredDayParts),
      preferences.indoorPreference,
      preferences.budgetMinCents,
      preferences.budgetMaxCents,
      preferences.maxTravelMinutes,
      preferences.groupContext,
      preferences.updatedAt,
    );
  return findPreferencesByUserId(preferences.userId);
}
