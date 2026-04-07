import fs from "node:fs";
import path from "node:path";

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

const DATA_DIRECTORY = path.resolve(process.cwd(), "data");
const CONFIG_PATH = path.resolve(DATA_DIRECTORY, "scrim-config.json");

function ensureConfigFile() {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });

  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(DEFAULT_SCRIM_SETTINGS, null, 2),
      "utf8"
    );
  }
}

export function getScrimSettings() {
  ensureConfigFile();

  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    return {
      format: parsed.format || DEFAULT_SCRIM_SETTINGS.format,
      maxPlayers:
        Number.isInteger(parsed.maxPlayers) && parsed.maxPlayers > 0
          ? parsed.maxPlayers
          : DEFAULT_SCRIM_SETTINGS.maxPlayers,
      fakePreset: parsed.fakePreset || DEFAULT_SCRIM_SETTINGS.fakePreset,
      allowAuxHealerSignup:
        typeof parsed.allowAuxHealerSignup === "boolean"
          ? parsed.allowAuxHealerSignup
          : DEFAULT_SCRIM_SETTINGS.allowAuxHealerSignup,
      allowAuxTankSignup:
        typeof parsed.allowAuxTankSignup === "boolean"
          ? parsed.allowAuxTankSignup
          : DEFAULT_SCRIM_SETTINGS.allowAuxTankSignup
    };
  } catch {
    return { ...DEFAULT_SCRIM_SETTINGS };
  }
}

export function setScrimSettings(nextSettings) {
  ensureConfigFile();

  const current = getScrimSettings();
  const merged = {
    ...current,
    ...nextSettings
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}
