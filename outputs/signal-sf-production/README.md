# Signal SF Production

Signal SF Production is a production-style San Francisco events finder and planner built as a dependency-free Node.js monolith.

## What this version adds

- SQLite persistence instead of JSON files
- multi-user auth with password hashing and session cookies
- profile-first onboarding with goals, stage, roles, skills, networking intent, and CV summary
- repository and service layers
- admin ingestion endpoint
- paginated recommendation APIs with frontend-friendly `meta`
- goal-based recommendation lanes for frontend surfaces
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
- Bright Data: optional public-page renderer via `BRIGHT_DATA_BROWSER_WS_ENDPOINT` and `BRIGHT_DATA_SOURCE_URLS`. Use this for JavaScript-rendered public event pages when feeds or official APIs are not available.
- Scrapling: optional Python-backed public-page fetcher via `SCRAPLING_SOURCE_URLS`. Use this when a public page has structured event data but needs a stronger fetch/render layer than plain `fetch`.

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
ENABLE_BRIGHT_DATA_SCRAPING=true
BRIGHT_DATA_SOURCE_URLS=https://lu.ma/sf,https://www.eventbrite.com/d/ca--san-francisco/events/
BRIGHT_DATA_MAX_PAGES=12
ENABLE_SCRAPLING_SCRAPING=true
SCRAPLING_SOURCE_URLS=https://lu.ma/sf,https://www.eventbrite.com/d/ca--san-francisco/events/
SCRAPLING_FETCH_MODE=fetcher
SCRAPLING_MAX_PAGES=12
```

Configure Bright Data Browser API with either the full WSS endpoint:

```bash
BRIGHT_DATA_BROWSER_WS_ENDPOINT=wss://...
```

Or with separate fields from the Bright Data Browser API setup page:

```bash
BRIGHT_DATA_BROWSER_USERNAME=brd-customer-...-zone-scraping_browser1
BRIGHT_DATA_BROWSER_PASSWORD=...
BRIGHT_DATA_BROWSER_HOST=brd.superproxy.io:9222
```

Never commit the Bright Data endpoint or password. They contain credentials. Export them in your shell, load them through your process manager, or store them in deployment secrets.

Configure Scrapling on the backend host:

```bash
python3 -m pip install -r requirements-scrapling.txt
scrapling install
```

`SCRAPLING_FETCH_MODE` supports `fetcher`, `dynamic`, or `stealthy`. Start with `fetcher`; use `dynamic` only for public pages that need JavaScript rendering. Keep scraping limited to public pages that permit automated access.

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
  -d '{"providers":["eventbrite","meetup","luma","sf-feeds","bright-data","scrapling"],"dryRun":true}'
```

### Import source events

```bash
curl -X POST http://localhost:4180/api/admin/sync-sources \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev-admin-token" \
  -d '{"providers":["eventbrite","meetup","luma","sf-feeds","bright-data","scrapling"]}'
```

Scraping should stay opt-in and limited to public pages. The importer first reads structured `schema.org/Event` JSON-LD, then falls back to event-shaped objects embedded in rendered page JSON. Do not add login, paywall, private-page, or access-control bypass flows.

## Test

```bash
node --test
```

## Frontend integration helpers

Useful endpoints for frontend integration:

- `GET /api/me/recommendations?page=1&pageSize=12`
- `GET /api/events?page=1&pageSize=12`
- `GET /api/me/recommendation-lanes`

Feed endpoints now return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 12,
    "total": 42,
    "hasMore": true
  }
}
```
