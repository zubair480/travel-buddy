import { findPreferencesByUserId, upsertPreferences } from "../repositories/preferences.js";
import { findEventById, listEvents, listNeighborhoods, listVenuesByIds } from "../repositories/events.js";
import { listSavedEventIds, saveEvent, unsaveEvent } from "../repositories/savedEvents.js";
import { listFeedbackForUser, recordFeedback } from "../repositories/feedback.js";
import { createPlan, createPlanItem, deletePlanItem, findPlanById, listItemsForPlan, listPlansForUser, reorderPlanItems, updatePlan } from "../repositories/itineraries.js";
import { createId } from "../lib/security.js";
import { applyProfileGoalBoost, scoreEvent } from "./recommendations.js";
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

function buildEventCards({ userId, filters = {}, sort = "recommended" }) {
  const preferences = findPreferencesByUserId(userId);
  const profile = ensureProfile(userId);
  const feedback = listFeedbackForUser(userId);
  const savedIds = new Set(listSavedEventIds(userId));
  const neighborhoods = listNeighborhoods();
  const neighborhoodMap = mapById(neighborhoods);
  const filteredNeighborhoodIds =
    filters.neighborhoodSlugs?.length
      ? neighborhoods.filter((item) => filters.neighborhoodSlugs.includes(item.slug)).map((item) => item.id)
      : [];
  const events = listEvents({
    date: filters.date,
    q: filters.q,
    categories: filters.categories,
    neighborhoodIds: filteredNeighborhoodIds,
  });
  const venues = listVenuesByIds([...new Set(events.map((item) => item.venueId).filter(Boolean))]);
  const venueMap = mapById(venues);

  const cards = events.map((event) => {
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
  });

  cards.sort((a, b) => {
    if (sort === "soonest") return new Date(a.event.startAt) - new Date(b.event.startAt);
    if (sort === "popular") return b.event.popularityScore - a.event.popularityScore;
    if (sort === "price_low_to_high") return (a.event.priceMinCents ?? 0) - (b.event.priceMinCents ?? 0);
    return b.recommendation.score - a.recommendation.score;
  });

  return cards;
}

export function getBootstrap(user) {
  const cards = buildEventCards({ userId: user.id, sort: "recommended" });
  return {
    user,
    profile: ensureProfile(user.id),
    preferences: findPreferencesByUserId(user.id),
    neighborhoods: listNeighborhoods(),
    recommendations: cards.slice(0, 8),
    saved: cards.filter((card) => card.saved),
    plans: listPlansForUser(user.id),
  };
}

export function getRecommendations(userId, filters, sort) {
  return buildEventCards({ userId, filters, sort });
}

export function getEventDetail(userId, eventId) {
  const cards = buildEventCards({ userId, sort: "recommended" });
  const detail = cards.find((item) => item.event.id === eventId) ?? null;
  if (!detail) return null;
  const related = cards
    .filter((item) => item.event.id !== eventId && (item.event.category === detail.event.category || item.event.neighborhoodId === detail.event.neighborhoodId))
    .slice(0, 3)
    .map((item) => item.recommendation);
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
