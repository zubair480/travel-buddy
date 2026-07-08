import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initializeDatabase } from "../src/db/client.js";
import { getEventDetail, getRecommendationLanes, getRecommendations } from "../src/services/app.js";
import { findUserByEmail } from "../src/repositories/users.js";

const tempRoot = mkdtempSync(path.join(tmpdir(), "signal-sf-tests-"));
mkdirSync(tempRoot, { recursive: true });
initializeDatabase({
  databasePath: path.join(tempRoot, "signal-sf.db"),
});

const demoUser = findUserByEmail("demo@signalsf.local");

test("getRecommendations returns paginated items and meta", () => {
  const payload = getRecommendations(
    demoUser.id,
    { q: "", date: "", categories: [], neighborhoodSlugs: [] },
    "recommended",
    { page: 1, pageSize: 3 },
  );

  assert.equal(payload.data.length, 3);
  assert.equal(payload.meta.page, 1);
  assert.equal(payload.meta.pageSize, 3);
  assert.ok(payload.meta.total >= 3);
});

test("getRecommendationLanes returns goal-oriented recommendation groups", () => {
  const lanes = getRecommendationLanes(demoUser.id);
  assert.ok(lanes.length >= 4);
  assert.equal(lanes[0].key, "for_you");
  assert.ok(Array.isArray(lanes[0].items));
  assert.ok(lanes.some((lane) => lane.key === "build_startup"));
});

test("getEventDetail returns hydrated related event cards", () => {
  const firstRecommendation = getRecommendations(
    demoUser.id,
    { q: "", date: "", categories: [], neighborhoodSlugs: [] },
    "recommended",
    { page: 1, pageSize: 1 },
  ).data[0];

  const detail = getEventDetail(demoUser.id, firstRecommendation.event.id);

  assert.ok(detail);
  assert.equal(detail.data.event.id, firstRecommendation.event.id);
  assert.ok(Array.isArray(detail.related));
  assert.ok(detail.related.every((entry) => entry.event?.id && entry.recommendation?.score >= 0));
});
