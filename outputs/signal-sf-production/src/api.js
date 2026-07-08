import { getConfig } from "./config.js";
import { EVENT_CATEGORIES } from "./domain/constants.js";
import { parseJsonBody, sendJson } from "./lib/http.js";
import { getAuthenticatedUser, issueSession, loginUser, logout, registerUser } from "./services/auth.js";
import {
  addPlanItem,
  createUserPlan,
  getBootstrap,
  getEventDetail,
  getRecommendations,
  getUserProfile,
  listUserPlans,
  patchUserPlan,
  removePlanItem,
  reorderUserPlanItems,
  saveUserEvent,
  submitFeedback,
  unsaveUserEvent,
  updateUserProfile,
  updateUserPreferences,
  validateUserPlan,
} from "./services/app.js";
import { ingestSourceRecords } from "./services/ingestion.js";
import { fetchSourceEvents, listSourceProviders } from "./services/sourceIntegrations.js";
import { listNeighborhoods } from "./repositories/events.js";
import { findPreferencesByUserId } from "./repositories/preferences.js";

function requireUser(context) {
  const user = getAuthenticatedUser(context.config, context.request);
  if (!user) {
    sendJson(context.response, 401, { error: "Authentication required" });
    return null;
  }
  return user;
}

function parseList(searchParams, key) {
  return searchParams.getAll(key).filter(Boolean);
}

function withSessionCookie(response, payload, cookie) {
  sendJson(response, 200, payload, { "Set-Cookie": cookie });
}

