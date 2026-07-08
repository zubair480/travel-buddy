import type { BackendEventCard, BackendHydratedPlan, BackendProfile, BackendPreferences } from "./backend-types";
import type { EventCard, OneDayPlan, UserPreferences, UserProfile } from "./types";

const fallbackImage =
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=75";

function dollars(cents?: number | null) {
  return Math.round((cents ?? 0) / 100);
}

function formatPriceLabel(min?: number | null, max?: number | null) {
  const minDollars = dollars(min);
  const maxDollars = dollars(max);
  if (!minDollars && !maxDollars) return "Free";
  if (minDollars === maxDollars) return `$${minDollars}`;
  if (!minDollars) return `Up to $${maxDollars}`;
  return `$${minDollars}-$${maxDollars}`;
}

export function toEventCard(card: BackendEventCard): EventCard {
  const event = card.event;
  const venue = card.venue;
  const neighborhood = card.neighborhood;
  const reasons = card.recommendation.reasons ?? [];
  const venueAddress = [venue?.addressLine1, venue?.city, venue?.stateCode].filter(Boolean).join(", ");

  return {
    id: event.id,
    title: event.title || "Untitled event",
    summary: event.shortDescription || event.description || "Details are still being collected for this event.",
    imageUrl: event.imageUrl || fallbackImage,
    startsAt: event.startAt,
    endsAt: event.endAt,
    venueName: venue?.name || "Venue TBA",
    address: venueAddress || "Address TBA",
    neighborhood: neighborhood?.name || "San Francisco",
    neighborhoodSlug: neighborhood?.slug || "",
    category: event.category || "community",
    tags: Array.isArray(event.tags) ? event.tags : [],
    priceLabel: formatPriceLabel(event.priceMinCents, event.priceMaxCents),
    priceMin: dollars(event.priceMinCents),
    priceMax: dollars(event.priceMaxCents),
    score: card.recommendation.score ?? 0,
    isSaved: Boolean(card.saved),
    sourceUrl: event.sourceUrl ?? undefined,
    recommendation: {
      label: reasons[0] || "Recommended for your SF context",
      detail: reasons.length ? reasons.join(". ") : "This event is part of the current San Francisco feed.",
      matchedPreferences: [...(card.recommendation.matchedInterests ?? []), ...(card.recommendation.matchedTags ?? [])],
      score: card.recommendation.score ?? 0,
    },
  };
}

export function toEventDetail(card: BackendEventCard): EventCard {
  return toEventCard(card);
}

export function toProfile(profile: BackendProfile): UserProfile {
  return {
    ...profile,
    primaryGoals: profile.primaryGoals ?? [],
    targetRoles: profile.targetRoles ?? [],
    skills: profile.skills ?? [],
    networkingIntent: profile.networkingIntent ?? "",
    preferredCompanyStage: profile.preferredCompanyStage ?? "",
    bio: profile.bio ?? "",
    resumeText: profile.resumeText ?? "",
    cityHint: profile.cityHint || "San Francisco",
  };
}

export function toPreferences(preferences: BackendPreferences): UserPreferences {
  return {
    ...preferences,
    interests: preferences.interests ?? [],
    dislikedCategories: preferences.dislikedCategories ?? [],
    preferredNeighborhoodSlugs: preferences.preferredNeighborhoodSlugs ?? [],
    preferredDaysOfWeek: preferences.preferredDaysOfWeek ?? [],
    preferredDayParts: preferences.preferredDayParts ?? [],
    indoorPreference: preferences.indoorPreference ?? "mixed",
    budgetMinCents: preferences.budgetMinCents ?? 0,
    budgetMaxCents: preferences.budgetMaxCents ?? 5000,
    maxTravelMinutes: preferences.maxTravelMinutes ?? 30,
    groupContext: preferences.groupContext ?? "friends",
  };
}

export function toPlan(plan: BackendHydratedPlan): OneDayPlan {
  return {
    id: plan.plan.id,
    date: plan.plan.planDate,
    title: plan.plan.title,
    notes: plan.plan.notes,
    items: plan.items.map((entry) => ({
      id: entry.item.id,
      eventId: entry.item.eventId,
      sortOrder: entry.item.sortOrder,
      startAtOverride: entry.item.startAtOverride,
      endAtOverride: entry.item.endAtOverride,
      notes: entry.item.notes,
      event: toEventCard({
        event: entry.event,
        venue: entry.venue,
        neighborhood: entry.neighborhood,
        saved: true,
        recommendation: {
          score: entry.event.qualityScore ?? 0,
          reasons: ["In your current plan"],
          matchedInterests: [],
          matchedTags: [],
        },
      }),
    })),
    warnings: plan.warnings ?? [],
  };
}
