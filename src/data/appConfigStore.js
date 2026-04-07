import { ManualRegistrationType, ScrimFakePreset, ScrimFormat } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { COMMANDS } from "../constants/commands.js";

export const DEFAULT_SETTINGS = {
  allowedArenaRoleIds: [],
  allowedArenaUserIds: [],
  publicCommands: [
    COMMANDS.secret,
    COMMANDS.scrim,
    COMMANDS.scrimfake,
    COMMANDS.pelea,
    COMMANDS.ranking,
    COMMANDS.setup
  ]
};

export const SCRIM_FORMATS = {
  standard: "standard",
  meta: "meta",
  libre: "libre"
};

export const SCRIM_FAKE_PRESETS = {
  default: "default",
  nohealers: "nohealers",
  notanks: "notanks",
  nodps: "nodps",
  onehealer: "onehealer"
};

export const DEFAULT_SCRIM_SETTINGS = {
  format: SCRIM_FORMATS.standard,
  maxPlayers: 10,
  fakePreset: SCRIM_FAKE_PRESETS.default,
  allowAuxHealerSignup: false,
  allowAuxTankSignup: false
};

const APP_CONFIG_ID = 1;

function normalizeStringList(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === "string"))
  );
}

function normalizeSettings(settings = {}) {
  return {
    allowedArenaRoleIds: normalizeStringList(settings.allowedArenaRoleIds),
    allowedArenaUserIds: normalizeStringList(settings.allowedArenaUserIds),
    publicCommands: normalizeStringList([
      ...DEFAULT_SETTINGS.publicCommands,
      ...normalizeStringList(settings.publicCommands)
    ])
  };
}

function mapScrimFormatToDb(format) {
  switch (format) {
    case SCRIM_FORMATS.meta:
      return ScrimFormat.META;
    case SCRIM_FORMATS.libre:
      return ScrimFormat.LIBRE;
    default:
      return ScrimFormat.STANDARD;
  }
}

function mapScrimFormatFromDb(format) {
  switch (format) {
    case ScrimFormat.META:
      return SCRIM_FORMATS.meta;
    case ScrimFormat.LIBRE:
      return SCRIM_FORMATS.libre;
    default:
      return SCRIM_FORMATS.standard;
  }
}

function mapFakePresetToDb(fakePreset) {
  switch (fakePreset) {
    case SCRIM_FAKE_PRESETS.nohealers:
      return ScrimFakePreset.NOHEALERS;
    case SCRIM_FAKE_PRESETS.notanks:
      return ScrimFakePreset.NOTANKS;
    case SCRIM_FAKE_PRESETS.nodps:
      return ScrimFakePreset.NODPS;
    case SCRIM_FAKE_PRESETS.onehealer:
      return ScrimFakePreset.ONEHEALER;
    default:
      return ScrimFakePreset.DEFAULT;
  }
}

function mapFakePresetFromDb(fakePreset) {
  switch (fakePreset) {
    case ScrimFakePreset.NOHEALERS:
      return SCRIM_FAKE_PRESETS.nohealers;
    case ScrimFakePreset.NOTANKS:
      return SCRIM_FAKE_PRESETS.notanks;
    case ScrimFakePreset.NODPS:
      return SCRIM_FAKE_PRESETS.nodps;
    case ScrimFakePreset.ONEHEALER:
      return SCRIM_FAKE_PRESETS.onehealer;
    default:
      return SCRIM_FAKE_PRESETS.default;
  }
}

export function mapRoleTypeToDb(roleType) {
  return roleType === "tank"
    ? ManualRegistrationType.TANK
    : ManualRegistrationType.HEALER;
}

function mapSettingsToDb(settings = {}) {
  const normalized = normalizeSettings(settings);

  return {
    allowedArenaRoleIds: normalized.allowedArenaRoleIds,
    allowedArenaUserIds: normalized.allowedArenaUserIds,
    publicCommands: normalized.publicCommands
  };
}

function mapScrimSettingsToDb(settings = {}) {
  const merged = {
    ...DEFAULT_SCRIM_SETTINGS,
    ...settings
  };

  return {
    scrimFormat: mapScrimFormatToDb(merged.format),
    scrimMaxPlayers:
      Number.isInteger(merged.maxPlayers) && merged.maxPlayers > 0
        ? merged.maxPlayers
        : DEFAULT_SCRIM_SETTINGS.maxPlayers,
    scrimFakePreset: mapFakePresetToDb(merged.fakePreset),
    allowAuxHealerSignup:
      typeof merged.allowAuxHealerSignup === "boolean"
        ? merged.allowAuxHealerSignup
        : DEFAULT_SCRIM_SETTINGS.allowAuxHealerSignup,
    allowAuxTankSignup:
      typeof merged.allowAuxTankSignup === "boolean"
        ? merged.allowAuxTankSignup
        : DEFAULT_SCRIM_SETTINGS.allowAuxTankSignup
  };
}

function mapConfigFromDb(config) {
  return {
    settings: normalizeSettings(config),
    scrimSettings: {
      format: mapScrimFormatFromDb(config.scrimFormat),
      maxPlayers: config.scrimMaxPlayers,
      fakePreset: mapFakePresetFromDb(config.scrimFakePreset),
      allowAuxHealerSignup: config.allowAuxHealerSignup,
      allowAuxTankSignup: config.allowAuxTankSignup
    }
  };
}

export async function ensureAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    update: {},
    create: {
      id: APP_CONFIG_ID,
      ...mapSettingsToDb(DEFAULT_SETTINGS),
      ...mapScrimSettingsToDb(DEFAULT_SCRIM_SETTINGS)
    }
  });
}

export async function getAppConfig() {
  const config = await ensureAppConfig();
  return mapConfigFromDb(config);
}

export async function getSettingsConfig() {
  const { settings } = await getAppConfig();
  return settings;
}

export async function updateSettingsConfig(nextSettings) {
  const current = await getSettingsConfig();
  const merged = normalizeSettings({
    ...current,
    ...nextSettings
  });

  await prisma.appConfig.update({
    where: { id: APP_CONFIG_ID },
    data: mapSettingsToDb(merged)
  });

  return merged;
}

export async function getScrimConfig() {
  const { scrimSettings } = await getAppConfig();
  return scrimSettings;
}

export async function updateScrimConfig(nextSettings) {
  const current = await getScrimConfig();
  const merged = {
    ...current,
    ...nextSettings
  };

  await prisma.appConfig.update({
    where: { id: APP_CONFIG_ID },
    data: mapScrimSettingsToDb(merged)
  });

  return {
    ...DEFAULT_SCRIM_SETTINGS,
    ...merged
  };
}
