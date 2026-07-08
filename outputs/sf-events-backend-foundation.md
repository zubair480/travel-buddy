# SF Events Backend Foundation

## Goal

Build an SF-only MVP backend that powers:

- personalized event discovery
- filtering and event detail retrieval
- save/bookmark flows
- one-day itinerary planning
- explainable recommendation scoring

This design is intentionally simple enough for one developer to implement quickly, while keeping contracts stable for a second developer building the frontend in parallel.

## Recommended Stack

- `Next.js` app for frontend and API in one repo
- `TypeScript` everywhere
- `Postgres` for relational data and filtering
- `Prisma` or `Drizzle` as the ORM layer
- `Zod` for request and response validation
- cron or scheduled jobs for event ingestion

Why this stack:

- one repo reduces coordination cost
- Postgres is enough for MVP filtering, saved events, and itinerary logic
- keeping API and frontend in the same codebase reduces contract drift
- ORM choice can stay flexible because the domain types are already defined separately

## Service Boundaries

Use a modular monolith first.

- `apps/web`
  - pages, API routes, auth integration
- `packages/domain`
  - shared types, enums, API contracts
- `packages/backend`
  - data access, services, ranking, planner, ingestion jobs

If you stay in one app instead of a monorepo, use the same boundaries under `src/`.

Suggested folders:

```text
src/
  app/
  pages/api/
  server/
    db/
    repositories/
    services/
      events/
      recommendations/
      planner/
      ingestion/
    lib/
  shared/
    types/
    schemas/
```

## Core Data Model

### `users`

Purpose: identity and account root

Fields:

- `id UUID PK`
- `email TEXT UNIQUE NOT NULL`
- `display_name TEXT NULL`
- `home_city_slug TEXT NOT NULL DEFAULT 'san-francisco'`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Indexes:

- unique on `email`

### `user_preferences`

Purpose: personalization inputs

Fields:

- `user_id UUID PK FK -> users.id`
- `interests TEXT[] NOT NULL`
- `disliked_categories TEXT[] NOT NULL`
- `preferred_neighborhood_slugs TEXT[] NOT NULL`
- `preferred_days_of_week SMALLINT[] NOT NULL`
- `preferred_day_parts TEXT[] NOT NULL`
- `indoor_preference TEXT NOT NULL`
- `budget_min_cents INTEGER NULL`
- `budget_max_cents INTEGER NULL`
- `max_travel_minutes INTEGER NULL`
- `group_context TEXT NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Notes:

- arrays are fine for MVP because preferences are user-scoped, not analytic-heavy
- normalize later only if query needs become complex

### `neighborhoods`

Purpose: local SF geography for preferences and travel assumptions

Fields:

- `id UUID PK`
- `city_slug TEXT NOT NULL`
- `slug TEXT UNIQUE NOT NULL`
- `name TEXT NOT NULL`
- `centroid_lat DOUBLE PRECISION NULL`
- `centroid_lng DOUBLE PRECISION NULL`

### `venues`

Purpose: canonical location records

Fields:

- `id UUID PK`
- `source_venue_id TEXT NULL`
- `name TEXT NOT NULL`
- `address_line_1 TEXT NULL`
- `address_line_2 TEXT NULL`
- `city TEXT NOT NULL DEFAULT 'San Francisco'`
- `state_code TEXT NOT NULL DEFAULT 'CA'`
- `postal_code TEXT NULL`
- `latitude DOUBLE PRECISION NULL`
- `longitude DOUBLE PRECISION NULL`
- `neighborhood_id UUID NULL FK -> neighborhoods.id`
- `google_place_id TEXT NULL`

Indexes:

- `neighborhood_id`
- `(latitude, longitude)`

### `events`

Purpose: normalized events inventory

Fields:

- `id UUID PK`
- `source_provider TEXT NOT NULL`
- `source_event_id TEXT NOT NULL`
- `source_url TEXT NOT NULL`
- `title TEXT NOT NULL`
- `short_description TEXT NULL`
- `description TEXT NULL`
- `category TEXT NOT NULL`
- `tags TEXT[] NOT NULL`
- `start_at TIMESTAMPTZ NOT NULL`
- `end_at TIMESTAMPTZ NULL`
- `timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles'`
- `venue_id UUID NULL FK -> venues.id`
- `neighborhood_id UUID NULL FK -> neighborhoods.id`
- `image_url TEXT NULL`
- `age_restriction TEXT NOT NULL`
- `is_indoor BOOLEAN NULL`
- `is_outdoor BOOLEAN NULL`
- `price_min_cents INTEGER NULL`
- `price_max_cents INTEGER NULL`
- `price_tier TEXT NOT NULL`
- `currency_code TEXT NOT NULL DEFAULT 'USD'`
- `popularity_score NUMERIC(5,2) NOT NULL DEFAULT 0`
- `quality_score NUMERIC(5,2) NOT NULL DEFAULT 0`
- `status TEXT NOT NULL`
- `source_status TEXT NOT NULL`
- `normalized_fingerprint TEXT NOT NULL`
- `last_seen_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Indexes:

- unique on `(source_provider, source_event_id)`
- `start_at`
- `category`
- `neighborhood_id`
- `(status, source_status)`
- `normalized_fingerprint`

Status guidance:

- `status`: `draft | published | cancelled | postponed | expired`
- `source_status`: `fresh | stale | failed`

### `saved_events`

Purpose: user bookmarks

Fields:

- `user_id UUID FK -> users.id`
- `event_id UUID FK -> events.id`
- `saved_at TIMESTAMPTZ NOT NULL`

Indexes:

- composite PK `(user_id, event_id)`
- `(user_id, saved_at DESC)`

### `itinerary_plans`

Purpose: a user’s one-day plan

Fields:

- `id UUID PK`
- `user_id UUID FK -> users.id`
- `city_slug TEXT NOT NULL DEFAULT 'san-francisco'`
- `plan_date DATE NOT NULL`
- `title TEXT NOT NULL`
- `notes TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Indexes:

