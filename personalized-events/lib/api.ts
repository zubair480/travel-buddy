import type {
  ApiEnvelope,
  AuthState,
  BackendEventCard,
  BackendHydratedPlan,
  BackendPreferences,
  BackendProfile,
  BackendUser,
  BootstrapPayload,
} from "./backend-types";
import type { EventFilters, UserPreferences, UserProfile } from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function data<T>(payload: ApiEnvelope<T>) {
  return payload.data;
}

function buildEventQuery(filters: EventFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category !== "any") params.append("categories", filters.category);
  if (filters.neighborhood !== "any") params.append("neighborhoods", filters.neighborhood);
  if (filters.sort === "soonest") params.set("sort", "soonest");
  if (filters.sort === "popular") params.set("sort", "popular");
  if (filters.sort === "price-low") params.set("sort", "price_low_to_high");

  if (filters.date === "today" || filters.date === "tomorrow") {
    const date = new Date();
    if (filters.date === "tomorrow") date.setDate(date.getDate() + 1);
    params.set("date", date.toISOString().slice(0, 10));
  }

  return params.toString();
}

export const api = {
  async me() {
    return data(await request<ApiEnvelope<AuthState>>("/api/me"));
  },

  async login(input: { email: string; password: string }) {
    return data(await request<ApiEnvelope<BackendUser>>("/api/auth/login", { method: "POST", body: input }));
  },

  async register(input: { email: string; password: string; displayName: string }) {
    return data(await request<ApiEnvelope<BackendUser>>("/api/auth/register", { method: "POST", body: input }));
  },

  async logout() {
    return data(await request<ApiEnvelope<{ ok: true }>>("/api/auth/logout", { method: "POST" }));
  },

  async bootstrap() {
    return data(await request<ApiEnvelope<BootstrapPayload>>("/api/bootstrap"));
  },

  async profile() {
    return data(await request<ApiEnvelope<BackendProfile>>("/api/me/profile"));
  },

  async updateProfile(profile: UserProfile) {
    return data(await request<ApiEnvelope<BackendProfile>>("/api/me/profile", { method: "PUT", body: profile }));
  },

  async preferences() {
    return data(await request<ApiEnvelope<BackendPreferences>>("/api/me/preferences"));
  },

  async updatePreferences(preferences: UserPreferences) {
    return data(await request<ApiEnvelope<BackendPreferences>>("/api/me/preferences", { method: "PUT", body: preferences }));
  },

  async recommendations(filters: EventFilters) {
    const query = buildEventQuery(filters);
    return data(await request<ApiEnvelope<BackendEventCard[]>>(`/api/me/recommendations${query ? `?${query}` : ""}`));
  },

  async eventDetail(id: string) {
    return request<ApiEnvelope<BackendEventCard> & { related?: BackendEventCard[] }>(`/api/events/${encodeURIComponent(id)}`);
  },

  async saveEvent(eventId: string) {
    return data(await request<ApiEnvelope<{ eventId: string; saved: true }>>("/api/me/saved-events", { method: "POST", body: { eventId } }));
  },

  async unsaveEvent(eventId: string) {
    return data(await request<ApiEnvelope<{ eventId: string; saved: false }>>(`/api/me/saved-events/${encodeURIComponent(eventId)}`, { method: "DELETE" }));
  },

  async plans() {
    return data(await request<ApiEnvelope<BackendHydratedPlan[]>>("/api/me/itineraries"));
  },

  async createPlan(input: { title: string; planDate: string; notes?: string }) {
    return data(await request<ApiEnvelope<{ id: string }>>("/api/me/itineraries", { method: "POST", body: input }));
  },

  async updatePlan(planId: string, input: { title?: string; notes?: string }) {
    return data(await request<ApiEnvelope<{ id: string }>>(`/api/me/itineraries/${encodeURIComponent(planId)}`, { method: "PATCH", body: input }));
  },

  async addPlanItem(planId: string, eventId: string) {
    return data(
      await request<ApiEnvelope<BackendHydratedPlan>>(`/api/me/itineraries/${encodeURIComponent(planId)}/items`, {
        method: "POST",
        body: { eventId },
      }),
    );
  },

  async removePlanItem(planId: string, itemId: string) {
    return data(await request<ApiEnvelope<BackendHydratedPlan>>(`/api/me/itineraries/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }));
  },

  async reorderPlanItems(planId: string, itemIdsInOrder: string[]) {
    return data(
      await request<ApiEnvelope<BackendHydratedPlan>>(`/api/me/itineraries/${encodeURIComponent(planId)}/items/reorder`, {
        method: "POST",
        body: { itemIdsInOrder },
      }),
    );
  },
};
