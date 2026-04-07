import {
  DEFAULT_SCRIM_SETTINGS,
  SCRIM_FAKE_PRESETS,
  SCRIM_FORMATS,
  getScrimConfig,
  updateScrimConfig
} from "./appConfigStore.js";

export { DEFAULT_SCRIM_SETTINGS, SCRIM_FAKE_PRESETS, SCRIM_FORMATS };

export async function getScrimSettings() {
  return getScrimConfig();
}

export async function setScrimSettings(nextSettings) {
  return updateScrimConfig(nextSettings);
}