export async function handleApiRequest(context) {
  const { request, response, url, config } = context;

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { data: { ok: true, service: "signal-sf-production" } });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await parseJsonBody(request);
    try {
      const user = registerUser(body);
      const cookie = issueSession({ userId: user.id, config });
      withSessionCookie(response, { data: user }, cookie);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await parseJsonBody(request);
    try {
      const user = loginUser(body);
      const cookie = issueSession({ userId: user.id, config });
      withSessionCookie(response, { data: user }, cookie);
    } catch (error) {
      sendJson(response, 401, { error: error.message });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const cookie = logout(config, request);
    sendJson(response, 200, { data: { ok: true } }, { "Set-Cookie": cookie });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = getAuthenticatedUser(config, request);
    if (!user) {
      sendJson(response, 200, { data: { authenticated: false } });
      return;
    }
    sendJson(response, 200, { data: { authenticated: true, user } });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/ingest") {
    const authenticatedUser = getAuthenticatedUser(config, request);
    const token = request.headers["x-admin-token"];
    if (authenticatedUser?.role !== "admin" && token !== config.adminIngestToken) {
      sendJson(response, 403, { error: "Admin privileges required" });
      return;
    }
    const body = await parseJsonBody(request);
    const imported = ingestSourceRecords(body.records ?? []);
    sendJson(response, 201, { data: { importedCount: imported.length } });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/source-providers") {
    const authenticatedUser = getAuthenticatedUser(config, request);
    const token = request.headers["x-admin-token"];
    if (authenticatedUser?.role !== "admin" && token !== config.adminIngestToken) {
      sendJson(response, 403, { error: "Admin privileges required" });
      return;
    }
    sendJson(response, 200, { data: listSourceProviders(config) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/sync-sources") {
    const authenticatedUser = getAuthenticatedUser(config, request);
    const token = request.headers["x-admin-token"];
    if (authenticatedUser?.role !== "admin" && token !== config.adminIngestToken) {
      sendJson(response, 403, { error: "Admin privileges required" });
      return;
    }
    const body = await parseJsonBody(request);
    const sourceEvents = await fetchSourceEvents({
      config,
      providers: Array.isArray(body.providers) ? body.providers : [],
    });
    const imported = body.dryRun ? [] : ingestSourceRecords(sourceEvents.records);
    sendJson(response, body.dryRun ? 200 : 201, {
      data: {
        dryRun: Boolean(body.dryRun),
        fetchedCount: sourceEvents.records.length,
        importedCount: imported.length,
        providers: sourceEvents.results,
      },
    });
    return;
  }

  const user = requireUser(context);
  if (!user) return;

  if (request.method === "GET" && url.pathname === "/api/bootstrap") {
    sendJson(response, 200, {
      data: {
        ...getBootstrap(user),
        categories: EVENT_CATEGORIES,
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/preferences") {
    sendJson(response, 200, { data: findPreferencesByUserId(user.id) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/profile") {
    sendJson(response, 200, { data: getUserProfile(user.id) });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/me/profile") {
    const body = await parseJsonBody(request);
    if (!Array.isArray(body.primaryGoals)) {
      sendJson(response, 400, { error: "Invalid profile payload" });
      return;
    }
    sendJson(response, 200, { data: updateUserProfile(user.id, body) });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/me/preferences") {
    const body = await parseJsonBody(request);
    if (!Array.isArray(body.interests) || !Array.isArray(body.preferredNeighborhoodSlugs)) {
      sendJson(response, 400, { error: "Invalid preferences payload" });
      return;
    }
    sendJson(response, 200, { data: updateUserPreferences(user.id, body) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    sendJson(response, 200, {
      data: getRecommendations(
        user.id,
        {
          date: url.searchParams.get("date") ?? "",
          q: url.searchParams.get("q") ?? "",
          categories: parseList(url.searchParams, "categories"),
          neighborhoodSlugs: parseList(url.searchParams, "neighborhoods"),
        },
        url.searchParams.get("sort") ?? "recommended",
      ),
    });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/events/")) {
    const detail = getEventDetail(user.id, url.pathname.split("/").pop());
    if (!detail) {
      sendJson(response, 404, { error: "Event not found" });
      return;
    }
    sendJson(response, 200, detail);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/recommendations") {
    sendJson(response, 200, {
      data: getRecommendations(
        user.id,
        {
          date: url.searchParams.get("date") ?? "",
          q: url.searchParams.get("q") ?? "",
          categories: parseList(url.searchParams, "categories"),
          neighborhoodSlugs: parseList(url.searchParams, "neighborhoods"),
        },
        url.searchParams.get("sort") ?? "recommended",
      ),
      debug: { algorithmVersion: "prod-v1" },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/saved-events") {
    const body = await parseJsonBody(request);
    saveUserEvent(user.id, body.eventId);
    sendJson(response, 200, { data: { eventId: body.eventId, saved: true } });
    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/me/saved-events/")) {
    const eventId = url.pathname.split("/").pop();
    unsaveUserEvent(user.id, eventId);
    sendJson(response, 200, { data: { eventId, saved: false } });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/event-feedback") {
    const body = await parseJsonBody(request);
    submitFeedback(user.id, body.eventId, body.signal, body.value ?? 1);
    sendJson(response, 201, { data: { ok: true } });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/itineraries") {
    sendJson(response, 200, { data: listUserPlans(user.id) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/itineraries") {
    const body = await parseJsonBody(request);
    sendJson(response, 201, { data: createUserPlan(user.id, body) });
    return;
  }

  if (request.method === "PATCH" && /^\/api\/me\/itineraries\/[^/]+$/.test(url.pathname)) {
    const body = await parseJsonBody(request);
    const plan = patchUserPlan(user.id, url.pathname.split("/").pop(), body);
    if (!plan) {
      sendJson(response, 404, { error: "Plan not found" });
      return;
    }
    sendJson(response, 200, { data: plan });
    return;
  }

  if (request.method === "POST" && /^\/api\/me\/itineraries\/[^/]+\/items$/.test(url.pathname)) {
    const body = await parseJsonBody(request);
    const plan = addPlanItem(user.id, url.pathname.split("/")[4], body);
    if (!plan) {
      sendJson(response, 404, { error: "Plan not found" });
      return;
    }
    sendJson(response, 201, { data: plan });
    return;
  }

  if (request.method === "DELETE" && /^\/api\/me\/itineraries\/[^/]+\/items\/[^/]+$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    const plan = removePlanItem(user.id, parts[4], parts[6]);
    if (!plan) {
      sendJson(response, 404, { error: "Plan not found" });
      return;
    }
    sendJson(response, 200, { data: plan });
    return;
  }

  if (request.method === "POST" && /^\/api\/me\/itineraries\/[^/]+\/items\/reorder$/.test(url.pathname)) {
    const body = await parseJsonBody(request);
    const plan = reorderUserPlanItems(user.id, url.pathname.split("/")[4], body.itemIdsInOrder ?? []);
    if (!plan) {
      sendJson(response, 404, { error: "Plan not found" });
      return;
    }
    sendJson(response, 200, { data: plan });
    return;
  }

  if (request.method === "GET" && /^\/api\/me\/itineraries\/[^/]+\/validate$/.test(url.pathname)) {
    const plan = validateUserPlan(user.id, url.pathname.split("/")[4]);
    if (!plan) {
      sendJson(response, 404, { error: "Plan not found" });
      return;
    }
    sendJson(response, 200, { data: plan });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lookup/neighborhoods") {
    sendJson(response, 200, { data: listNeighborhoods() });
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}
