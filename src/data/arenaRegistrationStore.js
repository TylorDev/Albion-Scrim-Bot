import { prisma } from "../database/prisma.js";
import { PLAYER_ROLES } from "../constants/playerRoles.js";
import {
  addManualHealerUser,
  clearManualHealers,
  getManualHealerUserIds,
  isManualHealerUser,
  removeManualHealerUser
} from "./manualHealerStore.js";
import {
  addManualTankUser,
  clearManualTanks,
  getManualTankUserIds,
  isManualTankUser,
  removeManualTankUser
} from "./manualTankStore.js";
import {
  DEFAULT_SCRIM_SETTINGS,
  SCRIM_FAKE_PRESETS,
  setScrimSettings,
  getScrimSettings
} from "./scrimConfigStore.js";
import {
  ensurePlayerForMember,
  getRandomFakePlayers,
  getAvailableFakeDpsReplacement,
  getAvailableFakeHealerReplacement,
  getFixedFakeHealers,
  getPlayerByUserId,
  getRandomFakeDpsPlayers,
  getRandomFakePlayersByAssignedRole
} from "./playerStore.js";

export const MAX_ARENA_PLAYERS = DEFAULT_SCRIM_SETTINGS.maxPlayers;

export async function listArenaRegistrations() {
  return prisma.arenaRegistration.findMany({
    include: { player: true },
    orderBy: { registeredAt: "asc" }
  });
}

function getRandomItem(items) {
  if (items.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

async function getReplacementTargetForPlayer(player) {
  const registrations = await listArenaRegistrations();
  const registeredPlayers = registrations.map((registration) => registration.player);
  const healerPlayers = registeredPlayers.filter((registeredPlayer) => registeredPlayer.isHealer);
  const nonHealerPlayers = registeredPlayers.filter((registeredPlayer) => !registeredPlayer.isHealer);

  if (registeredPlayers.length === 0) {
    return null;
  }

  if (player.isHealer) {
    if (healerPlayers.length === registeredPlayers.length) {
      return [...registeredPlayers].sort((left, right) => right.mmr - left.mmr)[0];
    }

    return getRandomItem(healerPlayers);
  }

  if (nonHealerPlayers.length > 0) {
    return getRandomItem(nonHealerPlayers);
  }

  return [...registeredPlayers].sort((left, right) => right.mmr - left.mmr)[0];
}

export async function registerArenaMember(member, mode = "real") {
  const player = await ensurePlayerForMember(member);
  const existing = await prisma.arenaRegistration.findUnique({
    where: { playerId: player.id },
    include: { player: true }
  });

  if (existing) {
    return { status: "already_registered", player: existing.player };
  }

  const currentCount = await prisma.arenaRegistration.count();
  const { maxPlayers } = await getScrimSettings();

  if (currentCount >= maxPlayers) {
    const playerToReplace = await getReplacementTargetForPlayer(player);

    if (!playerToReplace) {
      return { status: "full", player };
    }

    await prisma.arenaRegistration.deleteMany({
      where: { playerId: playerToReplace.id }
    });

    await prisma.arenaRegistration.create({
      data: {
        playerId: player.id
      }
    });

    return {
      status: mode === "fake" ? "replaced_fake" : "replaced_player",
      player,
      replacedPlayer: playerToReplace
    };
  }

  await prisma.arenaRegistration.create({
    data: {
      playerId: player.id
    }
  });

  return { status: "registered", player };
}

export async function removeArenaRegistrationByUserId(userId, mode = "real") {
  const player = await getPlayerByUserId(userId);

  if (!player) {
    await removeManualHealerUser(userId);
    await removeManualTankUser(userId);
    return false;
  }

  await removeManualHealerUser(userId);
  await removeManualTankUser(userId);

  const result = await prisma.arenaRegistration.deleteMany({
    where: { playerId: player.id }
  });

  if (result.count > 0 && mode === "fake" && !player.isFake) {
    const replacementFake = player.isHealer
      ? await getAvailableFakeHealerReplacement()
      : await getAvailableFakeDpsReplacement();

    if (replacementFake) {
      await prisma.arenaRegistration.create({
        data: {
          playerId: replacementFake.id
        }
      });
    }
  }

  return result.count > 0;
}

export async function clearArenaRegistrations() {
  await prisma.arenaRegistration.deleteMany();
  await clearManualHealers();
  await clearManualTanks();
}

export async function getArenaPlayers() {
  const registrations = await listArenaRegistrations();
  const manualHealerUserIds = new Set(await getManualHealerUserIds());
  const manualTankUserIds = new Set(await getManualTankUserIds());

  return registrations.map((registration) => {
    if (
      !manualHealerUserIds.has(registration.player.userId) &&
      !manualTankUserIds.has(registration.player.userId)
    ) {
      return registration.player;
    }

    return {
      ...registration.player,
      isHealer:
        registration.player.isHealer ||
        manualHealerUserIds.has(registration.player.userId),
      manualHealer: manualHealerUserIds.has(registration.player.userId),
      manualTank: manualTankUserIds.has(registration.player.userId)
    };
  });
}

export async function startEmptyScrim(settings = DEFAULT_SCRIM_SETTINGS) {
  await clearArenaRegistrations();
  await setScrimSettings({
    ...DEFAULT_SCRIM_SETTINGS,
    ...settings,
    allowAuxHealerSignup: false,
    allowAuxTankSignup: false
  });
}

async function getUniqueFakePlayersByRoles(roleNames, count, excludedIds = new Set()) {
  const pools = await Promise.all(
    roleNames.map((roleName) => getRandomFakePlayersByAssignedRole(roleName, 20))
  );
  const candidates = pools
    .flat()
    .filter((player, index, allPlayers) => {
      return (
        !excludedIds.has(player.id) &&
        allPlayers.findIndex((item) => item.id === player.id) === index
      );
    });
  const shuffled = [...candidates];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index]
    ];
  }

  if (shuffled.length >= count) {
    return shuffled.slice(0, count);
  }

  const fallbackPlayers = (await getRandomFakePlayers(20)).filter((player) => {
    return (
      !excludedIds.has(player.id) &&
      !shuffled.some((item) => item.id === player.id)
    );
  });

  return [...shuffled, ...fallbackPlayers].slice(0, count);
}

