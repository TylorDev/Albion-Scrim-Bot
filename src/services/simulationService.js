import { DraftMode } from "@prisma/client";
import {
  clearArenaRegistrations,
  getArenaPlayers
} from "../data/arenaRegistrationStore.js";
import {
  completeDraft,
  getLatestPendingDraft,
  replacePendingDraft
} from "../data/draftStore.js";
import { getRandomFakePlayers } from "../data/playerStore.js";
import { buildBalancedTeams } from "./matchmakingService.js";
import { applyMatchResult, resolveWinnerByProbability } from "./ratingService.js";

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

export async function createFakeSimulationDraft() {
  const players = await getRandomFakePlayers(10);
  const matchup = buildBalancedTeams(players);
  const draft = await replacePendingDraft(DraftMode.SIMULATED, matchup);

  return mapDraftToMatchup(draft);
}

export async function getOrCreateFakeSimulationDraft() {
  const existingDraft = await getLatestPendingDraft(DraftMode.SIMULATED);

  if (existingDraft) {
    return mapDraftToMatchup(existingDraft);
  }

  return createFakeSimulationDraft();
}

export async function startFakeSimulation() {
  const draft = await getOrCreateFakeSimulationDraft();
  const winner = resolveWinnerByProbability(draft);
  const changes = await applyMatchResult(draft, winner);

  if (draft.id) {
    await completeDraft(draft.id, winner);
  }

  return {
    matchup: draft,
    winner,
    changes
  };
}

export async function previewArenaMatch() {
  const players = await getArenaPlayers();

  if (players.length === 0) {
    return null;
  }

  return buildBalancedTeams(players);
}

export async function startArenaSimulation() {
  const players = await getArenaPlayers();

  if (players.length < 2) {
    return null;
  }

  const matchup = buildBalancedTeams(players);
  const draft = await replacePendingDraft(DraftMode.ARENA, matchup);
  const mappedDraft = mapDraftToMatchup(draft);
  const winner = resolveWinnerByProbability(mappedDraft);
  const changes = await applyMatchResult(mappedDraft, winner);

  await completeDraft(draft.id, winner);
  await clearArenaRegistrations();

  return {
    matchup: mappedDraft,
    winner,
    changes
  };
}
