# Signal SF

Signal SF is a self-contained MVP for a personalized San Francisco events finder and planner.

## What it includes

- preference-based event recommendations
- SF neighborhood-aware filtering
- save and unsave actions
- one-day itinerary plans
- conflict and travel-buffer warnings
- persistent local JSON data store

## Run it

From this folder:

```bash
node server.js
```

Then open `http://localhost:4173`.

## Files

- `server.js`: HTTP server and static file host
- `src/api.js`: API routes
- `src/store.js`: local persistence layer
- `src/recommendations.js`: ranking logic
- `src/planner.js`: itinerary validation logic
- `public/`: browser UI

## Notes

- This MVP uses seed SF event data, not live provider integrations
- It persists changes to `data/store.json`
- It requires no dependency install
