export type EventCategory = string;
export type BudgetLevel = "free" | "under25" | "under75" | "splurge";
export type SocialContext = "solo" | "date" | "friends" | "family" | "colleagues";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "late";
export type PreferredDay = "weekday" | "friday" | "saturday" | "sunday";
export type SortMode = "recommended" | "soonest" | "popular" | "price-low";

export interface RecommendationReason {
  label: string;
  detail: string;
  matchedPreferences: string[];
  score: number;
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
  neighborhood: string;
  neighborhoodSlug: string;
  category: EventCategory;
  tags: string[];
  priceLabel: string;
  priceMin: number;
  priceMax: number;
  score: number;
  isSaved: boolean;
  sourceUrl?: string;
  recommendation: RecommendationReason;
}

export interface EventDetail extends EventCard {
  description: string;
  organizerName?: string;
  accessibilityNotes?: string;
  transitNotes?: string;
}

export interface UserProfile {
  userId: string;
  onboardingCompleted: boolean;
  primaryGoals: string[];
  currentStage: string;
  experienceLevel: string;
  targetRoles: string[];
  skills: string[];
  networkingIntent: string;
  preferredCompanyStage: string;
  bio: string;
  resumeText: string;
  cityHint: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPreferences {
  userId?: string;
  interests: EventCategory[];
  dislikedCategories: EventCategory[];
  preferredNeighborhoodSlugs: string[];
  preferredDaysOfWeek: number[];
  preferredDayParts: TimeOfDay[];
  indoorPreference: "indoor" | "outdoor" | "mixed";
  budgetMinCents: number;
  budgetMaxCents: number;
  maxTravelMinutes: number;
  groupContext: string;
  updatedAt?: string;
}

export interface EventFilters {
  q: string;
  date: "any" | "today" | "tomorrow" | "weekend";
  category: "any" | EventCategory;
  price: "any" | BudgetLevel;
  neighborhood: "any" | string;
  sort: SortMode;
}

export interface PlanItem {
  id: string;
  eventId: string;
  sortOrder: number;
  startAtOverride?: string | null;
  endAtOverride?: string | null;
  notes?: string | null;
  event: EventCard;
}

export interface PlannerWarning {
  id: string;
  type: "overlap" | "travel" | string;
  message: string;
  eventIds: string[];
}

export interface OneDayPlan {
  id: string;
  date: string;
  title: string;
  notes?: string | null;
  items: PlanItem[];
  warnings: PlannerWarning[];
}

export interface NeighborhoodOption {
  id: string;
  slug: string;
  name: string;
}
