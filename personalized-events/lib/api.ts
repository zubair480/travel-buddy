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

function normalizePath(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("/")) return `/api${path}`;
  return `/api/${path}`;
}

function buildRequestBody(body: unknown) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof FormData) return body;
  if (body instanceof URLSearchParams) return body;
  if (body instanceof Blob) return body;
  return JSON.stringify(body);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const body = buildRequestBody(options.body);

  if (body && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(normalizePath(path), {
    ...options,
    credentials: "include",
    headers,
    body,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function unwrap<T>(payload: ApiEnvelope<T>) {
  return payload.data;
}

function buildEventQuery(filters: EventFilters) {
  const params = new URLSearchParams();

  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.date) params.set("date", filters.date);
  if (filters.category !== "any") params.append("categories", filters.category);
  if (filters.neighborhood !== "any") params.append("neighborhoods", filters.neighborhood);

  if (filters.sort === "soonest") params.set("sort", "soonest");
  else if (filters.sort === "popular") params.set("sort", "popular");
  else if (filters.sort === "price-low") params.set("sort", "price_low_to_high");
  else params.set("sort", "recommended");

  return params.toString();
}

type ApiCallable = {
  <T>(path: string, options?: RequestOptions): Promise<T>;
  me: () => Promise<AuthState>;
  login: (input: { email: string; password: string }) => Promise<BackendUser>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<BackendUser>;
  logout: () => Promise<{ ok: true }>;
  bootstrap: () => Promise<BootstrapPayload>;
  profile: () => Promise<BackendProfile>;
  updateProfile: (profile: UserProfile) => Promise<BackendProfile>;
  preferences: () => Promise<BackendPreferences>;
  updatePreferences: (preferences: UserPreferences) => Promise<BackendPreferences>;
  recommendations: (filters: EventFilters) => Promise<BackendEventCard[]>;
  eventDetail: (id: string) => Promise<ApiEnvelope<BackendEventCard> & { related?: BackendEventCard[] }>;
  savedEvents: () => Promise<BackendEventCard[]>;
  saveEvent: (eventId: string) => Promise<{ eventId: string; saved: true }>;
  unsaveEvent: (eventId: string) => Promise<{ eventId: string; saved: false }>;
  plans: () => Promise<BackendHydratedPlan[]>;
  createPlan: (input: { title: string; planDate: string; notes?: string }) => Promise<{ id: string }>;
  updatePlan: (planId: string, input: { title?: string; notes?: string }) => Promise<{ id: string }>;
  addPlanItem: (planId: string, eventId: string) => Promise<BackendHydratedPlan>;
  removePlanItem: (planId: string, itemId: string) => Promise<BackendHydratedPlan>;
  reorderPlanItems: (planId: string, itemIdsInOrder: string[]) => Promise<BackendHydratedPlan>;
};

const callable = (<T>(path: string, options?: RequestOptions) => request<T>(path, options)) as ApiCallable;

callable.me = async () => unwrap(await request<ApiEnvelope<AuthState>>("me"));
callable.login = async (input) => unwrap(await request<ApiEnvelope<BackendUser>>("auth/login", { method: "POST", body: input }));
callable.register = async (input) => unwrap(await request<ApiEnvelope<BackendUser>>("auth/register", { method: "POST", body: input }));
callable.logout = async () => unwrap(await request<ApiEnvelope<{ ok: true }>>("auth/logout", { method: "POST" }));
callable.bootstrap = async () => unwrap(await request<ApiEnvelope<BootstrapPayload>>("bootstrap"));
callable.profile = async () => unwrap(await request<ApiEnvelope<BackendProfile>>("me/profile"));
callable.updateProfile = async (profile) => unwrap(await request<ApiEnvelope<BackendProfile>>("me/profile", { method: "PUT", body: profile }));
callable.preferences = async () => unwrap(await request<ApiEnvelope<BackendPreferences>>("me/preferences"));
callable.updatePreferences = async (preferences) =>
  unwrap(await request<ApiEnvelope<BackendPreferences>>("me/preferences", { method: "PUT", body: preferences }));
callable.recommendations = async (filters) => {
  const query = buildEventQuery(filters);
  const payload = await request<ApiEnvelope<BackendEventCard[]>>(`me/recommendations${query ? `?${query}` : ""}`);
  return payload.data;
};
callable.eventDetail = async (id) => request<ApiEnvelope<BackendEventCard> & { related?: BackendEventCard[] }>(`events/${encodeURIComponent(id)}`);
callable.savedEvents = async () => unwrap(await request<ApiEnvelope<BackendEventCard[]>>("me/saved-events"));
callable.saveEvent = async (eventId) => unwrap(await request<ApiEnvelope<{ eventId: string; saved: true }>>("me/saved-events", { method: "POST", body: { eventId } }));
callable.unsaveEvent = async (eventId) =>
  unwrap(await request<ApiEnvelope<{ eventId: string; saved: false }>>(`me/saved-events/${encodeURIComponent(eventId)}`, { method: "DELETE" }));
callable.plans = async () => unwrap(await request<ApiEnvelope<BackendHydratedPlan[]>>("me/itineraries"));
callable.createPlan = async (input) => unwrap(await request<ApiEnvelope<{ id: string }>>("me/itineraries", { method: "POST", body: input }));
callable.updatePlan = async (planId, input) =>
  unwrap(await request<ApiEnvelope<{ id: string }>>(`me/itineraries/${encodeURIComponent(planId)}`, { method: "PATCH", body: input }));
callable.addPlanItem = async (planId, eventId) =>
  unwrap(await request<ApiEnvelope<BackendHydratedPlan>>(`me/itineraries/${encodeURIComponent(planId)}/items`, { method: "POST", body: { eventId } }));
callable.removePlanItem = async (planId, itemId) =>
  unwrap(await request<ApiEnvelope<BackendHydratedPlan>>(`me/itineraries/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }));
callable.reorderPlanItems = async (planId, itemIdsInOrder) =>
  unwrap(
    await request<ApiEnvelope<BackendHydratedPlan>>(`me/itineraries/${encodeURIComponent(planId)}/items/reorder`, {
      method: "POST",
      body: { itemIdsInOrder },
    }),
  );

export const api = callable;
