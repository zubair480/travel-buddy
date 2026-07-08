export type EventCategory = string;
export type BudgetLevel = "free" | "under25" | "under75" | "splurge";
export type SocialContext = "solo" | "date" | "friends" | "family" | "colleagues";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "late" | "late_night";
export type PreferredDay = "weekday" | "friday" | "saturday" | "sunday";
export type SortMode = "recommended" | "soonest" | "popular" | "price-low";
export type Neighborhood = string;

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
  neighborhood: Neighborhood;
  neighborhoodSlug?: string;
  category: string;
  tags: string[];
  priceLabel: string;
  priceMin: number;
  priceMax: number;
  score: number;
  recommendation: RecommendationReason;
  saved?: boolean;
  isSaved?: boolean;
  sourceUrl?: string;
}

export interface EventDetail extends EventCard {
  description: string;
  organizerName?: string;
  sourceUrl: string;
  accessibilityNotes?: string;
  transitNotes?: string;
  relatedEventIds: string[];
  related?: EventCard[];
}

export interface UserProfile {
  userId?: string;
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
  interests: string[];
  dislikedCategories?: string[];
  preferredNeighborhoodSlugs?: string[];
  preferredDaysOfWeek?: Array<number | string>;
  preferredDayParts?: string[];
  indoorPreference?: "indoor" | "outdoor" | "mixed";
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  maxTravelMinutes?: number;
  groupContext?: string;
  budget?: BudgetLevel;
  neighborhoods?: string[];
  preferredDays?: PreferredDay[];
  timeOfDay?: string[];
  socialContext?: SocialContext[];
  updatedAt?: string;
}

export interface EventFilters {
  q?: string;
  date: string;
  category: string;
  price: "any" | BudgetLevel;
  neighborhood: string;
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
  id?: string;
  code?: string;
  type?: "overlap" | "travel" | string;
  message: string;
  eventIds?: string[];
  itemIds?: string[];
  severity?: "info" | "warning" | "error";
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

export interface FilterOption {
  value: string;
  label: string;
}

export interface BackendRecommendation {
  score: number;
  reasons: string[];
  matchedInterests: string[];
  matchedTags: string[];
}

export interface BackendEvent {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  tags: string[];
  startAt: string;
  endAt: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
}

export interface BackendVenue {
  id: string;
  name: string;
  addressLine1?: string;
  city?: string;
}

export interface BackendNeighborhood {
  id: string;
  slug: string;
  name: string;
}

export interface BackendEventCard {
  event: BackendEvent;
  venue: BackendVenue | null;
  neighborhood: BackendNeighborhood | null;
  saved: boolean;
  recommendation: BackendRecommendation;
}

export interface BackendEventDetailResponse {
  data: BackendEventCard;
  related: BackendEventCard[];
}

export interface BackendUserPreferences {
  interests: string[];
  dislikedCategories?: string[];
  preferredNeighborhoodSlugs: string[];
  preferredDaysOfWeek?: string[];
  preferredDayParts: string[];
  indoorPreference?: string;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  maxTravelMinutes?: number;
  groupContext: string;
}

export interface BackendProfileInsights {
  inferredThemes: string[];
  hasResumeContext: boolean;
  profileCompletenessScore: number;
}

export interface BackendLane {
  key: string;
  title: string;
  description: string;
  items: BackendEventCard[];
}

export interface AuthState {
  authenticated: boolean;
  user?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface BackendBootstrapResponse {
  data: {
    user: { id: string; displayName: string; email: string };
    profile: UserProfile;
    preferences: BackendUserPreferences;
    profileInsights?: BackendProfileInsights;
    categories: string[];
    neighborhoods: BackendNeighborhood[];
    recommendations: BackendEventCard[];
    recommendationLanes: BackendLane[];
    saved: BackendEventCard[];
    plans: BackendItineraryCollection[];
  };
}

export interface BackendItineraryCollection {
  plan: {
    id: string;
    title: string;
    planDate: string;
    notes?: string | null;
  };
  items: Array<{
    item: {
      id: string;
      eventId: string;
      sortOrder: number;
      startAtOverride?: string | null;
      endAtOverride?: string | null;
      notes?: string | null;
    };
    event: BackendEvent;
    venue: BackendVenue | null;
    neighborhood: BackendNeighborhood | null;
  }>;
  warnings: PlannerWarning[];
}

export interface PlannerCollection {
  plan: BackendItineraryCollection["plan"];
  items: Array<{
    item: BackendItineraryCollection["items"][number]["item"];
    event: EventCard;
    rawVenue: BackendVenue | null;
    rawNeighborhood: BackendNeighborhood | null;
  }>;
  warnings: PlannerWarning[];
}
