import { PLAYER_ROLES } from "../constants/playerRoles.js";
import { hasPlayerRole } from "../utils/playerRoles.js";

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

function buildMatchup(teamA, teamB) {
  const teamAAvgMmr = averageMmr(teamA);
  const teamBAvgMmr = averageMmr(teamB);
  const teamAProbability = getExpectedWinChance(teamAAvgMmr, teamBAvgMmr);
  const teamBProbability = Number((1 - teamAProbability).toFixed(4));

  return {
    teamA,
    teamB,
    teamAAvgMmr,
    teamBAvgMmr,
    teamAProbability,
    teamBProbability
  };
}

function createTeamState() {
  return {
    players: [],
    totalMmr: 0
  };
}

function assignPlayer(team, player) {
  team.players.push(player);
  team.totalMmr += player.mmr;
}

function chooseBalancedTeam(teamA, teamB, maxPlayersPerTeam) {
  if (teamA.players.length >= maxPlayersPerTeam) {
    return teamB;
  }

  if (teamB.players.length >= maxPlayersPerTeam) {
    return teamA;
  }

  if (teamA.totalMmr !== teamB.totalMmr) {
    return teamA.totalMmr <= teamB.totalMmr ? teamA : teamB;
  }

  if (teamA.players.length !== teamB.players.length) {
    return teamA.players.length <= teamB.players.length ? teamA : teamB;
  }

  return teamA;
}

function fillRemainingPlayers(players) {
  const teamA = createTeamState();
  const teamB = createTeamState();
  const maxPlayersPerTeam = Math.ceil(players.length / 2);
  const sortedPlayers = [...players].sort((left, right) => right.mmr - left.mmr);

  for (const player of sortedPlayers) {
    const team = chooseBalancedTeam(teamA, teamB, maxPlayersPerTeam);
    assignPlayer(team, player);
  }

  return buildMatchup(teamA.players, teamB.players);
}

function isHealerPlayer(player) {
  return (
    player.isHealer ||
    (player.healerPriority || 0) > 0 ||
    player.manualHealer === true ||
    hasPlayerRole(player, PLAYER_ROLES.healer) ||
    hasPlayerRole(player, PLAYER_ROLES.mainHealer) ||
    hasPlayerRole(player, PLAYER_ROLES.healerAuxiliar)
  );
}

function sortHealerCandidates(left, right) {
  if ((left.healerPriority || 0) !== (right.healerPriority || 0)) {
    return (right.healerPriority || 0) - (left.healerPriority || 0);
  }

  if ((left.mmr || 0) !== (right.mmr || 0)) {
    return (right.mmr || 0) - (left.mmr || 0);
  }

  if ((left.victorias || 0) !== (right.victorias || 0)) {
    return (right.victorias || 0) - (left.victorias || 0);
  }

  return (left.username || "").localeCompare(right.username || "");
}

function countNewPlayers(team) {
  return team.filter((player) => (player.partidas || 0) === 0).length;
}

function calculateTeamScore(team) {
  return team.reduce((total, player) => {
    const confidence = Math.min((player.partidas || 0) / 10, 1);
    const weight = Math.max(confidence, 0.3);
    return total + player.mmr * weight;
  }, 0);
}

function getCombinations(players, size, startIndex = 0, current = [], combinations = []) {
  if (current.length === size) {
    combinations.push([...current]);
    return combinations;
  }

  for (let index = startIndex; index <= players.length - (size - current.length); index += 1) {
    current.push(players[index]);
    getCombinations(players, size, index + 1, current, combinations);
    current.pop();
  }

  return combinations;
}

function createPlayerIdSet(players) {
  return new Set(players.map((player) => player.id));
}

function buildRemainingPlayers(allPlayers, selectedPlayers) {
  const selectedIds = createPlayerIdSet(selectedPlayers);
  return allPlayers.filter((player) => !selectedIds.has(player.id));
}

