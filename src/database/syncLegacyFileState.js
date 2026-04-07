import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma.js";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SCRIM_SETTINGS,
  SCRIM_FAKE_PRESETS,
  SCRIM_FORMATS,
  ensureAppConfig,
  getAppConfig,
  mapRoleTypeToDb,
  updateScrimConfig,
  updateSettingsConfig
} from "../data/appConfigStore.js";

const dataDirectory = path.resolve(process.cwd(), "data");
const settingsPath = path.join(dataDirectory, "settings.json");
const scrimConfigPath = path.join(dataDirectory, "scrim-config.json");
const manualHealersPath = path.join(dataDirectory, "manual-healers.json");
const manualTanksPath = path.join(dataDirectory, "manual-tanks.json");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeStringList(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === "string"))
  );
}

function getImportedSettings() {
  const parsed = readJsonFile(settingsPath);

  return {
    allowedArenaRoleIds: normalizeStringList(parsed?.allowedArenaRoleIds),
    allowedArenaUserIds: normalizeStringList(parsed?.allowedArenaUserIds),
    publicCommands: Array.from(
      new Set([
        ...DEFAULT_SETTINGS.publicCommands,
        ...normalizeStringList(parsed?.publicCommands)
      ])
    )
  };
}

function getImportedScrimSettings() {
  const parsed = readJsonFile(scrimConfigPath);
  const format = Object.values(SCRIM_FORMATS).includes(parsed?.format)
    ? parsed.format
    : DEFAULT_SCRIM_SETTINGS.format;
  const fakePreset = Object.values(SCRIM_FAKE_PRESETS).includes(parsed?.fakePreset)
    ? parsed.fakePreset
    : DEFAULT_SCRIM_SETTINGS.fakePreset;

  return {
    format,
    maxPlayers:
      Number.isInteger(parsed?.maxPlayers) && parsed.maxPlayers > 0
        ? parsed.maxPlayers
        : DEFAULT_SCRIM_SETTINGS.maxPlayers,
    fakePreset,
    allowAuxHealerSignup:
      typeof parsed?.allowAuxHealerSignup === "boolean"
        ? parsed.allowAuxHealerSignup
        : DEFAULT_SCRIM_SETTINGS.allowAuxHealerSignup,
    allowAuxTankSignup:
      typeof parsed?.allowAuxTankSignup === "boolean"
        ? parsed.allowAuxTankSignup
        : DEFAULT_SCRIM_SETTINGS.allowAuxTankSignup
  };
}

async function importManualRegistrations(filePath, roleType) {
  const parsed = readJsonFile(filePath);
  const userIds = normalizeStringList(parsed?.userIds);

  if (userIds.length === 0) {
    return;
  }

  await prisma.manualRegistration.createMany({
    data: userIds.map((userId) => ({
      userId,
      role: mapRoleTypeToDb(roleType)
    })),
    skipDuplicates: true
  });
}

export async function syncLegacyFileState() {
  await ensureAppConfig();

  const currentConfig = await getAppConfig();
  const manualRegistrationsCount = await prisma.manualRegistration.count();
  const usesDefaultSettings =
    JSON.stringify(currentConfig.settings) === JSON.stringify(DEFAULT_SETTINGS);
  const usesDefaultScrimSettings =
    JSON.stringify(currentConfig.scrimSettings) ===
    JSON.stringify(DEFAULT_SCRIM_SETTINGS);

  if (!usesDefaultSettings || !usesDefaultScrimSettings || manualRegistrationsCount > 0) {
    return;
  }

  await updateSettingsConfig(getImportedSettings());
  await updateScrimConfig(getImportedScrimSettings());
  await importManualRegistrations(manualHealersPath, "healer");
  await importManualRegistrations(manualTanksPath, "tank");
}
