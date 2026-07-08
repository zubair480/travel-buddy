import { DEMO_USER_ID, EVENT_CATEGORIES } from "./constants.js";
import { validatePlan } from "./planner.js";
import { buildEventCard, sortEvents } from "./recommendations.js";
import { getState, updateState } from "./store.js";
import { createId, parseJsonBody, sendJson } from "./utils.js";

function paginate(items, page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return {
    data,
    meta: {
      page,
      pageSize,
      total: items.length,
      hasMore: start + pageSize < items.length,
    },
  };
}

function buildBootstrap(state) {
  const userId = DEMO_USER_ID;
  const cards = state.events.map((event) => buildEventCard({ event, state, userId }));
  const recommendations = sortEvents(cards, "recommended").slice(0, 8);
  const saved = cards.filter((item) => item.saved);
  const plans = state.itineraries.filter((item) => item.userId === userId);
  const planner = plans.map((plan) => validatePlan(state, plan.id));

  return {
    user: state.users.find((item) => item.id === userId),
    preferences: state.preferences[userId],
    neighborhoods: state.neighborhoods,
    categories: EVENT_CATEGORIES,
    recommendations,
    saved,
    plans,
    planner,
  };
}

function filterEvents(state, url) {
  const userId = DEMO_USER_ID;
  const categories = url.searchParams.getAll("categories");
  const neighborhoodSlugs = url.searchParams.getAll("neighborhoods");
  const date = url.searchParams.get("date");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = url.searchParams.get("sort") ?? "recommended";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

  const filtered = state.events.filter((event) => {
    const neighborhood = state.neighborhoods.find((item) => item.id === event.neighborhoodId);

    if (categories.length > 0 && !categories.includes(event.category)) return false;
    if (neighborhoodSlugs.length > 0 && !neighborhoodSlugs.includes(neighborhood?.slug ?? "")) return false;
    if (date && !event.startAt.startsWith(date)) return false;
    if (q) {
      const haystack = `${event.title} ${event.description ?? ""} ${event.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const cards = filtered.map((event) => buildEventCard({ event, state, userId }));
  return paginate(sortEvents(cards, sort), page, pageSize);
}

function buildEventDetail(state, eventId) {
  const userId = DEMO_USER_ID;
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return null;

  const card = buildEventCard({ event, state, userId });
  const related = state.events
    .filter((item) => item.id !== eventId && (item.category === event.category || item.neighborhoodId === event.neighborhoodId))
    .map((item) => buildEventCard({ event: item, state, userId, selectedCategories: [event.category] }))
    .sort((a, b) => b.recommendation.score - a.recommendation.score)
    .slice(0, 3);

  return {
    data: card,
    related: related.map((item) => item.recommendation),
  };
}

async function handleBootstrap(response) {
  const state = await getState();
  sendJson(response, 200, { data: buildBootstrap(state) });
}

async function handlePreferencesGet(response) {
  const state = await getState();
  sendJson(response, 200, { data: state.preferences[DEMO_USER_ID] });
}

async function handlePreferencesPut(request, response) {
  const body = await parseJsonBody(request);
  if (!Array.isArray(body.interests) || !Array.isArray(body.preferredNeighborhoodSlugs)) {
    sendJson(response, 400, { error: "Invalid preference payload" });
    return;
  }

  const next = await updateState((state) => {
    state.preferences[DEMO_USER_ID] = {
      ...state.preferences[DEMO_USER_ID],
      interests: body.interests,
      dislikedCategories: body.dislikedCategories ?? [],
      preferredNeighborhoodSlugs: body.preferredNeighborhoodSlugs,
      preferredDaysOfWeek: body.preferredDaysOfWeek ?? [],
      preferredDayParts: body.preferredDayParts ?? [],
      indoorPreference: body.indoorPreference ?? "mixed",
      budgetMinCents: body.budgetMinCents ?? 0,
      budgetMaxCents: body.budgetMaxCents ?? 5000,
      maxTravelMinutes: body.maxTravelMinutes ?? 30,
      groupContext: body.groupContext ?? "friends",
      updatedAt: new Date().toISOString(),
    };
    return state;
  });

  sendJson(response, 200, { data: next.preferences[DEMO_USER_ID] });
}

async function handleSavedEventsGet(response) {
  const state = await getState();
  const saved = state.events
    .filter((event) => state.savedEvents.some((item) => item.userId === DEMO_USER_ID && item.eventId === event.id))
    .map((event) => buildEventCard({ event, state, userId: DEMO_USER_ID }));
  sendJson(response, 200, { data: saved });
}

async function handleSaveEventPost(request, response) {
  const body = await parseJsonBody(request);
  if (!body.eventId) {
    sendJson(response, 400, { error: "eventId is required" });
    return;
  }

  await updateState((state) => {
    const exists = state.savedEvents.some((item) => item.userId === DEMO_USER_ID && item.eventId === body.eventId);
    if (!exists) {
      state.savedEvents.push({ userId: DEMO_USER_ID, eventId: body.eventId, savedAt: new Date().toISOString() });
      state.feedback.push({
        id: createId("feedback"),
        userId: DEMO_USER_ID,
        eventId: body.eventId,
        signal: "saved",
        value: 1,
        createdAt: new Date().toISOString(),
      });
    }
    return state;
  });

  sendJson(response, 200, { data: { eventId: body.eventId, saved: true } });
}

async function handleSaveEventDelete(response, eventId) {
  await updateState((state) => {
    state.savedEvents = state.savedEvents.filter((item) => !(item.userId === DEMO_USER_ID && item.eventId === eventId));
    state.feedback.push({
      id: createId("feedback"),
      userId: DEMO_USER_ID,
      eventId,
      signal: "unsaved",
      value: 1,
      createdAt: new Date().toISOString(),
    });
    return state;
  });

  sendJson(response, 200, { data: { eventId, saved: false } });
}

async function handleRecommendations(response, url) {
  const state = await getState();
  const payload = filterEvents(state, url);
  sendJson(response, 200, {
    ...payload,
    debug: { algorithmVersion: "mvp-v1" },
  });
}

async function handleItinerariesGet(response) {
  const state = await getState();
  const plans = state.itineraries
    .filter((item) => item.userId === DEMO_USER_ID)
    .map((plan) => validatePlan(state, plan.id));
  sendJson(response, 200, { data: plans });
}

async function handleItineraryCreate(request, response) {
  const body = await parseJsonBody(request);
  if (!body.planDate || !body.title) {
    sendJson(response, 400, { error: "planDate and title are required" });
    return;
  }

  const planId = createId("plan");
  const next = await updateState((state) => {
    state.itineraries.push({
      id: planId,
      userId: DEMO_USER_ID,
      citySlug: "san-francisco",
      planDate: body.planDate,
      title: body.title,
      notes: body.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return state;
  });

  sendJson(response, 201, {
    data: next.itineraries.find((item) => item.id === planId),
  });
}

async function handleItineraryPatch(request, response, planId) {
  const body = await parseJsonBody(request);
  const next = await updateState((state) => {
    const plan = state.itineraries.find((item) => item.id === planId && item.userId === DEMO_USER_ID);
    if (plan) {
      if (typeof body.title === "string") plan.title = body.title;
      if ("notes" in body) plan.notes = body.notes;
      plan.updatedAt = new Date().toISOString();
    }
    return state;
  });

  const plan = next.itineraries.find((item) => item.id === planId);
  if (!plan) {
    sendJson(response, 404, { error: "Plan not found" });
    return;
  }

  sendJson(response, 200, { data: plan });
}

async function handleItineraryItemCreate(request, response, planId) {
  const body = await parseJsonBody(request);
  if (!body.eventId) {
    sendJson(response, 400, { error: "eventId is required" });
    return;
  }

  const itemId = createId("item");

  const next = await updateState((state) => {
    const currentItems = state.itineraryItems.filter((item) => item.planId === planId);
    const nextSortOrder = body.sortOrder ?? currentItems.length + 1;
    const exists = currentItems.some((item) => item.eventId === body.eventId);
    if (!exists) {
      state.itineraryItems.push({
        id: itemId,
        planId,
        eventId: body.eventId,
        sortOrder: nextSortOrder,
        startAtOverride: body.startAtOverride ?? null,
        endAtOverride: body.endAtOverride ?? null,
        travelBufferMinutesBefore: null,
        notes: body.notes ?? null,
      });
    }
    return state;
  });

  const validation = validatePlan(next, planId);
  sendJson(response, 201, { data: validation });
}

async function handleItineraryItemDelete(response, planId, itemId) {
  const next = await updateState((state) => {
    state.itineraryItems = state.itineraryItems.filter((item) => !(item.planId === planId && item.id === itemId));
    state.itineraryItems
      .filter((item) => item.planId === planId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => {
        item.sortOrder = index + 1;
      });
    return state;
  });

  sendJson(response, 200, { data: validatePlan(next, planId) });
}

async function handleItineraryReorder(request, response, planId) {
  const body = await parseJsonBody(request);
  if (!Array.isArray(body.itemIdsInOrder)) {
    sendJson(response, 400, { error: "itemIdsInOrder is required" });
    return;
  }

  const next = await updateState((state) => {
    body.itemIdsInOrder.forEach((itemId, index) => {
      const item = state.itineraryItems.find((record) => record.planId === planId && record.id === itemId);
      if (item) item.sortOrder = index + 1;
    });
    return state;
  });

  sendJson(response, 200, { data: validatePlan(next, planId) });
}

async function handlePlanValidation(response, planId) {
  const state = await getState();
  const validation = validatePlan(state, planId);
  if (!validation) {
    sendJson(response, 404, { error: "Plan not found" });
    return;
  }
  sendJson(response, 200, { data: validation });
}

async function handleFeedback(request, response) {
  const body = await parseJsonBody(request);
  if (!body.eventId || !body.signal) {
    sendJson(response, 400, { error: "eventId and signal are required" });
    return;
  }

  await updateState((state) => {
    state.feedback.push({
      id: createId("feedback"),
      userId: DEMO_USER_ID,
      eventId: body.eventId,
      signal: body.signal,
      value: body.value ?? 1,
      createdAt: new Date().toISOString(),
    });
    return state;
  });

  sendJson(response, 201, { data: { ok: true } });
}

export async function handleApiRequest(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/bootstrap") {
    await handleBootstrap(response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/preferences") {
    await handlePreferencesGet(response);
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/me/preferences") {
    await handlePreferencesPut(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    const state = await getState();
    sendJson(response, 200, filterEvents(state, url));
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/events/")) {
    const state = await getState();
    const detail = buildEventDetail(state, url.pathname.split("/").pop());
    if (!detail) {
      sendJson(response, 404, { error: "Event not found" });
      return;
    }
    sendJson(response, 200, detail);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/saved-events") {
    await handleSavedEventsGet(response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/saved-events") {
    await handleSaveEventPost(request, response);
    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/me/saved-events/")) {
    await handleSaveEventDelete(response, url.pathname.split("/").pop());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/recommendations") {
    await handleRecommendations(response, url);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/itineraries") {
    await handleItinerariesGet(response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/itineraries") {
    await handleItineraryCreate(request, response);
    return;
  }

  if (request.method === "PATCH" && /^\/api\/me\/itineraries\/[^/]+$/.test(url.pathname)) {
    await handleItineraryPatch(request, response, url.pathname.split("/").pop());
    return;
  }

  if (request.method === "POST" && /^\/api\/me\/itineraries\/[^/]+\/items$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    await handleItineraryItemCreate(request, response, parts[4]);
    return;
  }

  if (request.method === "DELETE" && /^\/api\/me\/itineraries\/[^/]+\/items\/[^/]+$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    await handleItineraryItemDelete(response, parts[4], parts[6]);
    return;
  }

  if (request.method === "POST" && /^\/api\/me\/itineraries\/[^/]+\/items\/reorder$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    await handleItineraryReorder(request, response, parts[4]);
    return;
  }

  if (request.method === "GET" && /^\/api\/me\/itineraries\/[^/]+\/validate$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    await handlePlanValidation(response, parts[4]);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/event-feedback") {
    await handleFeedback(request, response);
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}
