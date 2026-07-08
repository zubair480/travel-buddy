import test from "node:test";
import assert from "node:assert/strict";
import { validatePlan } from "../src/services/planner.js";

test("validatePlan flags overlap and travel tight schedules", () => {
  const warnings = validatePlan([
    {
      item: { id: "1", sortOrder: 1, startAtOverride: null, endAtOverride: null },
      event: { startAt: "2026-07-11T18:00:00-07:00", endAt: "2026-07-11T19:00:00-07:00" },
      neighborhood: { slug: "mission" },
    },
    {
      item: { id: "2", sortOrder: 2, startAtOverride: null, endAtOverride: null },
      event: { startAt: "2026-07-11T19:05:00-07:00", endAt: "2026-07-11T20:00:00-07:00" },
      neighborhood: { slug: "soma" },
    },
  ]);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "TRAVEL_TIGHT");
});
