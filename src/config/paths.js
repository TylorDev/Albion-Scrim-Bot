import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

export const projectRoot = path.resolve(currentDir, "..", "..");
export const dataDir = path.join(projectRoot, "data");
export const settingsFile = path.join(dataDir, "settings.json");

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, JSON.stringify({}, null, 2));
}
