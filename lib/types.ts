export type EventCategory =
  | "food"
  | "outdoors"
  | "music"
  | "arts"
  | "film"
  | "markets"
  | "wellness"
  | "community";

export type BudgetLevel = "free" | "under25" | "under75" | "splurge";
export type SocialContext = "solo" | "date" | "friends" | "family";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "late";
export type PreferredDay = "weekday" | "friday" | "saturday" | "sunday";

export type Neighborhood =
  | "Mission"
  | "Hayes Valley"
  | "Richmond"
  | "Sunset"
  | "North Beach"
  | "SoMa"
  | "Embarcadero"
  | "Golden Gate Park"
  | "Dogpatch"
  | "Marina";

export interface RecommendationReason {
  label: string;
  detail: string;
  matchedPreferences: string[];
}

export interface EventCard {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  address: string;
  neighborhood: Neighborhood;
  category: EventCategory;
  tags: string[];
  priceLabel: string;
  priceMin: number;
  priceMax: number;
  score: number;
  recommendation: RecommendationReason;
}

export interface EventDetail extends EventCard {
  description: string;
  organizerName: string;
  sourceUrl: string;
  accessibilityNotes?: string;
  transitNotes?: string;
  relatedEventIds: string[];
}

export interface UserPreferences {
  interests: EventCategory[];
  budget: BudgetLevel;
  neighborhoods: Neighborhood[];
  preferredDays: PreferredDay[];
  timeOfDay: TimeOfDay[];
  socialContext: SocialContext[];
}

export interface EventFilters {
  date: "any" | "today" | "tomorrow" | "weekend";
  category: "any" | EventCategory;
  price: "any" | BudgetLevel;
  neighborhood: "any" | Neighborhood;
  sort: "recommended" | "soonest" | "price-low" | "neighborhood";
}

export interface PlannerItem {
  eventId: string;
  startOverride?: string;
  notes?: string;
}

export interface PlannerWarning {
  id: string;
  type: "overlap" | "travel";
  message: string;
  eventIds: string[];
}

export interface OneDayPlan {
  id: string;
  date: string;
  title: string;
  items: PlannerItem[];
}
