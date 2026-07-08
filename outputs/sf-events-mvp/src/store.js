import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSeedState } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const storePath = path.join(dataDir, "store.json");

let cache = null;

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  if (cache) return cache;

  try {
    const existing = await readFile(storePath, "utf8");
    cache = JSON.parse(existing);
    return cache;
  } catch {
    cache = createSeedState();
    await writeFile(storePath, JSON.stringify(cache, null, 2));
    return cache;
  }
}

export async function getState() {
  return ensureStore();
}

export async function updateState(mutator) {
  const state = await ensureStore();
  const nextState = await mutator(structuredClone(state));
  cache = nextState;
  await writeFile(storePath, JSON.stringify(nextState, null, 2));
  return nextState;
}
