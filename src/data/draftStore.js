import { DraftStatus } from "@prisma/client";
import { prisma } from "../database/prisma.js";

function buildDraftPlayers(matchup) {
  return [
    ...matchup.teamA.map((player, index) => ({
      playerId: player.id,
      team: "A",
      position: index + 1
    })),
    ...matchup.teamB.map((player, index) => ({
      playerId: player.id,
      team: "B",
      position: index + 1
    }))
  ];
}

function averageMmr(players) {
  if (players.length === 0) {
    return 0;
  }

  const total = players.reduce((sum, player) => sum + player.mmr, 0);
  return Math.round(total / players.length);
}

function getExpectedWinChance(ownAverage, enemyAverage) {
  const rawProbability =
    1 / (1 + Math.pow(10, (enemyAverage - ownAverage) / 400));

  return Number(rawProbability.toFixed(4));
}

export async function replacePendingDraft(mode, matchup) {
  await prisma.draft.deleteMany({
    where: {
      mode,
      status: DraftStatus.PENDING
    }
  });

  return prisma.draft.create({
    data: {
      mode,
      status: DraftStatus.PENDING,
      teamAAvgMmr: matchup.teamAAvgMmr,
      teamBAvgMmr: matchup.teamBAvgMmr,
      teamAProbability: matchup.teamAProbability,
      teamBProbability: matchup.teamBProbability,
      players: {
        create: buildDraftPlayers(matchup)
      }
    },
    include: {
      players: {
        include: { player: true },
        orderBy: [{ team: "asc" }, { position: "asc" }]
      }
    }
  });
}

export async function getLatestPendingDraft(mode) {
  return prisma.draft.findFirst({
    where: {
      mode,
      status: DraftStatus.PENDING
    },
    orderBy: { createdAt: "desc" },
    include: {
      players: {
        include: { player: true },
        orderBy: [{ team: "asc" }, { position: "asc" }]
      }
    }
  });
}

export async function completeDraft(draftId, winner) {
  return prisma.draft.update({
    where: { id: draftId },
    data: {
      status: DraftStatus.COMPLETED,
      winner,
      completedAt: new Date()
    }
  });
}

export async function getDraftById(draftId) {
  return prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      players: {
        include: { player: true },
        orderBy: [{ team: "asc" }, { position: "asc" }]
      }
    }
  });
}

export async function createRematchDraftFromPlayers(mode, teamAPlayers, teamBPlayers) {
  const teamAAvgMmr = averageMmr(teamAPlayers);
  const teamBAvgMmr = averageMmr(teamBPlayers);
  const teamAProbability = getExpectedWinChance(teamAAvgMmr, teamBAvgMmr);
  const teamBProbability = Number((1 - teamAProbability).toFixed(4));

  return replacePendingDraft(mode, {
    teamA: teamAPlayers,
    teamB: teamBPlayers,
    teamAAvgMmr,
    teamBAvgMmr,
    teamAProbability,
    teamBProbability
  });
}
