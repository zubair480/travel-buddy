import { clamp, getDayPart } from "./utils.js";

export function normalizePriceTier(event) {
  if (event.priceMinCents == null || event.priceMinCents === 0) return "free";
  if (event.priceMinCents <= 2000) return "low";
  if (event.priceMinCents <= 5000) return "medium";
  if (event.priceMinCents <= 9000) return "high";
  return "luxury";
}

function scoreFeedback(eventId, feedback) {
  return feedback
    .filter((item) => item.eventId === eventId)
    .reduce((sum, item) => {
      if (item.signal === "not_interested" || item.signal === "dismissed") return sum - 2;
      if (item.signal === "saved" || item.signal === "interested" || item.signal === "attended") return sum + 0.75;
      return sum;
    }, 0);
}

function matchesIndoorPreference(event, preference) {
  if (preference === "mixed") return 0;
  if (preference === "indoor") return event.isIndoor ? 0.75 : -0.5;
  if (preference === "outdoor") return event.isOutdoor ? 0.75 : -0.5;
  return 0;
}

function budgetFit(event, preferences) {
  if (preferences.budgetMaxCents == null || event.priceMinCents == null) return 0;
  if (event.priceMinCents <= preferences.budgetMaxCents) return 1;
  const overage = event.priceMinCents - preferences.budgetMaxCents;
  return clamp(1 - overage / preferences.budgetMaxCents, -1, 1);
}

export function scoreEvent({ event, preferences, feedback, neighborhoodSlug, selectedCategories = [] }) {
  const eventDate = new Date(event.startAt);
  const eventDay = eventDate.getDay();
  const eventDayPart = getDayPart(event.startAt);
  const matchedInterests = preferences.interests.filter((interest) => interest === event.category);
  const matchedTags = event.tags.filter((tag) =>
    preferences.interests.some((interest) => tag.toLowerCase().includes(interest)),
  );

  const categoryScore = matchedInterests.length > 0 ? 3 : preferences.dislikedCategories.includes(event.category) ? -1.5 : 0;
  const tagScore = Math.min(3, matchedTags.length) * 0.75;
  const neighborhoodScore =
    neighborhoodSlug && preferences.preferredNeighborhoodSlugs.includes(neighborhoodSlug) ? 1.5 : 0;
  const dayPartScore = preferences.preferredDayParts.includes(eventDayPart) ? 1 : 0;
  const dayScore = preferences.preferredDaysOfWeek.includes(eventDay) ? 0.75 : 0;
  const budgetScore = budgetFit(event, preferences) * 1.5;
  const popularityScore = Math.min(event.popularityScore, 100) / 100;
  const qualityScore = Math.min(event.qualityScore, 100) / 100;
  const indoorScore = matchesIndoorPreference(event, preferences.indoorPreference);
  const diversityPenalty = selectedCategories.includes(event.category) ? -0.75 : 0;
  const feedbackScore = scoreFeedback(event.id, feedback);

  const total =
    categoryScore +
    tagScore +
    neighborhoodScore +
    dayPartScore +
    dayScore +
    budgetScore +
    popularityScore +
    qualityScore +
    indoorScore +
    diversityPenalty +
    feedbackScore;

  const reasons = [];
  if (matchedInterests.length > 0) reasons.push(`Matches your interest in ${matchedInterests.join(", ")}`);
  if (matchedTags.length > 0) reasons.push(`Shares tags you like: ${matchedTags.slice(0, 2).join(", ")}`);
  if (neighborhoodScore > 0) reasons.push("In a neighborhood you prefer");
  if (dayPartScore > 0 || dayScore > 0) reasons.push("Fits your preferred days and timing");
  if (budgetScore > 0.5) reasons.push("Fits your budget");
  if (popularityScore > 0.75) reasons.push("Trending with other locals");

  return {
    score: Number(total.toFixed(3)),
    reasons,
    matchedInterests,
    matchedTags,
  };
}

export function buildEventCard({ event, state, userId, selectedCategories = [] }) {
  const preferences = state.preferences[userId];
  const venue = state.venues.find((item) => item.id === event.venueId) ?? null;
  const neighborhood = state.neighborhoods.find((item) => item.id === event.neighborhoodId) ?? null;
  const recommendation = scoreEvent({
    event,
    preferences,
    feedback: state.feedback.filter((item) => item.userId === userId),
    neighborhoodSlug: neighborhood?.slug ?? null,
    selectedCategories,
  });
  const saved = state.savedEvents.some((item) => item.userId === userId && item.eventId === event.id);

  return {
    event: { ...event, priceTier: normalizePriceTier(event) },
    venue,
    neighborhood,
    saved,
    recommendation,
  };
}

export function sortEvents(events, sort) {
  const clones = [...events];

  switch (sort) {
    case "soonest":
      return clones.sort((a, b) => new Date(a.event.startAt) - new Date(b.event.startAt));
    case "popular":
      return clones.sort((a, b) => b.event.popularityScore - a.event.popularityScore);
    case "price_low_to_high":
      return clones.sort((a, b) => (a.event.priceMinCents ?? 0) - (b.event.priceMinCents ?? 0));
    case "recommended":
    default:
      return clones.sort((a, b) => b.recommendation.score - a.recommendation.score);
  }
}
