import { findPreferencesByUserId, upsertPreferences } from "../repositories/preferences.js";
import { findEventById, listEvents, listNeighborhoods, listVenuesByIds } from "../repositories/events.js";
import { listSavedEventIds, saveEvent, unsaveEvent } from "../repositories/savedEvents.js";
import { listFeedbackForUser, recordFeedback } from "../repositories/feedback.js";
import { createPlan, createPlanItem, deletePlanItem, findPlanById, listItemsForPlan, listPlansForUser, reorderPlanItems, updatePlan } from "../repositories/itineraries.js";
import { createId } from "../lib/security.js";
import { allowedCategoriesForGoals, applyProfileGoalBoost, scoreEvent } from "./recommendations.js";
import { validatePlan } from "./planner.js";
import { findProfileByUserId, upsertProfile } from "../repositories/profiles.js";

function ensureProfile(userId) {
  const existing = findProfileByUserId(userId);
  if (existing) return existing;
  const now = new Date().toISOString();
  return upsertProfile({
    userId,
    onboardingCompleted: false,
    primaryGoals: [],
    currentStage: "exploring",
    experienceLevel: "intermediate",
    targetRoles: [],
    skills: [],
    networkingIntent: "",
    preferredCompanyStage: "",
    bio: "",
    resumeText: "",
    cityHint: "San Francisco",
    createdAt: now,
    updatedAt: now,
  });
}

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function normalizePageNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function paginate(items, { page = 1, pageSize = 20 } = {}) {
  const safePage = normalizePageNumber(page, 1);
  const safePageSize = Math.min(Math.max(normalizePageNumber(pageSize, 20), 1), 50);
  const start = (safePage - 1) * safePageSize;
  const data = items.slice(start, start + safePageSize);

  return {
    data,
    meta: {
      page: safePage,
      pageSize: safePageSize,
      total: items.length,
      hasMore: start + safePageSize < items.length,
    },
  };
}

function dedupeEventCards(cards) {
  const byKey = new Map();
  for (const card of cards) {
    const key = canonicalEventKey(card);
    const existing = byKey.get(key);
    if (!existing || eventCardCompletenessScore(card) > eventCardCompletenessScore(existing)) {
      byKey.set(key, card);
    }
  }
  return Array.from(byKey.values());
}

function canonicalEventKey(card) {
  const sourceUrl = card.event.sourceUrl;
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
    try {
      const url = new URL(sourceUrl);
      const eventbriteId = extractEventbriteId(url.toString());
      if (eventbriteId) return `eventbrite:${eventbriteId}`;
      url.hash = "";
      url.search = "";
      return `url:${url.toString().replace(/\/$/, "")}`;
    } catch {
      // Fall back to title/date/venue below for non-canonical source values.
    }
  }

  const date = String(card.event.startAt ?? "").slice(0, 10);
  const venue = card.venue?.name ?? card.event.venueId ?? "";
  return `event:${card.event.title.toLowerCase()}:${date}:${String(venue).toLowerCase()}`;
}

