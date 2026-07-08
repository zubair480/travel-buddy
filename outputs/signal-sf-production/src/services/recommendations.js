import { DAY_PARTS } from "../domain/constants.js";

function getDayPart(startAtIso) {
  const hour = new Date(startAtIso).getHours();
  if (hour < 12) return DAY_PARTS[0];
  if (hour < 17) return DAY_PARTS[1];
  if (hour < 22) return DAY_PARTS[2];
  return DAY_PARTS[3];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function budgetFit(event, preferences) {
  if (preferences.budgetMaxCents == null || event.priceMinCents == null) return 0;
  if (event.priceMinCents <= preferences.budgetMaxCents) return 1;
  const overage = event.priceMinCents - preferences.budgetMaxCents;
  return clamp(1 - overage / preferences.budgetMaxCents, -1, 1);
}

function feedbackScore(eventId, feedback) {
  return feedback
    .filter((item) => item.eventId === eventId)
    .reduce((sum, item) => {
      if (item.signal === "not_interested" || item.signal === "dismissed") return sum - 2;
      if (item.signal === "saved" || item.signal === "interested" || item.signal === "attended") return sum + 0.75;
      return sum;
    }, 0);
}

export function scoreEvent({ event, preferences, neighborhoodSlug, feedback, selectedCategories = [] }) {
  const matchedInterests = preferences.interests.filter((interest) => interest === event.category);
  const matchedTags = event.tags.filter((tag) =>
    preferences.interests.some((interest) => tag.toLowerCase().includes(String(interest).toLowerCase())),
  );
  const eventDate = new Date(event.startAt);
  const dayScore = preferences.preferredDaysOfWeek.includes(eventDate.getDay()) ? 0.75 : 0;
  const dayPartScore = preferences.preferredDayParts.includes(getDayPart(event.startAt)) ? 1 : 0;
  const neighborhoodScore = neighborhoodSlug && preferences.preferredNeighborhoodSlugs.includes(neighborhoodSlug) ? 1.5 : 0;
  const categoryScore = matchedInterests.length > 0 ? 3 : preferences.dislikedCategories.includes(event.category) ? -1.5 : 0;
  const tagScore = Math.min(3, matchedTags.length) * 0.75;
  const priceScore = budgetFit(event, preferences) * 1.5;
  const popularityScore = Math.min(event.popularityScore, 100) / 100;
  const qualityScore = Math.min(event.qualityScore, 100) / 100;
  const indoorScore =
    preferences.indoorPreference === "mixed"
      ? 0
      : preferences.indoorPreference === "indoor"
        ? event.isIndoor
          ? 0.75
          : -0.5
        : event.isOutdoor
          ? 0.75
          : -0.5;
  const diversityPenalty = selectedCategories.includes(event.category) ? -0.75 : 0;
  const historicalScore = feedbackScore(event.id, feedback);

  const score = Number(
    (
      categoryScore +
      tagScore +
      neighborhoodScore +
      dayScore +
      dayPartScore +
      priceScore +
      popularityScore +
      qualityScore +
      indoorScore +
      diversityPenalty +
      historicalScore
    ).toFixed(3),
  );

  const reasons = [];
  if (matchedInterests.length) reasons.push(`Matches your interest in ${matchedInterests.join(", ")}`);
  if (matchedTags.length) reasons.push(`Shares tags you like: ${matchedTags.slice(0, 2).join(", ")}`);
  if (neighborhoodScore > 0) reasons.push("In a neighborhood you prefer");
  if (dayScore > 0 || dayPartScore > 0) reasons.push("Fits your preferred days and timing");
  if (priceScore > 0.5) reasons.push("Fits your budget");
  if (popularityScore > 0.75) reasons.push("Trending with other locals");
  if (historicalScore < 0) reasons.push("Downranked because of previous dislikes");

  return {
    score,
    reasons,
    matchedInterests,
    matchedTags,
  };
}

const GOAL_CATEGORY_BOOSTS = {
  learn: ["tech", "community", "wellness", "film"],
  find_job: ["tech", "community"],
  build_startup: ["tech", "community", "nightlife"],
  socialize: ["community", "food", "music", "nightlife", "art", "outdoors"],
  connect_in_tech: ["tech", "community", "nightlife"],
  hire_people: ["tech", "community"],
  find_cofounder: ["tech", "community", "art"],
};

export function applyProfileGoalBoost(baseRecommendation, event, profile) {
  if (!profile || !profile.primaryGoals?.length) return baseRecommendation;
  const goalBoost = profile.primaryGoals.reduce((sum, goal) => {
    const boostedCategories = GOAL_CATEGORY_BOOSTS[goal] ?? [];
    return boostedCategories.includes(event.category) ? sum + 0.6 : sum;
  }, 0);

  const roleBoost =
    profile.targetRoles?.some((role) => {
      const text = `${event.title} ${event.description ?? ""} ${event.tags.join(" ")}`.toLowerCase();
      return text.includes(String(role).toLowerCase());
    }) ? 0.4 : 0;

  const skillBoost =
    profile.skills?.some((skill) => event.tags.some((tag) => tag.includes(String(skill).toLowerCase()))) ? 0.3 : 0;

  const boostedScore = Number((baseRecommendation.score + goalBoost + roleBoost + skillBoost).toFixed(3));
  const reasons = [...baseRecommendation.reasons];
  if (goalBoost > 0) reasons.push("Aligned with your current goals");
  if (roleBoost > 0) reasons.push("Relevant to roles you care about");
  if (skillBoost > 0) reasons.push("Connects to your listed skills");

  return {
    ...baseRecommendation,
    score: boostedScore,
    reasons: Array.from(new Set(reasons)),
  };
}
