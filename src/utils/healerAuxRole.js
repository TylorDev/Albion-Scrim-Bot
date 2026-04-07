import { PLAYER_ROLES } from "../constants/playerRoles.js";

async function findOrCreateRole(guild, roleName) {
  const existingRole = guild.roles.cache.find(
    (role) => role.name.trim().toLowerCase() === roleName.trim().toLowerCase()
  );

  if (existingRole) {
    return existingRole;
  }

  return guild.roles.create({
    name: roleName,
    mentionable: true,
    reason: "Rol auxiliar de healer para scrims."
  });
}

export async function ensureHealerAuxRole(guild) {
  return findOrCreateRole(guild, PLAYER_ROLES.healerAuxiliar);
}

export async function assignHealerAuxRole(member) {
  const role = await ensureHealerAuxRole(member.guild);
  await member.roles.add(role, "Jugador marcado como healer auxiliar en scrim.");
  return role;
}

export async function removeHealerAuxRoleFromMember(member) {
  const role = member.guild.roles.cache.find(
    (item) =>
      item.name.trim().toLowerCase() === PLAYER_ROLES.healerAuxiliar.toLowerCase()
  );

  if (!role || !member.roles.cache.has(role.id)) {
    return false;
  }

  await member.roles.remove(role, "Jugador removido de healer auxiliar en scrim.");
  return true;
}

export async function removeHealerAuxRoleFromUserIds(guild, userIds) {
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      continue;
    }

    await removeHealerAuxRoleFromMember(member).catch(() => null);
  }
}
