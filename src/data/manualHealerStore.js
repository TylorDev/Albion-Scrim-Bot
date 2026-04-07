import fs from "node:fs";
import path from "node:path";

const DATA_DIRECTORY = path.resolve(process.cwd(), "data");
const STORE_PATH = path.resolve(DATA_DIRECTORY, "manual-healers.json");
const MAX_MANUAL_HEALERS = 2;

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

export function getManualHealerUserIds() {
  return readStore();
}

export function isManualHealerUser(userId) {
  return readStore().includes(userId);
}

export function addManualHealerUser(userId) {
  const current = readStore();

  if (current.includes(userId)) {
    return {
      status: "already_manual_healer",
      userIds: current
    };
  }

  if (current.length >= MAX_MANUAL_HEALERS) {
    return {
      status: "manual_healer_full",
      userIds: current
    };
  }

  const next = [...current, userId];
  writeStore(next);

  return {
    status: "manual_healer_added",
    userIds: next
  };
}

export function removeManualHealerUser(userId) {
  const current = readStore();
  const next = current.filter((item) => item !== userId);
  writeStore(next);

  return {
    status: current.length === next.length ? "not_found" : "manual_healer_removed",
    userIds: next
  };
}

export function clearManualHealers() {
  writeStore([]);
}

export function getMaxManualHealers() {
  return MAX_MANUAL_HEALERS;
}
