import type { BackendEventCard, BackendEventDetailResponse, BackendHydratedPlan, BackendLane } from "./backend-types";
import type { AuthState, EventCard, EventDetail, FilterOption, PlannerCollection } from "./types";

const categoryImages: Record<string, string> = {
  music: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=75",
  food: "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=1200&q=75",
  comedy: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?auto=format&fit=crop&w=1200&q=75",
  art: "https://images.unsplash.com/photo-1573148195900-7845dcb9b127?auto=format&fit=crop&w=1200&q=75",
  tech: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=75",
  outdoors: "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=1200&q=75",
  nightlife: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=75",
  family: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=75",
  community: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=75",
  sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=75",
  film: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=75",
  wellness: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=75",
};

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

export function mapBackendCard(card: BackendEventCard): EventCard {
  return {
    id: card.event.id,
    title: card.event.title,
    summary: card.event.shortDescription ?? card.event.description ?? "",
    imageUrl: card.event.imageUrl ?? categoryImages[card.event.category] ?? categoryImages.community,
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
