import { getDb } from "../db/client.js";

export function createSession({ token, userId, expiresAt, createdAt }) {
  getDb().prepare(`INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(token, userId, expiresAt, createdAt);
}

export function findSession(token) {
  return getDb()
    .prepare(`
      SELECT sessions.*, users.email, users.display_name, users.role, users.home_city_slug, users.created_at AS user_created_at, users.updated_at AS user_updated_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ?
    `)
    .get(token);
}

export function deleteSession(token) {
  getDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function deleteExpiredSessions(nowIso) {
  getDb().prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(nowIso);
}
