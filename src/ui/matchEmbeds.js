import { EmbedBuilder } from "discord.js";
import {
  formatPlayerLabel,
  formatProbability
} from "./playerFormatting.js";

async function buildTeamLines(players, guild) {
  if (players.length === 0) {
    return "Sin jugadores.";
  }

  const lines = await Promise.all(
    players.map(async (player, index) => {
      return `${index + 1}. ${await formatPlayerLabel(player, guild)} | MMR **${player.mmr}**`;
    })
  );

  return lines.join("\n\n").slice(0, 1024);
}

async function buildResultPlayers(players, mmrChange, guild) {
  const lines = await Promise.all(
    players.map(async (player) => {
      return `${await formatPlayerLabel(player, guild)} (${mmrChange >= 0 ? "+" : ""}**${mmrChange}** MMR)`;
    })
  );

  return lines.join("\n").slice(0, 1024);
}

export async function buildMatchPreviewEmbed(title, matchup, guild = null) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(0x1c7ed6)
    .addFields(
      {
        name: `Equipo 1 | Promedio ${matchup.teamAAvgMmr} | Victoria ${formatProbability(matchup.teamAProbability)}`,
        value: await buildTeamLines(matchup.teamA, guild)
      },
      {
        name: `Equipo 2 | Promedio ${matchup.teamBAvgMmr} | Victoria ${formatProbability(matchup.teamBProbability)}`,
        value: await buildTeamLines(matchup.teamB, guild)
      }
    );
}

export async function buildSimulationResultEmbed(title, simulationResult, guild = null) {
  const winnerLabel =
    simulationResult.winner === "DRAW"
      ? "Empate"
      : simulationResult.winner === "A"
        ? "Equipo 1"
        : "Equipo 2";

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`Ganador: **${winnerLabel}**`)
    .setColor(
      simulationResult.winner === "DRAW"
        ? 0xf08c00
        : simulationResult.winner === "A"
          ? 0x2b8a3e
          : 0xe03131
    )
    .addFields(
      {
        name: simulationResult.winner === "DRAW"
          ? "Equipo 1 | 0 MMR"
          : `Ganadores | ${simulationResult.winner === "A" ? `+${simulationResult.changes.teamAChange}` : `+${simulationResult.changes.teamBChange}`} MMR`,
        value: await buildResultPlayers(
          simulationResult.winner === "DRAW"
            ? simulationResult.matchup.teamA
            : simulationResult.winner === "A"
            ? simulationResult.matchup.teamA
            : simulationResult.matchup.teamB,
          simulationResult.winner === "DRAW"
            ? 0
            : simulationResult.winner === "A"
            ? simulationResult.changes.teamAChange
            : simulationResult.changes.teamBChange,
          guild
        )
      },
      {
        name: simulationResult.winner === "DRAW"
          ? "Equipo 2 | 0 MMR"
          : `Perdedores | ${simulationResult.winner === "A" ? simulationResult.changes.teamBChange : simulationResult.changes.teamAChange} MMR`,
        value: await buildResultPlayers(
          simulationResult.winner === "DRAW"
            ? simulationResult.matchup.teamB
            : simulationResult.winner === "A"
            ? simulationResult.matchup.teamB
            : simulationResult.matchup.teamA,
          simulationResult.winner === "DRAW"
            ? 0
            : simulationResult.winner === "A"
            ? simulationResult.changes.teamBChange
            : simulationResult.changes.teamAChange,
          guild
        )
      }
    );
}
