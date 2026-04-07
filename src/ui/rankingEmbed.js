import { EmbedBuilder } from "discord.js";
import { formatPlayerLabel, getWinrate } from "./playerFormatting.js";

export async function buildRankingEmbed(players, guild = null) {
  if (players.length === 0) {
    return new EmbedBuilder()
      .setTitle("Ranking general")
      .setDescription("No hay jugadores registrados todavia.")
      .setColor(0xc92a2a);
  }

  const lines = await Promise.all(
    players.map(async (player, index) => {
      return `${index + 1}. ${await formatPlayerLabel(player, guild)}  Pt: **${player.mmr}**,  Wins: ${player.victorias}, Winrate:${getWinrate(player)}%`;
    })
  );

  return new EmbedBuilder()
    .setTitle("Ranking general por MMR")
    .setDescription(lines.join("\n").slice(0, 4096))
    .setColor(0xf08c00);
}
