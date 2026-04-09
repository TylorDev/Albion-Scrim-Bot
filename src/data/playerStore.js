import { prisma } from "../database/prisma.js";
import { FAKE_PLAYER_ROLES } from "../constants/fakeRoles.js";
import { isHealerMember } from "../utils/roleChecks.js";

const rankingOrder = [
  { mmr: "desc" },
  { victorias: "desc" },
  { partidas: "asc" },
  { username: "asc" }
];

export async function ensurePlayerForMember(member) {
  const username = member.displayName || member.user.username;
  const isHealer = isHealerMember(member);

  return prisma.player.upsert({
    where: { userId: member.id },
    update: {
      username,
      isFake: false,
      isHealer,
      fakeRoles: []
    },
    create: {
      userId: member.id,
      username,
      mmr: 950,
      partidas: 0,
      victorias: 0,
      isFake: false,
      isHealer,
      fakeRoles: []
    }
  });
}

export async function getPlayerByUserId(userId) {
  return prisma.player.findUnique({
    where: { userId }
  });
}

export async function getPlayerById(id) {
  return prisma.player.findUnique({
    where: { id }
  });
}

export async function getRankingPlayers(limit = 25) {
  return prisma.player.findMany({
    orderBy: rankingOrder,
    take: limit
  });
}

export async function getRandomFakePlayers(count = 10) {
  const players = await prisma.player.findMany({
    where: { isFake: true },
    orderBy: { userId: "asc" }
  });

  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index]
    ];
  }

  return shuffled.slice(0, count);
}

export async function getFixedFakeHealers() {
  return prisma.player.findMany({
    where: {
      isFake: true,
      isHealer: true
    },
    orderBy: { userId: "asc" },
    take: 2
  });
}

export async function getRandomFakeDpsPlayers(count = 8) {
  const players = await prisma.player.findMany({
    where: {
      isFake: true,
      isHealer: false
    },
    orderBy: { userId: "asc" }
  });

  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index]
    ];
  }

  return shuffled.slice(0, count);
}

export async function getRandomFakePlayersByAssignedRole(roleName, count = 1) {
  const players = await prisma.player.findMany({
    where: {
      isFake: true,
      isHealer: false
    },
    orderBy: { userId: "asc" }
  });

  const matchingPlayers = players.filter(
    (player) =>
      (Array.isArray(player.fakeRoles) && player.fakeRoles.includes(roleName)) ||
      FAKE_PLAYER_ROLES[player.userId] === roleName
  );
  const shuffled = [...matchingPlayers];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index]
    ];
  }

  return shuffled.slice(0, count);
}

export async function getRegisteredFakeDpsPlayers() {
  const registrations = await prisma.arenaRegistration.findMany({
    include: { player: true },
    orderBy: { registeredAt: "asc" }
  });

  return registrations
    .map((registration) => registration.player)
    .filter((player) => player.isFake && !player.isHealer);
}

export async function getAvailableFakeDpsReplacement() {
  const registeredPlayers = await prisma.arenaRegistration.findMany({
    select: { playerId: true }
  });
  const registeredIds = registeredPlayers.map((item) => item.playerId);
  const candidates = await prisma.player.findMany({
    where: {
      isFake: true,
      isHealer: false,
      id: {
        notIn: registeredIds
      }
    },
    orderBy: { userId: "asc" }
  });

  if (candidates.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

export async function getAvailableFakeHealerReplacement() {
  const registeredPlayers = await prisma.arenaRegistration.findMany({
    select: { playerId: true }
  });
  const registeredIds = registeredPlayers.map((item) => item.playerId);

  return prisma.player.findFirst({
    where: {
      isFake: true,
      isHealer: true,
      id: {
        notIn: registeredIds
      }
    },
    orderBy: { userId: "asc" }
  });
}

export async function updatePlayersAfterMatch(players, delta, didWin) {
  await prisma.$transaction(
    players.map((player) =>
      prisma.player.update({
        where: { id: player.id },
        data: {
          mmr: Math.max(0, player.mmr + delta),
          partidas: player.partidas + 1,
          victorias: player.victorias + (didWin ? 1 : 0)
        }
      })
    )
  );
}

export async function penalizeInactivePlayers(activePlayerIds, penalty = 2) {
  await prisma.player.updateMany({
    where: {
      id: {
        notIn: activePlayerIds
      }
    },
    data: {
      mmr: {
        decrement: penalty
      }
    }
  });

  await prisma.player.updateMany({
    where: {
      mmr: {
        lt: 0
      }
    },
    data: {
      mmr: 0
    }
  });
}

export async function deleteFakePlayers() {
  const result = await prisma.player.deleteMany({
    where: {
      isFake: true
    }
  });

  return result.count;
}

export async function resetAllPlayerMmr(baseMmr = 1000) {
  const result = await prisma.player.updateMany({
    data: {
      mmr: baseMmr
    }
  });

  return result.count;
}
