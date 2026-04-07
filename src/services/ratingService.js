import { updatePlayersAfterMatch } from "../data/playerStore.js";

function calculateExpectedScore(ownAverage, enemyAverage) {
  return 1 / (1 + Math.pow(10, (enemyAverage - ownAverage) / 400));
}

function calculateGainByExpectation(expectedScore) {
  const kFactor = 40;
  const baseWinBonus = 4;
  return Math.round(kFactor * (1 - expectedScore)) + baseWinBonus;
}

function calculateLossByExpectation(expectedScore) {
  const kFactor = 32;
  return Math.round(kFactor * expectedScore);
}

function getTeamRole(teamAExpected, teamBExpected) {
  if (teamAExpected === teamBExpected) {
    return {
      favorite: null,
      underdog: null
    };
  }

  return teamAExpected > teamBExpected
    ? { favorite: "A", underdog: "B" }
    : { favorite: "B", underdog: "A" };
}

export async function applyMatchResult(matchup, winner) {
  if (winner === "DRAW") {
    return {
      teamAChange: 0,
      teamBChange: 0
    };
  }

  const teamAExpected = calculateExpectedScore(
    matchup.teamAAvgMmr,
    matchup.teamBAvgMmr
  );
  const teamBExpected = calculateExpectedScore(
    matchup.teamBAvgMmr,
    matchup.teamAAvgMmr
  );
  const roles = getTeamRole(teamAExpected, teamBExpected);
  const teamAWon = winner === "A";
  let teamAChange = teamAWon
    ? calculateGainByExpectation(teamAExpected)
    : -calculateLossByExpectation(teamAExpected);
  let teamBChange = teamAWon
    ? -calculateLossByExpectation(teamBExpected)
    : calculateGainByExpectation(teamBExpected);

  if (roles.favorite === "A" && teamAWon) {
    teamAChange += 2;
  }

  if (roles.favorite === "B" && !teamAWon) {
    teamBChange += 2;
  }

  if (roles.favorite === "A" && !teamAWon) {
    teamAChange -= 5;
  }

  if (roles.favorite === "B" && teamAWon) {
    teamBChange -= 5;
  }

  if (roles.underdog === "A" && teamAWon) {
    teamAChange += 6;
  }

  if (roles.underdog === "B" && !teamAWon) {
    teamBChange += 6;
  }

  await updatePlayersAfterMatch(matchup.teamA, teamAChange, teamAWon);
  await updatePlayersAfterMatch(matchup.teamB, teamBChange, !teamAWon);

  return {
    teamAChange,
    teamBChange
  };
}
