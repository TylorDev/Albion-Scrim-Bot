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
    reason: "Rol auxiliar de tank para scrims."
  });
}

export async function ensureTankAuxRole(guild) {
  return findOrCreateRole(guild, PLAYER_ROLES.tankAuxiliar);
}

export async function assignTankAuxRole(member) {
  const role = await ensureTankAuxRole(member.guild);
  await member.roles.add(role, "Jugador marcado como tank auxiliar en scrim.");
  return role;
}

export async function removeTankAuxRoleFromMember(member) {
  const role = member.guild.roles.cache.find(
    (item) =>
      item.name.trim().toLowerCase() === PLAYER_ROLES.tankAuxiliar.toLowerCase()
  );

  if (!role || !member.roles.cache.has(role.id)) {
    return false;
  }

  await member.roles.remove(role, "Jugador removido de tank auxiliar en scrim.");
  return true;
}

export async function removeTankAuxRoleFromUserIds(guild, userIds) {
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      continue;
    }

    await removeTankAuxRoleFromMember(member).catch(() => null);
  }
}
