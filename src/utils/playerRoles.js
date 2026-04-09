import {
  PLAYABLE_ROLE_NAMES,
  PLAYABLE_ROLE_NAME_SET,
  PLAYER_ROLES
} from "../constants/playerRoles.js";
import { FAKE_PLAYER_ROLES } from "../constants/fakeRoles.js";

export function normalizeRoleName(roleName) {
  return roleName.trim().toLowerCase();
}

export function getPlayableRolesFromMember(member) {
  const memberRoleNames = new Set(
    member.roles.cache
      .filter((role) => role.name !== "@everyone")
      .map((role) => role.name.trim().toLowerCase())
  );

  return PLAYABLE_ROLE_NAMES.filter((roleName) =>
    memberRoleNames.has(roleName.toLowerCase())
  );
}

export function getHealerPriorityFromMember(member) {
  if (
    member.roles.cache.some(
      (role) => normalizeRoleName(role.name) === normalizeRoleName(PLAYER_ROLES.mainHealer)
    )
  ) {
    return 3;
  }

  if (
    member.roles.cache.some(
      (role) => normalizeRoleName(role.name) === normalizeRoleName(PLAYER_ROLES.healer)
    )
  ) {
    return 2;
  }

  if (
    member.roles.cache.some(
      (role) =>
        normalizeRoleName(role.name) === normalizeRoleName(PLAYER_ROLES.healerAuxiliar)
    )
  ) {
    return 1;
  }

  return 0;
}

export function getTankPriorityFromMember(member) {
  if (
    member.roles.cache.some(
      (role) => normalizeRoleName(role.name) === normalizeRoleName(PLAYER_ROLES.tank)
    )
  ) {
    return 2;
  }

  if (
    member.roles.cache.some(
      (role) =>
        normalizeRoleName(role.name) === normalizeRoleName(PLAYER_ROLES.tankAuxiliar)
    )
  ) {
    return 1;
  }

  return 0;
}

export function getFakePlayerRoles(player) {
  if (Array.isArray(player.fakeRoles) && player.fakeRoles.length > 0) {
    return player.fakeRoles;
  }

  if (player.isHealer) {
    return [PLAYER_ROLES.healer];
  }

  return [FAKE_PLAYER_ROLES[player.userId] || PLAYER_ROLES.dps];
}

export async function enrichPlayerWithRoles(player, guild = null) {
  if (player.isFake || !guild) {
    const roleNames = getFakePlayerRoles(player);

    return {
      ...player,
      roleNames,
      roleCount: roleNames.length,
      healerPriority: player.isHealer ? 1 : 0,
      tankPriority: roleNames.includes(PLAYER_ROLES.tank) ? 2 : 0
    };
  }

  const cachedMember = guild.members.cache.get(player.userId);
  const member = cachedMember ?? (await guild.members.fetch(player.userId).catch(() => null));
  const baseRoleNames = member
    ? getPlayableRolesFromMember(member)
    : player.isHealer
      ? [PLAYER_ROLES.healerAuxiliar]
      : [];
  const roleNames =
    [
      ...(player.manualHealer && !baseRoleNames.includes(PLAYER_ROLES.healerAuxiliar)
        ? [PLAYER_ROLES.healerAuxiliar]
        : []),
      ...(player.manualTank && !baseRoleNames.includes(PLAYER_ROLES.tankAuxiliar)
        ? [PLAYER_ROLES.tankAuxiliar]
        : []),
      ...baseRoleNames
    ].filter((roleName, index, roles) => roles.indexOf(roleName) === index);
  const healerPriority = member
    ? getHealerPriorityFromMember(member)
    : player.isHealer
      ? 1
      : 0;
  const tankPriority = member
    ? getTankPriorityFromMember(member)
    : player.manualTank
      ? 1
      : 0;

  return {
    ...player,
    roleNames,
    roleCount: roleNames.length,
    healerPriority: player.manualHealer ? Math.max(healerPriority, 1) : healerPriority,
    tankPriority: player.manualTank ? Math.max(tankPriority, 1) : tankPriority
  };
}

export async function enrichPlayersWithRoles(players, guild = null) {
  return Promise.all(
    players.map((player) => enrichPlayerWithRoles(player, guild))
  );
}

export function hasPlayerRole(player, roleName) {
  return (player.roleNames || []).some(
    (item) => normalizeRoleName(item) === normalizeRoleName(roleName)
  );
}

export function getVisiblePlayerRoles(player) {
  return (player.roleNames || []).filter((roleName) =>
    PLAYABLE_ROLE_NAME_SET.has(normalizeRoleName(roleName))
  );
}
