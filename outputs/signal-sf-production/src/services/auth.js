import { createSessionCookie, clearSessionCookie, parseCookies } from "../lib/http.js";
import { createId, createSessionToken, hashPassword, verifyPassword } from "../lib/security.js";
import { createUser, findUserByEmail, findUserById, findUserWithPasswordByEmail } from "../repositories/users.js";
import { createSession, deleteExpiredSessions, deleteSession, findSession } from "../repositories/sessions.js";
import { upsertPreferences } from "../repositories/preferences.js";
import { upsertProfile } from "../repositories/profiles.js";

function buildDefaultPreferences(userId) {
  return {
    userId,
    interests: ["music", "food"],
    dislikedCategories: [],
    preferredNeighborhoodSlugs: ["mission", "soma"],
    preferredDaysOfWeek: [5, 6],
    preferredDayParts: ["afternoon", "evening"],
    indoorPreference: "mixed",
    budgetMinCents: 0,
    budgetMaxCents: 5000,
    maxTravelMinutes: 30,
    groupContext: "friends",
    updatedAt: new Date().toISOString(),
  };
}

function buildDefaultProfile(userId) {
  const now = new Date().toISOString();
  return {
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
  };
}

export function registerUser({ email, password, displayName }) {
  if (findUserByEmail(email)) {
    throw new Error("An account already exists for that email.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const now = new Date().toISOString();
  const user = createUser({
    id: createId("user"),
    email,
    passwordHash: hashPassword(password),
    displayName,
    role: "user",
    homeCitySlug: "san-francisco",
    createdAt: now,
    updatedAt: now,
  });
  upsertPreferences(buildDefaultPreferences(user.id));
  upsertProfile(buildDefaultProfile(user.id));
  return user;
}

export function ensureUserProfile(userId) {
  return upsertProfile(buildDefaultProfile(userId));
}

export function loginUser({ email, password }) {
  const row = findUserWithPasswordByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error("Invalid email or password.");
  }
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    homeCitySlug: row.home_city_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function issueSession({ userId, config }) {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  const token = createSessionToken();
  createSession({
    token,
    userId,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  return createSessionCookie({
    name: config.cookieName,
    value: token,
    maxAgeSeconds: config.sessionTtlDays * 24 * 60 * 60,
  });
}

export function logout(config, request) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[config.cookieName];
  if (token) deleteSession(token);
  return clearSessionCookie(config.cookieName);
}

export function getAuthenticatedUser(config, request) {
  deleteExpiredSessions(new Date().toISOString());
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[config.cookieName];
  if (!token) return null;
  const session = findSession(token);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    deleteSession(token);
    return null;
  }
  return findUserById(session.user_id);
}