- `(user_id, plan_date DESC)`

### `itinerary_items`

Purpose: ordered events inside a plan

Fields:

- `id UUID PK`
- `plan_id UUID FK -> itinerary_plans.id`
- `event_id UUID FK -> events.id`
- `sort_order INTEGER NOT NULL`
- `start_at_override TIMESTAMPTZ NULL`
- `end_at_override TIMESTAMPTZ NULL`
- `travel_buffer_minutes_before INTEGER NULL`
- `notes TEXT NULL`

Indexes:

- unique on `(plan_id, sort_order)`
- `plan_id`

### `user_event_feedback`

Purpose: behavioral signals for current and future ranking

Fields:

- `id UUID PK`
- `user_id UUID FK -> users.id`
- `event_id UUID FK -> events.id`
- `signal TEXT NOT NULL`
- `value NUMERIC(6,2) NOT NULL DEFAULT 1`
- `created_at TIMESTAMPTZ NOT NULL`

Signals:

- `viewed`
- `saved`
- `unsaved`
- `interested`
- `not_interested`
- `attended`
- `dismissed`

Indexes:

- `(user_id, event_id, created_at DESC)`
- `(user_id, signal, created_at DESC)`

## Shared Contract Types

Frontend and backend should share:

- `Event`
- `Venue`
- `Neighborhood`
- `UserPreferences`
- `EventCard`
- `EventRecommendation`
- `ItineraryPlan`
- `ItineraryItem`
- request and response DTOs for API routes

The starter types live in:

- `work/backend-foundation/src/types/domain.ts`
- `work/backend-foundation/src/types/api.ts`

## API Contract

All responses should be JSON with a top-level `data` key.

### Onboarding / preferences

#### `GET /api/me/preferences`

Response:

```json
{
  "data": {
    "userId": "uuid",
    "interests": ["music", "food"],
    "dislikedCategories": [],
    "preferredNeighborhoodSlugs": ["mission", "soma"],
    "preferredDaysOfWeek": [5, 6],
    "preferredDayParts": ["evening"],
    "indoorPreference": "mixed",
    "budgetMinCents": 0,
    "budgetMaxCents": 6000,
    "maxTravelMinutes": 30,
    "groupContext": "friends",
    "updatedAt": "2026-07-08T00:00:00.000Z"
  }
}
```

#### `PUT /api/me/preferences`

Request:

```json
{
  "interests": ["music", "food"],
  "preferredNeighborhoodSlugs": ["mission", "soma"],
  "preferredDaysOfWeek": [5, 6],
  "preferredDayParts": ["evening"],
  "indoorPreference": "mixed",
  "budgetMinCents": 0,
  "budgetMaxCents": 6000,
  "maxTravelMinutes": 30,
  "groupContext": "friends"
}
```

Validation notes:

- reject invalid category or neighborhood slugs with `400`
- reject `budgetMinCents > budgetMaxCents` with `400`

### Events feed

