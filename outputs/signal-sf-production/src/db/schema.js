export const schemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  home_city_slug TEXT NOT NULL DEFAULT 'san-francisco',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS neighborhoods (
  id TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  centroid_lat REAL,
  centroid_lng REAL
);

CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address_line_1 TEXT,
  city TEXT NOT NULL DEFAULT 'San Francisco',
  state_code TEXT NOT NULL DEFAULT 'CA',
  postal_code TEXT,
  latitude REAL,
  longitude REAL,
  neighborhood_id TEXT REFERENCES neighborhoods(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  source_provider TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  category TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  timezone TEXT NOT NULL,
  venue_id TEXT REFERENCES venues(id),
  neighborhood_id TEXT REFERENCES neighborhoods(id),
  image_url TEXT,
  age_restriction TEXT NOT NULL,
  is_indoor INTEGER,
  is_outdoor INTEGER,
  price_min_cents INTEGER,
  price_max_cents INTEGER,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  popularity_score REAL NOT NULL DEFAULT 0,
  quality_score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  source_status TEXT NOT NULL DEFAULT 'fresh',
  normalized_fingerprint TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_provider, source_event_id)
);

CREATE INDEX IF NOT EXISTS events_start_at_idx ON events(start_at);
CREATE INDEX IF NOT EXISTS events_category_idx ON events(category);
CREATE INDEX IF NOT EXISTS events_neighborhood_idx ON events(neighborhood_id);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interests_json TEXT NOT NULL,
  disliked_categories_json TEXT NOT NULL,
  preferred_neighborhood_slugs_json TEXT NOT NULL,
  preferred_days_of_week_json TEXT NOT NULL,
  preferred_day_parts_json TEXT NOT NULL,
  indoor_preference TEXT NOT NULL,
  budget_min_cents INTEGER,
  budget_max_cents INTEGER,
  max_travel_minutes INTEGER,
  group_context TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  primary_goals_json TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  target_roles_json TEXT NOT NULL,
  skills_json TEXT NOT NULL,
  networking_intent TEXT,
  preferred_company_stage TEXT,
  bio TEXT,
  resume_text TEXT,
  city_hint TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_events (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS itinerary_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_slug TEXT NOT NULL,
  plan_date TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES itinerary_plans(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  start_at_override TEXT,
  end_at_override TEXT,
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS itinerary_plan_sort_idx ON itinerary_items(plan_id, sort_order);

CREATE TABLE IF NOT EXISTS user_event_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  signal TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
`;
