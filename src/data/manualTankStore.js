import fs from "node:fs";
import path from "node:path";

const DATA_DIRECTORY = path.resolve(process.cwd(), "data");
const STORE_PATH = path.resolve(DATA_DIRECTORY, "manual-tanks.json");
const MAX_MANUAL_TANKS = 2;

function ensureStoreFile() {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ userIds: [] }, null, 2), "utf8");
  }
}

function readStore() {
  ensureStoreFile();

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    return Array.isArray(parsed.userIds) ? parsed.userIds : [];
  } catch {
    return [];
  }
}

function writeStore(userIds) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify({ userIds }, null, 2), "utf8");
}

export function getManualTankUserIds() {
  return readStore();
}

export function isManualTankUser(userId) {
  return readStore().includes(userId);
}

export function addManualTankUser(userId) {
  const current = readStore();

  if (current.includes(userId)) {
    return {
      status: "already_manual_tank",
      userIds: current
    };
  }

  if (current.length >= MAX_MANUAL_TANKS) {
    return {
      status: "manual_tank_full",
      userIds: current
    };
  }

  const next = [...current, userId];
  writeStore(next);

  return {
    status: "manual_tank_added",
    userIds: next
  };
}

export function removeManualTankUser(userId) {
  const current = readStore();
  const next = current.filter((item) => item !== userId);
  writeStore(next);

  return {
    status: current.length === next.length ? "not_found" : "manual_tank_removed",
    userIds: next
  };
}

export function clearManualTanks() {
  writeStore([]);
}
