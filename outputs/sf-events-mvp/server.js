import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./src/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function serveStatic(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const absolutePath = path.normalize(path.join(publicDir, safePath));

  if (!absolutePath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await readFile(absolutePath);
    const extension = path.extname(absolutePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(request, response, url);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, {
      error: "Internal server error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

const port = Number(process.env.PORT ?? 4173);

server.listen(port, () => {
  console.log(`SF Events MVP running at http://localhost:${port}`);
});