function extractEventbriteId(sourceUrl) {
  if (!sourceUrl) return "";
  const value = String(sourceUrl);
  return value.match(/(?:tickets|registration|billets)-(\d+)(?:[/?#]|$)/)?.[1] ?? value.match(/-(\d{8,})(?:[/?#]|$)/)?.[1] ?? value.match(/[?&]eid=(\d+)/)?.[1] ?? "";
}

function eventCardCompletenessScore(card) {
  return [
    card.saved ? "saved" : "",
    card.event.description,
    card.event.imageUrl,
    card.venue?.name,
    card.event.endAt,
    card.event.priceMinCents != null || card.event.priceMaxCents != null ? "price" : "",
    card.event.sourceProvider === "eventbrite" ? "official" : "",
  ].filter(Boolean).length;
}

function deriveProfileInsights(profile) {
  const sourceText = `${profile.bio ?? ""} ${profile.resumeText ?? ""} ${profile.networkingIntent ?? ""}`.toLowerCase();
  const keywords = ["ai", "frontend", "backend", "product", "design", "data", "founder", "community", "growth", "sales"];
  const inferredThemes = keywords.filter((keyword) => sourceText.includes(keyword)).slice(0, 5);

  return {
    inferredThemes,
    hasResumeContext: Boolean(profile.resumeText?.trim()),
    profileCompletenessScore: [
      profile.primaryGoals.length > 0,
      profile.targetRoles.length > 0,
      profile.skills.length > 0,
      Boolean(profile.networkingIntent?.trim()),
      Boolean(profile.bio?.trim()),
      Boolean(profile.resumeText?.trim()),
    ].filter(Boolean).length,
  };
}

/**
 * Hydrates a raw event list into scored, deduped, sorted cards. Extracted so a
 * single event can be turned into a card directly (see getEventDetail) without
 * having to survive the dedupe of a larger, differently-filtered pool.
 */
function buildCardsFromEvents(userId, events, sort = "recommended") {
  const preferences = findPreferencesByUserId(userId);
  const profile = ensureProfile(userId);
  const feedback = listFeedbackForUser(userId);
  const savedIds = new Set(listSavedEventIds(userId));
  const neighborhoodMap = mapById(listNeighborhoods());
  const venueMap = mapById(listVenuesByIds([...new Set(events.map((item) => item.venueId).filter(Boolean))]));

  const cards = dedupeEventCards(events.map((event) => {
    const neighborhood = neighborhoodMap.get(event.neighborhoodId) ?? null;
    const baseRecommendation = scoreEvent({
      event,
      preferences,
      neighborhoodSlug: neighborhood?.slug ?? null,
      feedback,
    });
    return {
      event,
      venue: venueMap.get(event.venueId) ?? null,
      neighborhood,
      saved: savedIds.has(event.id),
      recommendation: applyProfileGoalBoost(baseRecommendation, event, profile),
    };
  }));

  cards.sort((a, b) => {
    if (sort === "soonest") return new Date(a.event.startAt) - new Date(b.event.startAt);
    if (sort === "popular") return b.event.popularityScore - a.event.popularityScore;
    if (sort === "price_low_to_high") return (a.event.priceMinCents ?? 0) - (b.event.priceMinCents ?? 0);
    return b.recommendation.score - a.recommendation.score;
  });

  return cards;
}

function buildEventCards({ userId, filters = {}, sort = "recommended" }) {
  const neighborhoods = listNeighborhoods();
  const filteredNeighborhoodIds =
    filters.neighborhoodSlugs?.length
      ? neighborhoods.filter((item) => filters.neighborhoodSlugs.includes(item.slug)).map((item) => item.id)
      : [];
  const eventFilters = {
    date: filters.date,
    startDate: filters.startDate,
    endDate: filters.endDate,
    q: filters.q,
    categories: filters.categories,
    neighborhoodIds: filteredNeighborhoodIds,
  };
  const liveEvents = listEvents({
    ...eventFilters,
    excludeSourceProviders: ["seed"],
  });
  const events = liveEvents.length ? liveEvents : listEvents(eventFilters);
  return buildCardsFromEvents(userId, events, sort);
}

export function getBootstrap(user) {
  const profile = ensureProfile(user.id);
  const cards = buildEventCards({ userId: user.id, sort: "recommended" });
  return {
    user,
    profile,
    profileInsights: deriveProfileInsights(profile),
    preferences: findPreferencesByUserId(user.id),
    neighborhoods: listNeighborhoods(),
    recommendations: cards.slice(0, 8),
    recommendationLanes: getRecommendationLanes(user.id),
    saved: cards.filter((card) => card.saved),
    plans: listPlansForUser(user.id),
  };
}

export function getRecommendations(userId, filters, sort, pagination) {
  const cards = buildEventCards({ userId, filters: isolateByGoals(userId, filters), sort });
  return paginate(cards, pagination);
}

/**
 * Restricts the discovery feed to the categories relevant to the user's primary
 * goals (job seekers see career events, etc.). Only applies when the user hasn't
 * already chosen an explicit category filter, and only when they have goals set;
 * otherwise the feed is unchanged.
 */
function isolateByGoals(userId, filters = {}) {
  if (filters.categories?.length) return filters;
  const profile = ensureProfile(userId);
  const goalCategories = allowedCategoriesForGoals(profile.primaryGoals);
  if (!goalCategories.length) return filters;
  return { ...filters, categories: goalCategories };
}

export function getRecommendationLanes(userId) {
  const laneConfigs = [
    {
      key: "for_you",
      title: "For you",
      description: "Your strongest overall matches across SF.",
      filters: {},
    },
    {
      key: "learn",
      title: "Learn",
      description: "Events that look useful for skill-building and practical learning.",
      filters: { categories: ["tech", "community", "wellness", "film"] },
    },
    {
      key: "find_job",
      title: "Find a job",
      description: "Events more likely to lead to career upside and hiring conversations.",
      filters: { categories: ["tech", "community"] },
    },
    {
      key: "build_startup",
      title: "Build a startup",
      description: "Founder, operator, and early-stage energy in one lane.",
      filters: { categories: ["tech", "community", "nightlife"] },
    },
    {
      key: "connect_in_tech",
      title: "Meet tech people",
      description: "Networking-friendly picks with strong builder overlap.",
      filters: { categories: ["tech", "community", "nightlife", "art"] },
    },
  ];

  return laneConfigs.map((lane) => ({
    ...lane,
    items: buildEventCards({ userId, filters: lane.filters, sort: "recommended" }).slice(0, 4),
  }));
}

export function getEventDetail(userId, eventId) {
  // Resolve the event directly by id. The recommendation pool is deduped and
  // built from a different (unfiltered) query than Discover, so the exact id a
  // card linked to may have lost a dedupe tie there — looking it up by id makes
  // the detail page immune to that (only a genuinely missing event 404s).
  const event = findEventById(eventId);
  if (!event) return null;

  const pool = buildEventCards({ userId, sort: "recommended" });
  const detail = pool.find((item) => item.event.id === eventId) ?? buildCardsFromEvents(userId, [event])[0];

  const related = pool
    .filter(
      (item) =>
        item.event.id !== detail.event.id &&
        (item.event.category === detail.event.category || item.event.neighborhoodId === detail.event.neighborhoodId),
    )
    .slice(0, 3);
  return { data: detail, related };
}

export function updateUserPreferences(userId, input) {
  return upsertPreferences({
    userId,
    interests: input.interests,
    dislikedCategories: input.dislikedCategories ?? [],
    preferredNeighborhoodSlugs: input.preferredNeighborhoodSlugs,
    preferredDaysOfWeek: input.preferredDaysOfWeek ?? [],
    preferredDayParts: input.preferredDayParts ?? [],
    indoorPreference: input.indoorPreference ?? "mixed",
    budgetMinCents: input.budgetMinCents ?? 0,
    budgetMaxCents: input.budgetMaxCents ?? 5000,
    maxTravelMinutes: input.maxTravelMinutes ?? 30,
    groupContext: input.groupContext ?? "friends",
    updatedAt: new Date().toISOString(),
  });
}

export function getUserProfile(userId) {
  return ensureProfile(userId);
}

export function updateUserProfile(userId, input) {
  const current = ensureProfile(userId);
  const now = new Date().toISOString();
  return upsertProfile({
    userId,
    onboardingCompleted: Boolean(input.onboardingCompleted ?? true),
    primaryGoals: input.primaryGoals ?? current?.primaryGoals ?? [],
    currentStage: input.currentStage ?? current?.currentStage ?? "exploring",
    experienceLevel: input.experienceLevel ?? current?.experienceLevel ?? "intermediate",
    targetRoles: input.targetRoles ?? current?.targetRoles ?? [],
    skills: input.skills ?? current?.skills ?? [],
    networkingIntent: input.networkingIntent ?? current?.networkingIntent ?? "",
    preferredCompanyStage: input.preferredCompanyStage ?? current?.preferredCompanyStage ?? "",
    bio: input.bio ?? current?.bio ?? "",
    resumeText: input.resumeText ?? current?.resumeText ?? "",
    cityHint: input.cityHint ?? current?.cityHint ?? "San Francisco",
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  });
}

export function saveUserEvent(userId, eventId) {
  saveEvent(userId, eventId, new Date().toISOString());
  recordFeedback({ id: createId("feedback"), userId, eventId, signal: "saved", value: 1, createdAt: new Date().toISOString() });
}

export function unsaveUserEvent(userId, eventId) {
  unsaveEvent(userId, eventId);
  recordFeedback({ id: createId("feedback"), userId, eventId, signal: "unsaved", value: 1, createdAt: new Date().toISOString() });
}

export function getSavedEvents(userId) {
  return buildEventCards({ userId, filters: {}, sort: "recommended" }).filter((card) => card.saved);
}

export function submitFeedback(userId, eventId, signal, value = 1) {
  recordFeedback({ id: createId("feedback"), userId, eventId, signal, value, createdAt: new Date().toISOString() });
}

function hydratePlan(plan) {
  const items = listItemsForPlan(plan.id);
  const events = items.map((item) => findEventById(item.eventId)).filter(Boolean);
  const eventMap = mapById(events);
  const neighborhoods = mapById(listNeighborhoods());
  const venues = mapById(listVenuesByIds([...new Set(events.map((item) => item.venueId).filter(Boolean))]));
  const hydratedItems = items
    .map((item) => ({
      item,
      event: eventMap.get(item.eventId),
      venue: venues.get(eventMap.get(item.eventId)?.venueId) ?? null,
      neighborhood: neighborhoods.get(eventMap.get(item.eventId)?.neighborhoodId) ?? null,
    }))
    .filter((entry) => entry.event);
  return {
    plan,
    items: hydratedItems,
    warnings: validatePlan(hydratedItems),
  };
}

export function listUserPlans(userId) {
  return listPlansForUser(userId).map(hydratePlan);
}

export function createUserPlan(userId, input) {
  const now = new Date().toISOString();
  const plan = {
    id: createId("plan"),
    userId,
    citySlug: "san-francisco",
    planDate: input.planDate,
    title: input.title,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  createPlan(plan);
  return plan;
}

export function patchUserPlan(userId, planId, patch) {
  const plan = findPlanById(planId);
  if (!plan || plan.userId !== userId) return null;
  return updatePlan(planId, {
    title: patch.title ?? plan.title,
    notes: patch.notes ?? plan.notes,
    updatedAt: new Date().toISOString(),
  });
}

export function addPlanItem(userId, planId, input) {
  const plan = findPlanById(planId);
  if (!plan || plan.userId !== userId) return null;
  const items = listItemsForPlan(planId);
  if (items.some((item) => item.eventId === input.eventId)) return hydratePlan(plan);
  createPlanItem({
    id: createId("item"),
    planId,
    eventId: input.eventId,
    sortOrder: input.sortOrder ?? items.length + 1,
    startAtOverride: input.startAtOverride ?? null,
    endAtOverride: input.endAtOverride ?? null,
    notes: input.notes ?? null,
  });
  return hydratePlan(findPlanById(planId));
}

export function removePlanItem(userId, planId, itemId) {
  const plan = findPlanById(planId);
  if (!plan || plan.userId !== userId) return null;
  deletePlanItem(planId, itemId);
  const reorderedIds = listItemsForPlan(planId).map((item) => item.id);
  reorderPlanItems(planId, reorderedIds);
  return hydratePlan(findPlanById(planId));
}

export function reorderUserPlanItems(userId, planId, itemIdsInOrder) {
  const plan = findPlanById(planId);
  if (!plan || plan.userId !== userId) return null;
  reorderPlanItems(planId, itemIdsInOrder);
  return hydratePlan(findPlanById(planId));
}

export function validateUserPlan(userId, planId) {
  const plan = findPlanById(planId);
  if (!plan || plan.userId !== userId) return null;
  return hydratePlan(plan);
}
