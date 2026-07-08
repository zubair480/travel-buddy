import test from "node:test";
import assert from "node:assert/strict";
import { scoreEvent } from "../src/services/recommendations.js";

test("scoreEvent boosts matching interests and neighborhoods", () => {
  const result = scoreEvent({
    event: {
      id: "e1",
      category: "music",
      tags: ["live music", "outdoor"],
      startAt: "2026-07-11T18:00:00-07:00",
      priceMinCents: 0,
      popularityScore: 80,
      qualityScore: 80,
      isIndoor: false,
      isOutdoor: true,
    },
    preferences: {
      interests: ["music"],
      dislikedCategories: [],
      preferredNeighborhoodSlugs: ["mission"],
      preferredDaysOfWeek: [6],
      preferredDayParts: ["evening"],
      indoorPreference: "mixed",
      budgetMaxCents: 5000,
    },
    neighborhoodSlug: "mission",
    feedback: [],
  });

  assert.ok(result.score > 6);
  assert.ok(result.reasons.some((reason) => reason.includes("interest")));
});
