import { COMMANDS } from "../constants/commands.js";
import { getSettingsConfig, updateSettingsConfig } from "./appConfigStore.js";

export async function getSettings() {
  return getSettingsConfig();
}

export async function addArenaRole(roleId) {
  const settings = await getSettingsConfig();

  if (!settings.allowedArenaRoleIds.includes(roleId)) {
    settings.allowedArenaRoleIds.push(roleId);
  }

  return updateSettingsConfig(settings);
}

export async function addArenaUser(userId) {
  const settings = await getSettingsConfig();

  if (!settings.allowedArenaUserIds.includes(userId)) {
    settings.allowedArenaUserIds.push(userId);
  }

  return updateSettingsConfig(settings);
}

export async function clearArenaAccess() {
  const settings = await getSettingsConfig();
  settings.allowedArenaRoleIds = [];
  settings.allowedArenaUserIds = [];
  return updateSettingsConfig(settings);
}

export async function setCommandPublic(commandName, isPublic) {
  const settings = await getSettingsConfig();
  const hasCommand = settings.publicCommands.includes(commandName);

  if (isPublic && !hasCommand) {
    settings.publicCommands.push(commandName);
  }

  if (!isPublic && hasCommand) {
    settings.publicCommands = settings.publicCommands.filter(
      (item) => item !== commandName
    );
  }

  return updateSettingsConfig(settings);
}

export async function isCommandPublic(commandName) {
  const settings = await getSettingsConfig();
  return settings.publicCommands.includes(commandName);
}

export async function canUseArena(interaction) {
  const settings = await getSettingsConfig();

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
