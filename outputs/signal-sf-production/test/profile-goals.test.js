import test from "node:test";
import assert from "node:assert/strict";
import { applyProfileGoalBoost } from "../src/services/recommendations.js";

test("applyProfileGoalBoost raises score for startup-oriented tech events", () => {
  const boosted = applyProfileGoalBoost(
    { score: 5, reasons: ["Fits your budget"], matchedInterests: [], matchedTags: [] },
    { category: "tech", title: "Founder demo night", description: "Meet startup builders", tags: ["founders", "networking"] },
    { primaryGoals: ["build_startup"], targetRoles: ["founder"], skills: ["founders"] },
  );

  assert.ok(boosted.score > 5);
  assert.ok(boosted.reasons.includes("Aligned with your current goals"));
});
