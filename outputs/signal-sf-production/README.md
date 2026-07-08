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
