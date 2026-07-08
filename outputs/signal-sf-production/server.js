import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./src/api.js";
import { getConfig } from "./src/config.js";
import { initializeDatabase } from "./src/db/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const config = getConfig(__dirname);

await initializeDatabase(config);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function serveStatic(pathname, response) {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const absolutePath = path.normalize(path.join(publicDir, relativePath));

  if (!absolutePath.startsWith(publicDir)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const file = await readFile(absolutePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(absolutePath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(file);
  } catch {
    response.writeHead(404).end("Not found");
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest({ request, response, url, config });
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Internal server error", detail: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(config.port, () => {
  console.log(`Signal SF production app running at http://localhost:${config.port}`);
});
