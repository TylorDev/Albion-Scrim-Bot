import { prisma } from "./prisma.js";
import { PLAYER_ROLES } from "../constants/playerRoles.js";

const fakePlayerNames = [
  "Astra",
  "Blaze",
  "Cipher",
  "Drako",
  "Echo",
  "Frost",
  "Ghost",
  "Havoc",
  "Inferno",
  "Jinx",
  "Kairo",
  "Lynx",
  "Mako",
  "Nova",
  "Onyx",
  "Pyro",
  "Quark",
  "Rogue",
  "Shade",
  "Titan"
];

const RANDOM_FAKE_ROLES = [
  PLAYER_ROLES.debuffer,
  PLAYER_ROLES.dps,
  PLAYER_ROLES.rdps,
  PLAYER_ROLES.healer,
  PLAYER_ROLES.tank
];

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateFakePlayerMmr(victorias) {
  return 950 + (victorias * 25);
}

function getRandomUniqueRoles(count = 3) {
  const shuffled = [...RANDOM_FAKE_ROLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function createFakePlayerNames(totalPlayers = 20) {
  return fakePlayerNames.slice(0, totalPlayers).map((username, index) => ({
    userId: `fake_player_${String(index + 1).padStart(2, "0")}`,
    username
  }));
}

export function createRandomFakePlayers(totalPlayers = 20) {
  const basePlayers = createFakePlayerNames(totalPlayers);

  return basePlayers.map((player, index) => {
    const fakeRoles = getRandomUniqueRoles(3);
    const partidas = index === 0 ? 0 : getRandomInteger(1, 12);
    const victorias = index === 0 ? 0 : getRandomInteger(0, partidas);

    return {
      ...player,
      mmr: calculateFakePlayerMmr(victorias),
      partidas,
      victorias,
      fakeRoles,
      isFake: true,
      isHealer: fakeRoles.includes(PLAYER_ROLES.healer)
    };
  });
}

export async function seedFakePlayers(totalPlayers = 20) {
  const playersToSeed = createRandomFakePlayers(totalPlayers);
  const selectedUserIds = playersToSeed.map((player) => player.userId);

  await prisma.player.deleteMany({
    where: {
      isFake: true,
      userId: {
        notIn: selectedUserIds
      }
    }
  });

  for (const player of playersToSeed) {
    await prisma.player.upsert({
      where: { userId: player.userId },
      update: {
        username: player.username,
        mmr: player.mmr,
        partidas: player.partidas,
        victorias: player.victorias,
        isFake: true,
        isHealer: player.isHealer,
        fakeRoles: player.fakeRoles
      },
      create: player
    });
  }

  return playersToSeed.length;
}

export async function ensureSeedData() {
  await seedFakePlayers(20);
}