#### `GET /api/events`

Query params:

- `dateFrom`
- `dateTo`
- `categories[]`
- `neighborhoodSlugs[]`
- `priceTiers[]`
- `q`
- `page`
- `pageSize`
- `sort`

Recommended sorts:

- `recommended`
- `soonest`
- `popular`
- `price_low_to_high`

Response:

```json
{
  "data": [
    {
      "event": {
        "id": "uuid",
        "title": "Rooftop Jazz Night",
        "category": "music"
      },
      "venue": {
        "id": "uuid",
        "name": "Example Venue"
      },
      "neighborhood": {
        "id": "uuid",
        "slug": "mission",
        "name": "Mission"
      },
      "saved": true,
      "recommendation": {
        "score": 7.4,
        "reasons": ["matches your interest in music", "fits your budget"],
        "matchedInterests": ["music"],
        "matchedTags": ["live music"]
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 400,
    "hasMore": true
  }
}
```

### Event detail

#### `GET /api/events/:eventId`

Response:

```json
{
  "data": {
    "event": {},
    "venue": {},
    "neighborhood": {},
    "saved": false,
    "recommendation": {
      "score": 6.8,
      "reasons": ["matches your interest in food"]
    }
  },
  "related": [
    {
      "score": 6.1,
      "reasons": ["similar vibe", "nearby"]
    }
  ]
}
```

Errors:

- `404` if event missing or expired beyond retention policy

### Save / unsave event

#### `POST /api/me/saved-events`

Request:

```json
{
  "eventId": "uuid"
}
```

Response:

```json
{
  "data": {
    "eventId": "uuid",
    "saved": true
  }
}
```

#### `DELETE /api/me/saved-events/:eventId`

Response:

```json
{
  "data": {
    "eventId": "uuid",
    "saved": false
  }
}
```

### Recommendations

#### `GET /api/me/recommendations`

Same shape as `GET /api/events`, but defaults to personalized ranking and may include a debug block during development.

### Create / update itinerary

#### `POST /api/me/itineraries`

Request:

```json
{
  "planDate": "2026-07-11",
  "title": "Saturday in the Mission",
  "notes": "Late lunch first"
}
```

#### `PATCH /api/me/itineraries/:planId`

Request:

```json
{
  "title": "Updated title",
  "notes": "Updated notes"
}
```

### Add / remove / reorder itinerary items

#### `POST /api/me/itineraries/:planId/items`

Request:

```json
{
  "eventId": "uuid",
  "sortOrder": 2
}
```

#### `DELETE /api/me/itineraries/:planId/items/:itemId`

#### `POST /api/me/itineraries/:planId/items/reorder`

Request:

```json
{
  "itemIdsInOrder": ["item-1", "item-2", "item-3"]
}
```

### Planner validation

#### `GET /api/me/itineraries/:planId/validate`

Response:

```json
{
  "data": {
    "plan": {},
    "items": [],
    "warnings": [
      {
        "code": "TRAVEL_TIGHT",
        "message": "Only 15 minutes between events; estimated travel buffer is 25 minutes.",
        "itemIds": ["a", "b"],
        "severity": "warning"
      }
    ]
  }
}
```

### Feedback

#### `POST /api/me/event-feedback`

Request:

```json
{
  "eventId": "uuid",
  "signal": "not_interested",
  "value": 1
}
```

Use this for:

- interested
- not interested
- attended
- saved
- dismissed

## Recommendation Logic

Keep the first ranking pass transparent and tuneable.

### Scoring inputs

- category match
- tag match
- neighborhood preference
- time/day preference
- budget fit
- popularity boost
- quality boost
- diversity penalty
- prior negative feedback penalty

### MVP score formula

```text
score =
  categoryScore
  + tagScore
  + neighborhoodScore
  + dayPartScore
  + dayOfWeekScore
  + budgetScore
  + popularityScore
  + qualityScore
  + diversityPenalty
  + feedbackPenalty
```

Suggested weights:

- `categoryScore`: `+3` for direct interest match, `-1.5` for disliked category
- `tagScore`: up to `+2.25`
- `neighborhoodScore`: up to `+1.5`
- `dayPartScore`: `+1`
- `dayOfWeekScore`: `+0.75`
- `budgetScore`: from `-1.5` to `+1.5`
- `popularityScore`: `0` to `+1`
- `qualityScore`: `0` to `+1`
- `diversityPenalty`: `-0.75` if the feed is becoming too repetitive
- `feedbackPenalty`: `-2` for explicit dislike/dismiss, `+0.75` for save/interested/attended

