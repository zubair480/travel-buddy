import { TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR } from "../domain/constants.js";

function minutesBetween(startIso, endIso) {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

function travelBuffer(fromSlug, toSlug) {
  if (!fromSlug || !toSlug) return TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR.default;
  if (fromSlug === toSlug) return TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR.same_neighborhood;
  return TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR[`${fromSlug}|${toSlug}`] ?? TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR.default;
}

export function validatePlan(items) {
  const warnings = [];
  const sorted = [...items].sort((a, b) => a.item.sortOrder - b.item.sortOrder);

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    const currentEnd = current.item.endAtOverride ?? current.event.endAt;
    const nextStart = next ? next.item.startAtOverride ?? next.event.startAt : null;

    if (!currentEnd) {
      warnings.push({
        code: "MISSING_END_TIME",
        message: "This event is missing an end time, so schedule feasibility is less certain.",
        itemIds: [current.item.id],
        severity: "info",
      });
    }

    if (!next || !currentEnd || !nextStart) continue;

    const gap = minutesBetween(currentEnd, nextStart);
    const needed = travelBuffer(current.neighborhood?.slug, next.neighborhood?.slug);

    if (gap < 0) {
      warnings.push({
        code: "OVERLAP",
        message: "These events overlap in time.",
        itemIds: [current.item.id, next.item.id],
        severity: "error",
      });
      continue;
    }

    if (gap < needed) {
      warnings.push({
        code: "TRAVEL_TIGHT",
        message: `Only ${gap} minutes between events; estimated travel buffer is ${needed} minutes.`,
        itemIds: [current.item.id, next.item.id],
        severity: "warning",
      });
    }
  }

  return warnings;
}
