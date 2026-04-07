import { SCRIM_FORMATS } from "../data/scrimConfigStore.js";
import { PLAYER_ROLES } from "../constants/playerRoles.js";
import { hasPlayerRole, normalizeRoleName } from "../utils/playerRoles.js";

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

function sortRoleCandidates(left, right) {
  if (left.roleCount !== right.roleCount) {
    return left.roleCount - right.roleCount;
  }

  if (left.mmr !== right.mmr) {
    return right.mmr - left.mmr;
  }

  return left.username.localeCompare(right.username);
}

function sortHealerCandidates(left, right) {
  if ((left.healerPriority || 0) !== (right.healerPriority || 0)) {
    return (right.healerPriority || 0) - (left.healerPriority || 0);
  }

  return sortRoleCandidates(left, right);
}

function sortTankCandidates(left, right) {
  if ((left.tankPriority || 0) !== (right.tankPriority || 0)) {
    return (right.tankPriority || 0) - (left.tankPriority || 0);
  }

  return sortRoleCandidates(left, right);
}

function getRoleCandidates(players, roleName) {
  return players.filter((player) =>
    normalizeRoleName(roleName) === normalizeRoleName(PLAYER_ROLES.healer)
      ? (player.healerPriority || 0) > 0
      : normalizeRoleName(roleName) === normalizeRoleName(PLAYER_ROLES.tank)
        ? (player.tankPriority || 0) > 0
        : hasPlayerRole(player, roleName)
  );
}