Implementation starter:

- `work/backend-foundation/src/recommendation/scoreEvent.ts`

### Explainability

Store reasons per ranked event:

- `matches your interest in music`
- `fits your budget`
- `near neighborhoods you prefer`
- `trending with other locals`
- `similar to events you saved`

Frontend can show the first one or two reasons as editorial chips.

### How to improve later

Phase 2:

- add per-user click-through and save-through rates
- learn venue affinity
- learn neighborhood affinity by time of day
- add collaborative patterns only after enough user volume

## Planner Logic

MVP planner should be rule-based, not route-optimized.

### Rules

1. Sort items by `sort_order`
2. Use event times unless overrides are present
3. If event A ends after event B starts, create `OVERLAP`
4. Estimate travel buffer using neighborhood pair defaults
5. If free time between two events is less than travel buffer, create `TRAVEL_TIGHT`
6. If event end time is missing, create `MISSING_END_TIME`

Suggested travel defaults:

- same neighborhood: `10` min
- Mission <-> SoMa: `15` min
- most intra-city pairs: `20` min
- west side or cross-city jumps: `25-30` min

Implementation starter:

- `work/backend-foundation/src/planner/validatePlan.ts`

## Ingestion Pipeline

Use a staged ingestion flow.

### Step 1: Source adapters

Each source adapter should emit a common raw shape:

```ts
interface SourceEventRecord {
  provider: string;
  providerEventId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  startAt: string;
  endAt?: string | null;
  timezone?: string | null;
  venueName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  sourceUrl: string;
  priceText?: string | null;
  ageRestrictionText?: string | null;
}
```

### Step 2: Normalize

Normalize:

- category slugs
- tags
- time zone
- age restriction
- price
- description length
- source fingerprint

Implementation starter:

- `work/backend-foundation/src/ingestion/normalizeEvent.ts`

### Step 3: Deduplicate

MVP dedupe rules:

- same provider + source event id => exact same event
- otherwise compare normalized fingerprint:
  - normalized title
  - venue name
  - start date

Potential later improvements:

- fuzzy title similarity
- nearby coordinates
- source trust ranking

### Step 4: Geocode and neighborhood assignment

Flow:

1. if source gives lat/lng, trust but validate city bounds
2. if missing coordinates, geocode venue address
3. assign neighborhood by polygon lookup or nearest known neighborhood centroid
4. if still unknown, mark `neighborhood_id = null` and continue

For MVP, centroid mapping is acceptable if polygon data is not ready.

### Step 5: Refresh and staleness

Suggested rules:

- refresh near-term events more often than distant ones
- update `last_seen_at` every successful source sync
- mark events `stale` if unseen for 48 to 72 hours
- mark past events `expired` after end time passes

### Step 6: Quality scoring

Base quality score on completeness:

- has image
- has venue
- has neighborhood
- has end time
- has description
- has coordinates

This score is useful in ranking to avoid weak listings dominating the feed.

## Suggested Build Order

### Phase 1

- create tables and migrations
- define domain and API types
- create preferences endpoints
- create events feed and event detail endpoints using mock data or seed data

### Phase 2

- implement save/unsave
- implement itinerary create/update/add/remove/reorder
- implement planner validation endpoint

### Phase 3

- implement ingestion adapters and normalization pipeline
- compute quality score and fingerprint
- seed SF neighborhoods and event samples

### Phase 4

- turn on recommendation scoring
- attach explanation reasons
- record user feedback signals

## Risks

- event freshness is the biggest product risk
- deduping across sources will be messy
- low-quality source metadata can hurt recommendation quality
- planner trust drops fast if travel assumptions feel wrong

## Assumptions

- auth is handled elsewhere
- frontend will consume stable JSON contracts
- event ticketing is out of scope
- only one city is supported in schema behavior, even if city slug exists

## Defer Until After MVP

- real-time transit routing
- collaborative filtering
- map-heavy search experience
- chat-based concierge
- multi-day plans
- multi-city support
- payment or checkout integrations

## Deliverables Created

- starter backend package: `work/backend-foundation`
- schema SQL: `work/backend-foundation/db/schema.sql`
- shared contracts: `work/backend-foundation/src/types`
- ranking starter: `work/backend-foundation/src/recommendation/scoreEvent.ts`
- planner starter: `work/backend-foundation/src/planner/validatePlan.ts`
- ingestion starter: `work/backend-foundation/src/ingestion`
