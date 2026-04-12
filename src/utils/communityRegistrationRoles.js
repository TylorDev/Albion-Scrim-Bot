import {
  COMMUNITY_REGISTRATION_ROLE_ORDER
} from "../constants/communityRegistrationRoles.js";
import { hasExactRole } from "./roleChecks.js";

function getGuildRoleByName(guild, roleName) {
  return guild.roles.cache.find(
    (role) => role.name.trim().toLowerCase() === roleName.trim().toLowerCase()
  );
}

export async function assignCommunityRole(member, roleKey) {
  const roleConfig = COMMUNITY_REGISTRATION_ROLE_ORDER.find((role) => role.key === roleKey);

  if (!roleConfig) {
    throw new Error("Rol de registro invalido.");
  }

  const role = getGuildRoleByName(member.guild, roleConfig.discordRoleName);

  if (!role) {
    throw new Error(`No existe el rol \`${roleConfig.discordRoleName}\`.`);
  }

  if (!hasExactRole(member, role.name)) {
    await member.roles.add(role);
  }
}

export async function removeAllCommunityRoles(member) {
  const rolesToRemove = COMMUNITY_REGISTRATION_ROLE_ORDER
    .map((roleConfig) => getGuildRoleByName(member.guild, roleConfig.discordRoleName))
    .filter(Boolean);

  if (rolesToRemove.length === 0) {
    return;
  }

  await member.roles.remove(rolesToRemove);
}
