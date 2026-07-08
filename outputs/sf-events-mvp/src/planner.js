import { TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR } from "./constants.js";

function minutesBetween(startIso, endIso) {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

function getTravelBufferMinutes(fromSlug, toSlug) {
  if (!fromSlug || !toSlug) return TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR.default;
  if (fromSlug === toSlug) return TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR.same_neighborhood;
  return (
    TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR[`${fromSlug}|${toSlug}`] ??
    TRAVEL_BUFFER_MINUTES_BY_NEIGHBORHOOD_PAIR.default
  );
}

function getEffectiveStart(item, event) {
  return item.startAtOverride ?? event.startAt;
}

function getEffectiveEnd(item, event) {
  return item.endAtOverride ?? event.endAt;
}

export function hydratePlan(state, planId) {
  const plan = state.itineraries.find((item) => item.id === planId);
  if (!plan) return null;

  const items = state.itineraryItems
    .filter((item) => item.planId === planId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const event = state.events.find((eventRecord) => eventRecord.id === item.eventId);
      const venue = state.venues.find((venueRecord) => venueRecord.id === event?.venueId) ?? null;
      const neighborhood = state.neighborhoods.find((neighborhoodRecord) => neighborhoodRecord.id === event?.neighborhoodId) ?? null;
      return { item, event, venue, neighborhood };
    })
    .filter((item) => item.event);

  return { plan, items };
}

export function validatePlan(state, planId) {
  const hydrated = hydratePlan(state, planId);
  if (!hydrated) return null;

  const warnings = [];
  const items = hydrated.items;

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const next = items[index + 1];
    const currentEnd = getEffectiveEnd(current.item, current.event);

    if (!currentEnd) {
      warnings.push({
        code: "MISSING_END_TIME",
        message: "This event is missing an end time, so schedule feasibility is less certain.",
        itemIds: [current.item.id],
        severity: "info",
      });
    }

    if (!next || !currentEnd) continue;

    const gap = minutesBetween(currentEnd, getEffectiveStart(next.item, next.event));
    const travelBuffer = getTravelBufferMinutes(current.neighborhood?.slug, next.neighborhood?.slug);

    if (gap < 0) {
      warnings.push({
        code: "OVERLAP",
        message: "These events overlap in time.",
        itemIds: [current.item.id, next.item.id],
        severity: "error",
      });
      continue;
    }

    if (gap < travelBuffer) {
      warnings.push({
        code: "TRAVEL_TIGHT",
        message: `Only ${gap} minutes between events; estimated travel buffer is ${travelBuffer} minutes.`,
        itemIds: [current.item.id, next.item.id],
        severity: "warning",
      });
    }
  }

  return {
    plan: hydrated.plan,
    items: hydrated.items,
    warnings,
  };
}
