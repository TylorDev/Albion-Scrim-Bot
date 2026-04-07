import { PLAYER_ROLES } from "../constants/playerRoles.js";
import { normalizeRoleName } from "./playerRoles.js";

export function hasExactRole(member, roleName) {
  const target = normalizeRoleName(roleName);

  return member.roles.cache.some(
    (role) => normalizeRoleName(role.name) === target
  );
}

export function isHealerMember(member) {
  return (
    hasExactRole(member, PLAYER_ROLES.mainHealer) ||
    hasExactRole(member, PLAYER_ROLES.healer) ||
    hasExactRole(member, PLAYER_ROLES.healerAuxiliar)
  );
}

export function isSystem32Member(member) {
  return hasExactRole(member, "system32");
}