function selectHealersAndOthers(players) {
  const healerCandidates = players.filter(isHealerPlayer);

  if (healerCandidates.length < 2) {
    throw new Error(
      healerCandidates.length === 0
        ? "No hay jugadores con rol `Main Healer`, `Healer` o `Healer-Auxiliar`. Pidele a alguien que pulse el boton `Soy healer` para registrarse como healer."
        : "Solo hay 1 healer disponible. Pidele a alguien que pulse el boton `Soy healer` para completar el healer restante."
    );
  }

  const selectedHealers =
    healerCandidates.length > 2
      ? [...healerCandidates].sort(sortHealerCandidates).slice(0, 2)
      : healerCandidates;
  const others = buildRemainingPlayers(players, selectedHealers);

  return {
    healers: selectedHealers,
    others
  };
}

function createBalancedTeamsFromHealers(healerA, healerB, otherPlayers) {
  const extraPlayersPerTeam = (otherPlayers.length / 2);

  if (!Number.isInteger(extraPlayersPerTeam)) {
    return null;
  }

  const combinations = getCombinations(otherPlayers, extraPlayersPerTeam);
  let bestResult = null;
  let lowestError = Number.POSITIVE_INFINITY;

  for (const groupAExtra of combinations) {
    const groupBExtra = buildRemainingPlayers(otherPlayers, groupAExtra);
    const teamA = [healerA, ...groupAExtra];
    const teamB = [healerB, ...groupBExtra];
    const scoreA = calculateTeamScore(teamA);
    const scoreB = calculateTeamScore(teamB);
    const scoreDifference = Math.abs(scoreA - scoreB);
    const healerDifference = Math.abs((healerA.mmr || 0) - (healerB.mmr || 0));
    const newPlayersPenalty =
      Math.abs(countNewPlayers(teamA) - countNewPlayers(teamB)) * 50;
    const totalError = scoreDifference + healerDifference + newPlayersPenalty;

    if (totalError < lowestError) {
      lowestError = totalError;
      bestResult = {
        teamA,
        teamB
      };
    }
  }

  return bestResult;
}

function calculateTotalError(teamA, teamB, healerA, healerB) {
  const scoreDifference = Math.abs(
    calculateTeamScore(teamA) - calculateTeamScore(teamB)
  );
  const healerDifference = Math.abs((healerA.mmr || 0) - (healerB.mmr || 0));
  const newPlayersPenalty =
    Math.abs(countNewPlayers(teamA) - countNewPlayers(teamB)) * 50;

  return scoreDifference + healerDifference + newPlayersPenalty;
}

function buildBalancedTeamsWithHealers(players) {
  const { healers, others } = selectHealersAndOthers(players);

  if (players.length !== 10) {
    throw new Error("La scrim necesita exactamente 10 jugadores.");
  }

  if (others.length !== 8) {
    throw new Error("Se requieren exactamente 8 jugadores no healer para balancear la scrim.");
  }

  const directResult = createBalancedTeamsFromHealers(healers[0], healers[1], others);
  const swappedResult = createBalancedTeamsFromHealers(healers[1], healers[0], others);
  const selectedResult = directResult || swappedResult;

  if (!selectedResult) {
    throw new Error("No pude generar equipos balanceados con la composicion actual.");
  }

  const selectedError = calculateTotalError(
    selectedResult.teamA,
    selectedResult.teamB,
    selectedResult.teamA[0],
    selectedResult.teamB[0]
  );
  const swappedError = swappedResult
    ? calculateTotalError(
        swappedResult.teamA,
        swappedResult.teamB,
        swappedResult.teamA[0],
        swappedResult.teamB[0]
      )
    : Number.POSITIVE_INFINITY;

  if (swappedError < selectedError) {
    return buildMatchup(swappedResult.teamA, swappedResult.teamB);
  }

  return buildMatchup(selectedResult.teamA, selectedResult.teamB);
}

export function buildBalancedTeams(players) {
  try {
    return buildBalancedTeamsWithHealers(players);
  } catch {
    return fillRemainingPlayers(players);
  }
}

export function buildScrimTeams(players, settings) {
  if (settings.maxPlayers !== 10) {
    return fillRemainingPlayers(players);
  }

  return buildBalancedTeamsWithHealers(players);
}
