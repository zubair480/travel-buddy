import type { TimeOfDay } from "./types";

export interface ApiEnvelope<T> {
  data: T;
  debug?: unknown;
}

export interface ApiErrorEnvelope {
  error: string;
}

export interface BackendUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  homeCitySlug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  authenticated: boolean;
  user?: BackendUser;
}

export interface BackendProfile {
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

export interface BackendPreferences {
  userId: string;
  interests: string[];
  dislikedCategories: string[];
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

export interface BackendNeighborhood {
  id: string;
  citySlug: string;
  slug: string;
  name: string;
  centroidLat?: number | null;
  centroidLng?: number | null;
}

export interface BackendVenue {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  neighborhoodId: string;
}

export interface BackendEvent {
  id: string;
  sourceProvider: string;
  sourceEventId: string;
  sourceUrl?: string | null;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  category: string;
  tags: string[];
  startAt: string;
  endAt: string;
  timezone: string;
  venueId: string;
  neighborhoodId: string;
  imageUrl?: string | null;
  ageRestriction?: string | null;
  isIndoor?: boolean | null;
  isOutdoor?: boolean | null;
  priceMinCents?: number | null;
  priceMaxCents?: number | null;
  currencyCode?: string | null;
  popularityScore: number;
  qualityScore: number;
  status: string;
}

export interface BackendRecommendation {
  score: number;
  reasons: string[];
  matchedInterests: string[];
  matchedTags: string[];
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

export interface BackendPlan {
  id: string;
  userId: string;
  citySlug: string;
  planDate: string;
  title: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendPlanItem {
  id: string;
  planId: string;
  eventId: string;
  sortOrder: number;
  startAtOverride?: string | null;
  endAtOverride?: string | null;
  notes?: string | null;
}

export interface BackendHydratedPlanItem {
  item: BackendPlanItem;
  event: BackendEvent;
  venue: BackendVenue | null;
  neighborhood: BackendNeighborhood | null;
}

export interface BackendPlannerWarning {
  id: string;
  type: "overlap" | "travel" | string;
  message: string;
  eventIds: string[];
  itemIds?: string[];
  code?: string;
  severity?: "info" | "warning" | "error";
}

export interface BackendHydratedPlan {
  plan: BackendPlan;
  items: BackendHydratedPlanItem[];
  warnings: BackendPlannerWarning[];
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

export interface BootstrapPayload {
  user: BackendUser;
  profile: BackendProfile;
  preferences: BackendPreferences;
  profileInsights?: BackendProfileInsights;
  neighborhoods: BackendNeighborhood[];
  categories: string[];
  recommendations: BackendEventCard[];
  recommendationLanes: BackendLane[];
  saved: BackendEventCard[];
  plans: BackendPlan[];
}
