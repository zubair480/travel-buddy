import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { schemaSql } from "./schema.js";
import { seedDatabaseIfEmpty } from "./seed.js";

let db;

export function initializeDatabase(config) {
  if (db) return db;
  mkdirSync(path.dirname(config.databasePath), { recursive: true });
  db = new DatabaseSync(config.databasePath);
  db.exec(schemaSql);
  seedDatabaseIfEmpty(db);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}
