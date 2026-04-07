export const PLAYER_ROLES = {
  mainHealer: "Main Healer",
  healer: "Healer",
  healerAuxiliar: "Healer-Auxiliar",
  tank: "Tank",
  tankAuxiliar: "Tank-Auxiliar",
  dps: "Dps",
  rdps: "Rdps",
  debuffer: "Debuffer"
};

export const PLAYABLE_ROLE_NAMES = [
  PLAYER_ROLES.mainHealer,
  PLAYER_ROLES.healer,
  PLAYER_ROLES.healerAuxiliar,
  PLAYER_ROLES.tank,
  PLAYER_ROLES.tankAuxiliar,
  PLAYER_ROLES.dps,
  PLAYER_ROLES.rdps,
  PLAYER_ROLES.debuffer
];

export const PLAYABLE_ROLE_NAME_SET = new Set(
  PLAYABLE_ROLE_NAMES.map((roleName) => roleName.toLowerCase())
);