function sortRequiredRolesByAvailability(requiredRoles, availablePlayers) {
  return [...requiredRoles].sort((left, right) => {
    const leftCandidates = getRoleCandidates(availablePlayers, left);
    const rightCandidates = getRoleCandidates(availablePlayers, right);

    if (leftCandidates.length !== rightCandidates.length) {
      return leftCandidates.length - rightCandidates.length;
    }

    const leftFlexScore = leftCandidates.reduce(
      (sum, player) => sum + (player.roleCount || 0),
      0
    );
    const rightFlexScore = rightCandidates.reduce(
      (sum, player) => sum + (player.roleCount || 0),
      0
    );

    if (leftFlexScore !== rightFlexScore) {
      return leftFlexScore - rightFlexScore;
    }

    return left.localeCompare(right);
  });
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

function buildMatchup(teamA, teamB) {
  const teamAAvgMmr = averageMmr(teamA.players);
  const teamBAvgMmr = averageMmr(teamB.players);
  const teamAProbability = getExpectedWinChance(teamAAvgMmr, teamBAvgMmr);
  const teamBProbability = Number((1 - teamAProbability).toFixed(4));

  return {
    teamA: teamA.players,
    teamB: teamB.players,
    teamAAvgMmr,
    teamBAvgMmr,
    teamAProbability,
    teamBProbability
  };
}

function getRequiredRoles(format) {
  if (format === SCRIM_FORMATS.meta) {
    return [
      PLAYER_ROLES.healer,
      PLAYER_ROLES.tank,
      PLAYER_ROLES.rdps,
      PLAYER_ROLES.dps,
      PLAYER_ROLES.debuffer
    ];
  }

  if (format === SCRIM_FORMATS.libre) {
    return [PLAYER_ROLES.healer];
  }

  return [PLAYER_ROLES.healer, PLAYER_ROLES.tank];
}

function validatePlayerCount(players, maxPlayers, format) {
  if (players.length !== maxPlayers) {
    throw new Error(`La scrim necesita exactamente ${maxPlayers} jugadores.`);
  }

  if (players.length % 2 !== 0) {
    throw new Error("La scrim necesita un numero par de jugadores.");
  }

  if (format === SCRIM_FORMATS.meta && players.length !== 10) {
    throw new Error("El modo meta necesita exactamente 10 jugadores.");
  }
}

function getRoleShortageError(roleName, players, requiredCount) {
  const candidates = getRoleCandidates(players, roleName);
  const missingCount = requiredCount - candidates.length;

  if (normalizeRoleName(roleName) === normalizeRoleName(PLAYER_ROLES.healer)) {
    if (candidates.length === 0) {
      return "No hay jugadores con rol `Main Healer`, `Healer` o `Healer-Auxiliar`. Pidele a alguien que pulse el boton `Soy healer` para registrarse como healer.";
    }

    if (candidates.length === 1) {
      return "Solo hay 1 healer disponible. Pidele a alguien que pulse el boton `Soy healer` para completar el healer restante.";
    }

    return missingCount === 1
      ? "Falta 1 healer. Pidele a alguien que pulse el boton `Soy healer` para completar el healer restante."
      : `Faltan ${missingCount} healers. Pidele a jugadores que pulsen el boton \`Soy healer\` para completar los healers restantes.`;
  }

  if (normalizeRoleName(roleName) === normalizeRoleName(PLAYER_ROLES.tank)) {
    if (candidates.length === 0) {
      return "No hay jugadores con rol `Tank` o `Tank-Auxiliar`. Pidele a alguien que pulse el boton `Soy tank` para registrarse como tank.";
    }

    if (candidates.length === 1) {
      return "Solo hay 1 tank disponible. Pidele a alguien que pulse el boton `Soy tank` para completar el tank restante.";
    }

    return missingCount === 1
      ? "Falta 1 tank. Pidele a alguien que pulse el boton `Soy tank` para completar el tank restante."
      : `Faltan ${missingCount} tanks. Pidele a jugadores que pulsen el boton \`Soy tank\` para completar los tanks restantes.`;
  }

  return `Se necesitan al menos ${requiredCount} jugadores con el rol \`${roleName}\` para esta scrim.`;
}

function reserveRequiredRole(roleName, availablePlayers, teamA, teamB, maxPlayersPerTeam) {
  const candidates = getRoleCandidates(availablePlayers, roleName)
    .sort(
      normalizeRoleName(roleName) === normalizeRoleName(PLAYER_ROLES.healer)
        ? sortHealerCandidates
        : normalizeRoleName(roleName) === normalizeRoleName(PLAYER_ROLES.tank)
          ? sortTankCandidates
          : sortRoleCandidates
    );

  if (candidates.length < 2) {
    return false;
  }

  const firstChoice = candidates[0];
  const secondChoice = candidates[1];
  const strongerPlayer =
    firstChoice.mmr >= secondChoice.mmr ? firstChoice : secondChoice;
  const weakerPlayer = strongerPlayer.id === firstChoice.id ? secondChoice : firstChoice;
  const firstTeam = chooseBalancedTeam(teamA, teamB, maxPlayersPerTeam);
  const secondTeam = firstTeam === teamA ? teamB : teamA;

  assignPlayer(firstTeam, strongerPlayer);
  assignPlayer(secondTeam, weakerPlayer);

  return availablePlayers.filter(
    (player) => player.id !== strongerPlayer.id && player.id !== weakerPlayer.id
  );
}

function fillRemainingPlayers(availablePlayers, teamA, teamB, maxPlayersPerTeam) {
  const sortedPlayers = [...availablePlayers].sort((left, right) => right.mmr - left.mmr);

  for (const player of sortedPlayers) {
    const team = chooseBalancedTeam(teamA, teamB, maxPlayersPerTeam);
    assignPlayer(team, player);
  }
}

export function buildBalancedTeams(players) {
  const teamA = createTeamState();
  const teamB = createTeamState();
  const maxPlayersPerTeam = Math.ceil(players.length / 2);
  fillRemainingPlayers(players, teamA, teamB, maxPlayersPerTeam);
  return buildMatchup(teamA, teamB);
}

export function buildScrimTeams(players, settings) {
  validatePlayerCount(players, settings.maxPlayers, settings.format);

  const maxPlayersPerTeam = settings.maxPlayers / 2;
  const teamA = createTeamState();
  const teamB = createTeamState();
  let availablePlayers = [...players];
  const remainingRequiredRoles = [...getRequiredRoles(settings.format)];

  while (remainingRequiredRoles.length > 0) {
    const [roleName] = sortRequiredRolesByAvailability(
      remainingRequiredRoles,
      availablePlayers
    );
    const remainingPlayers = reserveRequiredRole(
      roleName,
      availablePlayers,
      teamA,
      teamB,
      maxPlayersPerTeam
    );

    if (!remainingPlayers) {
      throw new Error(getRoleShortageError(roleName, availablePlayers, 2));
    }

    availablePlayers = remainingPlayers;
    const roleIndex = remainingRequiredRoles.indexOf(roleName);

    if (roleIndex >= 0) {
      remainingRequiredRoles.splice(roleIndex, 1);
    }
  }

  fillRemainingPlayers(availablePlayers, teamA, teamB, maxPlayersPerTeam);
  return buildMatchup(teamA, teamB);
}
