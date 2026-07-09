import { readFile, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeDatabase } from "../src/db/client.js";
import { getConfig } from "../src/config.js";
import { handleApiRequest } from "../src/api.js";
import { syncConfiguredSourcesAtStartup } from "../src/services/bootstrapSync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

process.env.DATABASE_PATH = process.env.DATABASE_PATH || "/tmp/signal-sf.db";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const config = getConfig(rootDir);
  await initializeDatabase(config);
  syncConfiguredSourcesAtStartup(config);
  initialized = true;
  return config;
}

const publicDir = path.join(rootDir, "public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export default async function handler(req, res) {
  try {
    const config = await ensureInitialized();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest({ request: req, response: res, url, config });
      return;
    }

    const relativePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const absolutePath = path.normalize(path.join(publicDir, relativePath));

    if (!absolutePath.startsWith(publicDir)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    readFile(absolutePath, (err, file) => {
      if (err) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentTypes[path.extname(absolutePath)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(file);
    });
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internal server error", detail: error instanceof Error ? error.message : String(error) }));
  }
}
