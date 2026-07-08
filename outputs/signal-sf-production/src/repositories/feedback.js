import { getDb } from "../db/client.js";

export function listFeedbackForUser(userId) {
  return getDb()
    .prepare(`SELECT * FROM user_event_feedback WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId)
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id,
      signal: row.signal,
      value: row.value,
      createdAt: row.created_at,
    }));
}

export function recordFeedback(feedback) {
  getDb()
    .prepare(`INSERT INTO user_event_feedback (id, user_id, event_id, signal, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(feedback.id, feedback.userId, feedback.eventId, feedback.signal, feedback.value, feedback.createdAt);
}
