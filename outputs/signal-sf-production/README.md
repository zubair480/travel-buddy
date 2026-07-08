# Signal SF Production

Signal SF Production is a production-style San Francisco events finder and planner built as a dependency-free Node.js monolith.

## What this version adds

- SQLite persistence instead of JSON files
- multi-user auth with password hashing and session cookies
- profile-first onboarding with goals, stage, roles, skills, networking intent, and CV summary
- repository and service layers
- admin ingestion endpoint
- seeded production database
- built-in test coverage for core ranking and planner logic
- cleaner environment-driven configuration

## Demo accounts

- User: `demo@signalsf.local` / `demo12345`
- Admin: `admin@signalsf.local` / `admin12345`

## Profile-first onboarding

Each user can now define:

- primary goals like learning, job search, startup building, or connecting in tech
- current stage and experience level
- target roles and skills
- networking intent
- pasted CV / resume / LinkedIn-style summary

That context is stored separately from event taste preferences and is used to boost relevant recommendations later.

## Run

```bash
node server.js
```

Default URL: `http://localhost:4180`

## Reset the database

```bash
node src/db/reset.js
```

The database will be recreated and re-seeded the next time the server starts.

## Admin ingestion

`POST /api/admin/ingest`

Auth options:

- login as the seeded admin account
- or send `x-admin-token: dev-admin-token`

Request shape:

```json
{
  "records": [
    {
      "provider": "partner-feed",
      "providerEventId": "abc-123",
      "title": "Sample Event",
      "description": "Imported event",
      "category": "music",
      "tags": ["live music"],
      "startAt": "2026-07-15T19:00:00-07:00",
      "endAt": "2026-07-15T21:00:00-07:00",
      "venueName": "SoMa Sound Hall",
      "neighborhoodSlug": "soma",
      "sourceUrl": "https://example.com/event/abc-123",
      "priceText": "$20"
    }
  ]
}
```

## Source integrations

The backend can now fetch/import SF events from configured providers through the same normalization path used by manual ingestion.

### Provider strategy

- Eventbrite: token-based API connector via `EVENTBRITE_TOKEN`.
- Meetup: token-based GraphQL connector via `MEETUP_TOKEN`. Meetup API access may require a Meetup Pro/API-enabled account.
- Luma: configured public/private calendar feeds via `LUMA_ICS_URLS`.
- Cerebral Valley: configured calendar feeds via `CEREBRAL_VALLEY_ICS_URLS`.
- Pie Social: configured calendar feeds via `PIE_SOCIAL_ICS_URLS`.
- Partiful: no first-party public discovery API is assumed. Import public events by configured JSON-LD event pages only when `ENABLE_PUBLIC_EVENT_SCRAPING=true`.
- Other SF event sources: configured RSS, ICS, or JSON-LD pages via `SF_EVENT_FEED_URLS`.

Use comma-separated URLs for feed env vars:

```bash
EVENTBRITE_TOKEN=...
MEETUP_TOKEN=...
LUMA_ICS_URLS=https://example.com/luma-calendar.ics
CEREBRAL_VALLEY_ICS_URLS=https://example.com/cerebral-valley.ics
PIE_SOCIAL_ICS_URLS=https://example.com/pie-social.ics
SF_EVENT_FEED_URLS=https://example.com/sf-events.rss,https://example.com/calendar.ics
ENABLE_PUBLIC_EVENT_SCRAPING=true
SCRAPE_EVENT_URLS=https://example.com/public-event-page
```

### Inspect configured providers

```bash
curl -H "x-admin-token: dev-admin-token" \
  http://localhost:4180/api/admin/source-providers
```

### Dry-run source sync

```bash
curl -X POST http://localhost:4180/api/admin/sync-sources \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev-admin-token" \
  -d '{"providers":["eventbrite","meetup","luma","sf-feeds"],"dryRun":true}'
```

### Import source events

```bash
curl -X POST http://localhost:4180/api/admin/sync-sources \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev-admin-token" \
  -d '{"providers":["eventbrite","meetup","luma","sf-feeds"]}'
```

Scraping should stay opt-in and limited to public pages that expose structured `schema.org/Event` JSON-LD. Do not add brittle HTML scraping for platforms that do not permit automated collection.

## Test

```bash
node --test
```
