import { getDb } from "../db/client.js";

export function listPlansForUser(userId) {
  return getDb()
    .prepare(`SELECT * FROM itinerary_plans WHERE user_id = ? ORDER BY plan_date, created_at`)
    .all(userId)
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      citySlug: row.city_slug,
      planDate: row.plan_date,
      title: row.title,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
}

export function findPlanById(planId) {
  const row = getDb().prepare(`SELECT * FROM itinerary_plans WHERE id = ?`).get(planId);
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        citySlug: row.city_slug,
        planDate: row.plan_date,
        title: row.title,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export function createPlan(plan) {
  getDb()
    .prepare(`
      INSERT INTO itinerary_plans (id, user_id, city_slug, plan_date, title, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(plan.id, plan.userId, plan.citySlug, plan.planDate, plan.title, plan.notes, plan.createdAt, plan.updatedAt);
}

export function updatePlan(planId, patch) {
  getDb()
    .prepare(`UPDATE itinerary_plans SET title = ?, notes = ?, updated_at = ? WHERE id = ?`)
    .run(patch.title, patch.notes, patch.updatedAt, planId);
  return findPlanById(planId);
}

export function listItemsForPlan(planId) {
  return getDb()
    .prepare(`SELECT * FROM itinerary_items WHERE plan_id = ? ORDER BY sort_order`)
    .all(planId)
    .map((row) => ({
      id: row.id,
      planId: row.plan_id,
      eventId: row.event_id,
      sortOrder: row.sort_order,
      startAtOverride: row.start_at_override,
      endAtOverride: row.end_at_override,
      notes: row.notes,
    }));
}

export function createPlanItem(item) {
  getDb()
    .prepare(`
      INSERT INTO itinerary_items (id, plan_id, event_id, sort_order, start_at_override, end_at_override, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(item.id, item.planId, item.eventId, item.sortOrder, item.startAtOverride, item.endAtOverride, item.notes);
}

export function deletePlanItem(planId, itemId) {
  getDb().prepare(`DELETE FROM itinerary_items WHERE plan_id = ? AND id = ?`).run(planId, itemId);
}

export function reorderPlanItems(planId, itemIdsInOrder) {
  const db = getDb();
  const stmt = db.prepare(`UPDATE itinerary_items SET sort_order = ? WHERE plan_id = ? AND id = ?`);
  // Two passes inside a transaction: the UNIQUE(plan_id, sort_order) index means a
  // single-pass rewrite collides whenever the new order shares a slot with an
  // as-yet-unmoved row (e.g. swapping two items). First park every row at a
  // negative slot (which can never clash with the positive slots), then assign
  // the final 1-based order.
  db.exec("BEGIN");
  try {
    itemIdsInOrder.forEach((itemId, index) => stmt.run(-(index + 1), planId, itemId));
    itemIdsInOrder.forEach((itemId, index) => stmt.run(index + 1, planId, itemId));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
