import { COMMANDS } from "../../constants/commands.js";
import { seedFakePlayers } from "../../database/ensureSeedData.js";
import {
  loadFakeScrim,
  startEmptyScrim
} from "../../data/arenaRegistrationStore.js";
import {
  DEFAULT_SCRIM_SETTINGS,
  SCRIM_FAKE_PRESETS,
  SCRIM_FORMATS
} from "../../data/scrimConfigStore.js";
import { getManualHealerUserIds } from "../../data/manualHealerStore.js";
import { getManualTankUserIds } from "../../data/manualTankStore.js";
import {
  deleteFakePlayers,
  getRankingPlayers,
  resetAllPlayerMmr
} from "../../data/playerStore.js";
import { createScrimFight } from "../../services/scrimService.js";
import { buildMatchPreviewEmbed } from "../../ui/matchEmbeds.js";
import { buildRankingEmbed } from "../../ui/rankingEmbed.js";
import { buildRegisterPanel } from "../../ui/registerPanel.js";
import { buildResultButtons } from "../../ui/resultButtons.js";
import { removeHealerAuxRoleFromUserIds } from "../../utils/healerAuxRole.js";
import { removeTankAuxRoleFromUserIds } from "../../utils/tankAuxRole.js";
import { isSystem32Member } from "../../utils/roleChecks.js";

async function assertSystem32(interaction) {
  if (isSystem32Member(interaction.member)) {
    return true;
  }

  await interaction.reply({
    content: "Solo un jugador con el rol `system32` puede usar ese comando.",
    ephemeral: true
  });

  return false;
}

function getScrimOptions(interaction) {
  const format =
    interaction.options.getString("modo") || DEFAULT_SCRIM_SETTINGS.format;
  const maxPlayers =
    interaction.options.getInteger("numero") || DEFAULT_SCRIM_SETTINGS.maxPlayers;

  return {
    format,
    maxPlayers
  };
}

function validateScrimOptions({ format, maxPlayers }) {
  if (maxPlayers % 2 !== 0) {
    return "El parametro `numero` debe ser un numero par.";
  }

  if (format === SCRIM_FORMATS.meta && maxPlayers !== 10) {
    return "El modo `meta` siempre necesita exactamente 10 jugadores.";
  }

  return null;
}

function getFakeScrimPreset(interaction) {
  return interaction.options.getString("modo") || SCRIM_FAKE_PRESETS.default;
}

export async function handleChatInputCommand(interaction) {
  if (interaction.commandName === COMMANDS.scrim) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    const settings = getScrimOptions(interaction);
    const validationError = validateScrimOptions(settings);

    if (validationError) {
      await interaction.reply({
        content: validationError,
        ephemeral: true
      });
      return;
    }

    await removeHealerAuxRoleFromUserIds(
      interaction.guild,
      getManualHealerUserIds()
    );
    await removeTankAuxRoleFromUserIds(
      interaction.guild,
      getManualTankUserIds()
    );
    await startEmptyScrim(settings);
    await interaction.reply({
      content: `Panel de scrim publicado. Modo: \`${settings.format}\` | Cupo: \`${settings.maxPlayers}\` jugadores.`,
      ephemeral: true
    });
    await interaction.channel.send(await buildRegisterPanel("real", interaction.guild));
    return;
  }

  if (interaction.commandName === COMMANDS.scrimfake) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    const preset = getFakeScrimPreset(interaction);
    await removeHealerAuxRoleFromUserIds(
      interaction.guild,
      getManualHealerUserIds()
    );
    await removeTankAuxRoleFromUserIds(
      interaction.guild,
      getManualTankUserIds()
    );
    await loadFakeScrim(preset);
    await interaction.reply({
      content: `Panel de scrim fake publicado. Preset: \`${preset}\`.`,
      ephemeral: true
    });
    await interaction.channel.send(await buildRegisterPanel("fake", interaction.guild));
    return;
  }

  if (interaction.commandName === COMMANDS.pelea) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    try {
      const matchup = await createScrimFight(interaction.guild);

      await interaction.reply({
        embeds: [await buildMatchPreviewEmbed("Pelea", matchup, interaction.guild)],
        components: buildResultButtons(matchup.id)
      });
    } catch (error) {
      await interaction.reply({
        content: error.message,
        ephemeral: true
      });
    }

    return;
  }

  if (interaction.commandName === COMMANDS.ranking) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    await interaction.deferReply();
    const players = await getRankingPlayers(100);

    await interaction.editReply({
      embeds: [await buildRankingEmbed(players, interaction.guild)]
    });
    return;
  }

  if (interaction.commandName === COMMANDS.resetranks) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    const updatedCount = await resetAllPlayerMmr(1000);

    await interaction.reply({
      content: `Se restablecio el MMR de ${updatedCount} jugadores a 1000.`,
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === COMMANDS.resetearbd) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    const deletedCount = await deleteFakePlayers();

    await interaction.reply({
      content: `Se eliminaron ${deletedCount} jugadores fake de la base de datos.`,
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === COMMANDS.test) {
    if (!(await assertSystem32(interaction))) {
      return;
    }

    const insertedCount = await seedFakePlayers(20);

    await interaction.reply({
      content: `Se insertaron ${insertedCount} jugadores fake de prueba en la base de datos.`,
      ephemeral: true
    });
  }
}
