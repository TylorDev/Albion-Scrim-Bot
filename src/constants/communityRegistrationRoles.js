export const COMMUNITY_REGISTRATION_ROLES = {
  arena: "Arena-Player",
  scrim: "Scrim-Player",
  crystalLeague: "Crystal-Player",
  crystal20v20: "Crystal-20v20"
};

export const COMMUNITY_REGISTRATION_ROLE_ORDER = [
  {
    key: "arena",
    label: "Arena",
    discordRoleName: COMMUNITY_REGISTRATION_ROLES.arena
  },
  {
    key: "scrim",
    label: "Scrim",
    discordRoleName: COMMUNITY_REGISTRATION_ROLES.scrim
  },
  {
    key: "crystalLeague",
    label: "Crystal League",
    discordRoleName: COMMUNITY_REGISTRATION_ROLES.crystalLeague
  },
  {
    key: "crystal20v20",
    label: "Crystal 20v20",
    discordRoleName: COMMUNITY_REGISTRATION_ROLES.crystal20v20
  }
];

export const COMMUNITY_REGISTRATION_BATCH_CAPACITY = 30;
