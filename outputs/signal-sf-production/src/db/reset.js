import { rmSync } from "node:fs";
import { getConfig } from "../config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = getConfig(path.join(__dirname, "..", ".."));

rmSync(config.databasePath, { force: true });
console.log(`Removed ${config.databasePath}`);
