import { DraftMode } from "@prisma/client";
import {
  clearArenaRegistrations,
  getArenaPlayers
} from "../data/arenaRegistrationStore.js";
import { getManualHealerUserIds } from "../data/manualHealerStore.js";
import { getManualTankUserIds } from "../data/manualTankStore.js";
import { getPlayerById } from "../data/playerStore.js";
import { getScrimSettings } from "../data/scrimConfigStore.js";
import {
  createRematchDraftFromPlayers,
  completeDraft,
  getDraftById,
  replacePendingDraft
} from "../data/draftStore.js";
import { buildScrimTeams } from "./matchmakingService.js";
import { applyMatchResult } from "./ratingService.js";
import { enrichPlayersWithRoles } from "../utils/playerRoles.js";
import { removeHealerAuxRoleFromUserIds } from "../utils/healerAuxRole.js";
import { removeTankAuxRoleFromUserIds } from "../utils/tankAuxRole.js";

function mapDraftToMatchup(draft) {
  const teamA = draft.players
    .filter((draftPlayer) => draftPlayer.team === "A")
    .map((draftPlayer) => draftPlayer.player);
  const teamB = draft.players
    .filter((draftPlayer) => draftPlayer.team === "B")
    .map((draftPlayer) => draftPlayer.player);

  return {
    id: draft.id,
    teamA,
    teamB,
    teamAAvgMmr: draft.teamAAvgMmr,
    teamBAvgMmr: draft.teamBAvgMmr,
    teamAProbability: draft.teamAProbability,
    teamBProbability: draft.teamBProbability
  };
}

export async function createScrimFight(guild = null) {
  const players = await getArenaPlayers();
  const playersWithRoles = await enrichPlayersWithRoles(players, guild);
  const matchup = buildScrimTeams(playersWithRoles, getScrimSettings());
  const draft = await replacePendingDraft(DraftMode.ARENA, matchup);
  return mapDraftToMatchup(draft);
}

export async function resolveScrimFight(draftId, winner, guild = null) {
  const draft = await getDraftById(draftId);

  if (!draft || draft.status !== "PENDING") {
    return null;
  }

  const matchup = mapDraftToMatchup(draft);
  const changes = await applyMatchResult(matchup, winner);
  const manualHealerUserIds = getManualHealerUserIds();
  const manualTankUserIds = getManualTankUserIds();

  if (guild && manualHealerUserIds.length > 0) {
    await removeHealerAuxRoleFromUserIds(guild, manualHealerUserIds);
  }

  if (guild && manualTankUserIds.length > 0) {
    await removeTankAuxRoleFromUserIds(guild, manualTankUserIds);
  }

  await completeDraft(draft.id, winner === "DRAW" ? null : winner);
  await clearArenaRegistrations();

  return {
    matchup,
    winner,
    changes
  };
}

export async function createScrimRematch(draftId) {
  const draft = await getDraftById(draftId);

  if (!draft) {
    return null;
  }

  const originalMatchup = mapDraftToMatchup(draft);
  const refreshedTeamA = await Promise.all(
    originalMatchup.teamA.map((player) =>
      getArenaPlayerSnapshot(player.id)
    )
  );
  const refreshedTeamB = await Promise.all(
    originalMatchup.teamB.map((player) =>
      getArenaPlayerSnapshot(player.id)
    )
  );

  if (
    refreshedTeamA.some((player) => !player) ||
    refreshedTeamB.some((player) => !player)
  ) {
    return null;
  }

  const rematchDraft = await createRematchDraftFromPlayers(
    DraftMode.ARENA,
    refreshedTeamA,
    refreshedTeamB
  );

  return mapDraftToMatchup(rematchDraft);
}

async function getArenaPlayerSnapshot(playerId) {
  return getPlayerById(playerId);
}
