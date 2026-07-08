import { getDb } from "../db/client.js";

export function listSavedEventIds(userId) {
  return getDb()
    .prepare(`SELECT event_id FROM saved_events WHERE user_id = ?`)
    .all(userId)
    .map((row) => row.event_id);
}

export function saveEvent(userId, eventId, savedAt) {
  getDb()
    .prepare(`INSERT OR IGNORE INTO saved_events (user_id, event_id, saved_at) VALUES (?, ?, ?)`)
    .run(userId, eventId, savedAt);
}

export function unsaveEvent(userId, eventId) {
  getDb().prepare(`DELETE FROM saved_events WHERE user_id = ? AND event_id = ?`).run(userId, eventId);
}
