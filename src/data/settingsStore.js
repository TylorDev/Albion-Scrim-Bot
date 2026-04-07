import fs from "node:fs";
import { settingsFile } from "../config/paths.js";
import { COMMANDS } from "../constants/commands.js";

const defaultSettings = {
  allowedArenaRoleIds: [],
  allowedArenaUserIds: [],
  publicCommands: [
    COMMANDS.registrados,
    COMMANDS.ranking,
    COMMANDS.simular,
    COMMANDS.iniciarSimulacion,
    COMMANDS.setup
  ]
};

function normalizeSettings(settings = {}) {
  return {
    allowedArenaRoleIds: Array.isArray(settings.allowedArenaRoleIds)
      ? settings.allowedArenaRoleIds
      : [],
    allowedArenaUserIds: Array.isArray(settings.allowedArenaUserIds)
      ? settings.allowedArenaUserIds
      : [],
    publicCommands: Array.from(
      new Set(
        Array.isArray(settings.publicCommands)
          ? [...defaultSettings.publicCommands, ...settings.publicCommands]
          : [...defaultSettings.publicCommands]
      )
    )
  };
}

export function loadSettings() {
  const rawSettings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  return normalizeSettings(rawSettings);
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.writeFileSync(settingsFile, JSON.stringify(normalized, null, 2));
  return normalized;
}

export function getSettings() {
  return loadSettings();
}

export function addArenaRole(roleId) {
  const settings = loadSettings();

  if (!settings.allowedArenaRoleIds.includes(roleId)) {
    settings.allowedArenaRoleIds.push(roleId);
  }

  return saveSettings(settings);
}

export function addArenaUser(userId) {
  const settings = loadSettings();

  if (!settings.allowedArenaUserIds.includes(userId)) {
    settings.allowedArenaUserIds.push(userId);
  }

  return saveSettings(settings);
}

export function clearArenaAccess() {
  const settings = loadSettings();
  settings.allowedArenaRoleIds = [];
  settings.allowedArenaUserIds = [];
  return saveSettings(settings);
}

export function setCommandPublic(commandName, isPublic) {
  const settings = loadSettings();
  const hasCommand = settings.publicCommands.includes(commandName);

  if (isPublic && !hasCommand) {
    settings.publicCommands.push(commandName);
  }

  if (!isPublic && hasCommand) {
    settings.publicCommands = settings.publicCommands.filter(
      (item) => item !== commandName
    );
  }

  return saveSettings(settings);
}

export function isCommandPublic(commandName) {
  return loadSettings().publicCommands.includes(commandName);
}

export function canUseArena(interaction) {
  const settings = loadSettings();

  if (settings.publicCommands.includes(COMMANDS.arena)) {
    return true;
  }

  if (settings.allowedArenaUserIds.includes(interaction.user.id)) {
    return true;
  }

  return interaction.member.roles.cache.some((role) =>
    settings.allowedArenaRoleIds.includes(role.id)
  );
}
