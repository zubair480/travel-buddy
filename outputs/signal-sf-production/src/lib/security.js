import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  const attempted = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return attempted.length === expected.length && timingSafeEqual(attempted, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}
