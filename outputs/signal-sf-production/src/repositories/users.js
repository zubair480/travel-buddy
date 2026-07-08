import { getDb } from "../db/client.js";

function mapUser(row) {
  return row
    ? {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
        homeCitySlug: row.home_city_slug,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export function findUserByEmail(email) {
  const row = getDb().prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
  return mapUser(row);
}

export function findUserWithPasswordByEmail(email) {
  return getDb().prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase()) ?? null;
}

export function findUserById(id) {
  return mapUser(getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id));
}

export function createUser(user) {
  getDb()
    .prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, home_city_slug, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(user.id, user.email.toLowerCase(), user.passwordHash, user.displayName, user.role, user.homeCitySlug, user.createdAt, user.updatedAt);
  return findUserById(user.id);
}
