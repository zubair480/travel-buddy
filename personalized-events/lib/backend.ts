import type { BackendEventCard, BackendEventDetailResponse, BackendHydratedPlan, BackendLane } from "./backend-types";
import type { AuthState, EventCard, EventDetail, FilterOption, PlannerCollection } from "./types";
import { sourceLabel } from "./source";

function titleCase(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPrice(min?: number | null, max?: number | null) {
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return "Free";
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (min != null && max != null && min !== max) {
    return `${formatter.format(min / 100)} - ${formatter.format(max / 100)}`;
  }
  return formatter.format(((max ?? min) ?? 0) / 100);
}

function resolveEventImage(imageUrl: string | null | undefined) {
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) return imageUrl;
  return undefined;
}

export function mapBackendCard(card: BackendEventCard): EventCard {
  const source = sourceLabel(card.event.sourceProvider, card.event.sourceUrl);
  return {
    id: card.event.id,
    title: card.event.title,
    summary: card.event.shortDescription ?? card.event.description ?? "",
    imageUrl: resolveEventImage(card.event.imageUrl),
    startsAt: card.event.startAt,
    endsAt: card.event.endAt ?? card.event.startAt,
    venueName: card.venue?.name ?? "Venue TBA",
    address: [card.venue?.addressLine1, card.venue?.city].filter(Boolean).join(", "),
    neighborhood: card.neighborhood?.name ?? "San Francisco",
    category: card.event.category,
    tags: card.event.tags,
    priceLabel: formatPrice(card.event.priceMinCents, card.event.priceMaxCents),
    priceMin: (card.event.priceMinCents ?? 0) / 100,
    priceMax: (card.event.priceMaxCents ?? 0) / 100,
    score: card.recommendation.score,
    recommendation: {
      label: card.recommendation.reasons[0] ?? "Recommended for you",
      detail: card.recommendation.reasons.join(". "),
      matchedPreferences: [...card.recommendation.matchedInterests, ...card.recommendation.matchedTags],
      score: card.recommendation.score,
    },
    saved: card.saved,
    isSaved: card.saved,
    sourceProvider: card.event.sourceProvider,
    sourceLabel: source,
    sourceUrl: card.event.sourceUrl ?? undefined,
  };
}

export function mapBackendDetail(payload: BackendEventDetailResponse): EventDetail {
  const mapped = mapBackendCard(payload.data);
  return {
    ...mapped,
    description: payload.data.event.description ?? payload.data.event.shortDescription ?? "",
    organizerName: payload.data.venue?.name ?? "Event organizer",
    sourceUrl: payload.data.event.sourceUrl ?? "",
    accessibilityNotes: undefined,
    transitNotes: undefined,
    relatedEventIds: payload.related.map((related: BackendEventCard) => related.event.id),
    related: payload.related.map(mapBackendCard),
  };
}

export function categoryOptions(categories: string[]): FilterOption[] {
  return [{ value: "any", label: "Any category" }, ...categories.map((value) => ({ value, label: titleCase(value) }))];
}

export function neighborhoodOptions(neighborhoods: { slug: string; name: string }[]): FilterOption[] {
  return [{ value: "any", label: "Any neighborhood" }, ...neighborhoods.map((item) => ({ value: item.slug, label: item.name }))];
}

export function laneCards(lanes: BackendLane[]) {
  return lanes.map((lane) => ({
    ...lane,
    items: lane.items.map(mapBackendCard),
  }));
}

export function plannerCollections(collections: BackendHydratedPlan[]): PlannerCollection[] {
  return collections.map((collection) => ({
    ...collection,
    items: collection.items.map((item) => ({
      item: item.item,
      event: mapBackendCard({
        event: item.event,
        venue: item.venue,
        neighborhood: item.neighborhood,
        saved: false,
        recommendation: {
          score: 0,
          reasons: [],
          matchedInterests: [],
          matchedTags: [],
        },
      }),
      rawVenue: item.venue,
      rawNeighborhood: item.neighborhood,
    })),
  }));
}

export function authState(me: AuthState) {
  return me;
}
