import { events } from "./mock-data";
import type { EventCard, EventDetail, EventFilters, OneDayPlan, PlannerWarning } from "./types";

export function getEventCards(filters?: EventFilters): EventCard[] {
  let result = [...events];

  if (filters) {
    if (filters.category !== "any") {
      result = result.filter((event) => event.category === filters.category);
    }
    if (filters.neighborhood !== "any") {
      result = result.filter((event) => event.neighborhood === filters.neighborhood);
    }
    if (filters.price !== "any") {
      result = result.filter((event) => {
        if (filters.price === "free") return event.priceMin === 0;
        if (filters.price === "under25") return event.priceMin <= 25;
        if (filters.price === "under75") return event.priceMin <= 75;
        return true;
      });
    }
    if (filters.date === "weekend") {
      result = result.filter((event) => {
        const day = new Date(event.startsAt).getDay();
        return day === 0 || day === 6;
      });
    }

    result.sort((a, b) => {
      if (filters.sort === "soonest") return Date.parse(a.startsAt) - Date.parse(b.startsAt);
      if (filters.sort === "price-low") return a.priceMin - b.priceMin;
      if (filters.sort === "neighborhood") return a.neighborhood.localeCompare(b.neighborhood);
      return b.score - a.score;
    });
  } else {
    result.sort((a, b) => b.score - a.score);
  }

  return result;
}

export function getEventById(id: string): EventDetail | undefined {
  return events.find((event) => event.id === id);
}

export function getRelatedEvents(event: EventDetail): EventCard[] {
  return event.relatedEventIds.map(getEventById).filter(Boolean) as EventCard[];
}

export function getPlannerWarnings(plan: OneDayPlan): PlannerWarning[] {
  const planned = plan.items
    .map((item) => getEventById(item.eventId))
    .filter(Boolean)
    .sort((a, b) => Date.parse(a!.startsAt) - Date.parse(b!.startsAt)) as EventDetail[];

  const warnings: PlannerWarning[] = [];

  for (let index = 0; index < planned.length - 1; index += 1) {
    const current = planned[index];
    const next = planned[index + 1];
    const currentEnd = Date.parse(current.endsAt);
    const nextStart = Date.parse(next.startsAt);
    const gapMinutes = (nextStart - currentEnd) / 60000;

    if (gapMinutes < 0) {
      warnings.push({
        id: `${current.id}-${next.id}-overlap`,
        type: "overlap",
        message: `${current.title} overlaps with ${next.title}. Pick one or adjust the plan.`,
        eventIds: [current.id, next.id]
      });
    } else if (gapMinutes < 35 && current.neighborhood !== next.neighborhood) {
      warnings.push({
        id: `${current.id}-${next.id}-travel`,
        type: "travel",
        message: `${current.title} and ${next.title} are in different neighborhoods with only ${Math.round(gapMinutes)} minutes between them.`,
        eventIds: [current.id, next.id]
      });
    }
  }

  return warnings;
}
