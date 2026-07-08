# travel-buddy

This repo now includes the full local production-style app for the San Francisco personalized events finder and planner.

Main app:

- `outputs/signal-sf-production`

Included features:

- multi-user auth
- profile-first onboarding
- goals, roles, skills, and CV summary capture
- personalized event recommendations
- saved events
- itinerary planning
- planner conflict warnings
- admin ingestion endpoint
- SQLite persistence
- tests

Run:

```bash
cd outputs/signal-sf-production
node server.js
```

Demo accounts:

- `demo@signalsf.local / demo12345`
- `admin@signalsf.local / admin12345`
