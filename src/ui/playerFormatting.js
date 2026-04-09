import { FAKE_PLAYER_ROLES } from "../constants/fakeRoles.js";
import { PLAYABLE_ROLE_NAME_SET, PLAYER_ROLES } from "../constants/playerRoles.js";

function getRoleMentionOrFallback(guild, roleName, fallbackLabel = roleName) {
  if (!guild) {
    return `[${fallbackLabel}]`;
  }

  const role = guild.roles.cache.find(
    (item) => item.name.trim().toLowerCase() === roleName.trim().toLowerCase()
  );

  if (!role) {
    return roleName === PLAYER_ROLES.healer ||
      roleName === PLAYER_ROLES.mainHealer ||
      roleName === PLAYER_ROLES.healerAuxiliar
      ? "[GREEN Healer]"
      : roleName === PLAYER_ROLES.tankAuxiliar
        ? "[Tank-Auxiliar]"
      : `[${fallbackLabel}]`;
  }

  return `<@&${role.id}>`;
}

async function getRealPlayerRoleTags(player, guild) {
  if (!guild) {
    return [
      ...(player.manualHealer
        ? [
            getRoleMentionOrFallback(
              guild,
              PLAYER_ROLES.healerAuxiliar,
              PLAYER_ROLES.healerAuxiliar
            )
          ]
        : []),
      ...(player.manualTank
        ? [
            getRoleMentionOrFallback(
              guild,
              PLAYER_ROLES.tankAuxiliar,
              PLAYER_ROLES.tankAuxiliar
            )
          ]
        : [])
    ];
  }

  const cachedMember = guild.members.cache.get(player.userId);
  const member = cachedMember ?? (await guild.members.fetch(player.userId).catch(() => null));

  if (!member) {
    return [
      ...(player.manualHealer
        ? [
            getRoleMentionOrFallback(
              guild,
              PLAYER_ROLES.healerAuxiliar,
              PLAYER_ROLES.healerAuxiliar
            )
          ]
        : []),
      ...(player.manualTank
        ? [
            getRoleMentionOrFallback(
              guild,
              PLAYER_ROLES.tankAuxiliar,
              PLAYER_ROLES.tankAuxiliar
            )
          ]
        : [])
    ];
  }

  const hasRealAuxHealerRole = member.roles.cache.some(
    (role) =>
      role.name.trim().toLowerCase() === PLAYER_ROLES.healerAuxiliar.toLowerCase()
  );
  const roleTags = member.roles.cache
    .filter((role) => {
      if (role.name === "@everyone") {
        return false;
      }

      return PLAYABLE_ROLE_NAME_SET.has(role.name.trim().toLowerCase());
    })
    .sort((left, right) => left.position - right.position)
    .map((role) => `<@&${role.id}>`);
  const hasRealAuxTankRole = member.roles.cache.some(
    (role) =>
      role.name.trim().toLowerCase() === PLAYER_ROLES.tankAuxiliar.toLowerCase()
  );
  const nextRoleTags = [...roleTags];

  if (player.manualHealer && !hasRealAuxHealerRole) {
    nextRoleTags.unshift(
      getRoleMentionOrFallback(
        guild,
        PLAYER_ROLES.healerAuxiliar,
        PLAYER_ROLES.healerAuxiliar
      )
    );
  }

  if (player.manualTank && !hasRealAuxTankRole) {
    nextRoleTags.unshift(
      getRoleMentionOrFallback(
        guild,
        PLAYER_ROLES.tankAuxiliar,
        PLAYER_ROLES.tankAuxiliar
      )
    );
  }

  return nextRoleTags;
}

function getFakePlayerRoleTags(player, guild) {
  if (Array.isArray(player.fakeRoles) && player.fakeRoles.length > 0) {
    return player.fakeRoles.map((roleName) =>
      getRoleMentionOrFallback(guild, roleName, roleName)
    );
  }

  if (player.isHealer) {
    return [getRoleMentionOrFallback(guild, PLAYER_ROLES.healer, PLAYER_ROLES.healer)];
  }

  const fakeRole = FAKE_PLAYER_ROLES[player.userId] || "Dps";
  return [getRoleMentionOrFallback(guild, fakeRole, fakeRole)];
}

export function getWinrate(player) {
  if (player.partidas === 0) {
    return 0;
  }

  return Number(((player.victorias / player.partidas) * 100).toFixed(1));
}

export async function formatPlayerLabel(player, guild = null) {
  const baseLabel = player.isFake ? `@${player.username}` : `<@${player.userId}>`;
  const roleTags = player.isFake
    ? getFakePlayerRoleTags(player, guild)
    : await getRealPlayerRoleTags(player, guild);

  if (roleTags.length === 0) {
    return baseLabel;
  }

  return `${baseLabel} ${roleTags.join(" ")}`;
}

export function formatProbability(value) {
  return `${(value * 100).toFixed(1)}%`;
}