async function buildDefaultFakePlayers() {
  const healers = await getFixedFakeHealers();
  const guaranteedTank = await getRandomFakePlayersByAssignedRole(PLAYER_ROLES.tank, 1);
  const guaranteedRdps = await getRandomFakePlayersByAssignedRole(PLAYER_ROLES.rdps, 1);
  const guaranteedDebuffer = await getRandomFakePlayersByAssignedRole(
    PLAYER_ROLES.debuffer,
    1
  );
  const guaranteedIds = new Set(
    [...guaranteedTank, ...guaranteedRdps, ...guaranteedDebuffer].map(
      (player) => player.id
    )
  );
  const extraPlayers = (await getRandomFakeDpsPlayers(8)).filter(
    (player) => !guaranteedIds.has(player.id)
  );

  return [
    ...healers,
    ...guaranteedTank,
    ...guaranteedRdps,
    ...guaranteedDebuffer,
    ...extraPlayers.slice(0, 5)
  ];
}

async function buildNoHealersFakePlayers() {
  return getUniqueFakePlayersByRoles(
    [PLAYER_ROLES.dps, PLAYER_ROLES.rdps, PLAYER_ROLES.tank],
    10
  );
}

async function buildNoTanksFakePlayers() {
  const healers = await getFixedFakeHealers();
  const excludedIds = new Set(healers.map((player) => player.id));
  const others = await getUniqueFakePlayersByRoles(
    [PLAYER_ROLES.dps, PLAYER_ROLES.rdps],
    8,
    excludedIds
  );

  return [...healers, ...others];
}

async function buildNoDpsFakePlayers() {
  const healers = await getFixedFakeHealers();
  const excludedIds = new Set(healers.map((player) => player.id));
  const tanks = await getUniqueFakePlayersByRoles(
    [PLAYER_ROLES.tank],
    8,
    excludedIds
  );

  return [...healers, ...tanks];
}

async function buildOneHealerFakePlayers() {
  const healers = await getFixedFakeHealers();
  const selectedHealer = healers.slice(0, 1);
  const excludedIds = new Set(selectedHealer.map((player) => player.id));
  const others = await getUniqueFakePlayersByRoles(
    [PLAYER_ROLES.tank, PLAYER_ROLES.dps, PLAYER_ROLES.rdps],
    9,
    excludedIds
  );

  return [...selectedHealer, ...others];
}

async function getFakePlayersForPreset(preset) {
  if (preset === SCRIM_FAKE_PRESETS.nohealers) {
    return buildNoHealersFakePlayers();
  }

  if (preset === SCRIM_FAKE_PRESETS.notanks) {
    return buildNoTanksFakePlayers();
  }

  if (preset === SCRIM_FAKE_PRESETS.nodps) {
    return buildNoDpsFakePlayers();
  }

  if (preset === SCRIM_FAKE_PRESETS.onehealer) {
    return buildOneHealerFakePlayers();
  }

  return buildDefaultFakePlayers();
}

export async function loadFakeScrim(preset = SCRIM_FAKE_PRESETS.default) {
  const players = await getFakePlayersForPreset(preset);

  await clearArenaRegistrations();
  await setScrimSettings({
    ...DEFAULT_SCRIM_SETTINGS,
    fakePreset: preset,
    allowAuxHealerSignup: false,
    allowAuxTankSignup: false
  });

  if (players.length === 0) {
    return [];
  }

  await prisma.arenaRegistration.createMany({
    data: players.map((player) => ({
      playerId: player.id
    }))
  });

  return getArenaPlayers();
}

export async function toggleSelfHealerRegistration(member, mode = "real") {
  if (await isManualHealerUser(member.id)) {
    await removeArenaRegistrationByUserId(member.id, mode);

    return {
      status: "manual_healer_removed"
    };
  }

  const manualHealerResult = await addManualHealerUser(member.id);

  if (manualHealerResult.status === "manual_healer_full") {
    return {
      status: "manual_healer_full"
    };
  }

  const registrationResult = await registerArenaMember(member, mode);

  if (registrationResult.status === "full") {
    await removeManualHealerUser(member.id);
    return registrationResult;
  }

  return {
    status: "manual_healer_added",
    player: registrationResult.player
  };
}

export async function toggleSelfTankRegistration(member, mode = "real") {
  if (await isManualTankUser(member.id)) {
    await removeArenaRegistrationByUserId(member.id, mode);

    return {
      status: "manual_tank_removed"
    };
  }

  const manualTankResult = await addManualTankUser(member.id);

  if (manualTankResult.status === "manual_tank_full") {
    return {
      status: "manual_tank_full"
    };
  }

  const registrationResult = await registerArenaMember(member, mode);

  if (registrationResult.status === "full") {
    await removeManualTankUser(member.id);
    return registrationResult;
  }

  return {
    status: "manual_tank_added",
    player: registrationResult.player
  };
}
