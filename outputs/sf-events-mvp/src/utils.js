import { randomUUID } from "node:crypto";

export function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        if (chunks.length === 0) {
          resolve({});
          return;
        }

        const text = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

export function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

export function unique(values) {
  return Array.from(new Set(values));
}

export function getDayPart(startAtIso) {
  const hour = new Date(startAtIso).getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "late_night";
}

export function formatDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
