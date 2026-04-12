import { PermissionFlagsBits } from "discord.js";
import { BUTTON_IDS } from "../../constants/customIds.js";
import {
  COMMUNITY_REGISTRATION_ROLE_ORDER
} from "../../constants/communityRegistrationRoles.js";
import {
  clearArenaRegistrations,
  registerArenaMember,
  removeArenaRegistrationByUserId,
  toggleSelfHealerRegistration,
  toggleSelfTankRegistration
} from "../../data/arenaRegistrationStore.js";
import {
  getScrimSettings,
  setScrimSettings
} from "../../data/scrimConfigStore.js";
import {
  createScrimRematch,
  createScrimFight,
  resolveScrimFight
} from "../../services/scrimService.js";
import {
  buildMatchPreviewEmbed,
  buildSimulationResultEmbed
} from "../../ui/matchEmbeds.js";
import {
  buildClosedRegisterPanel,
  buildRegisterPanel
} from "../../ui/registerPanel.js";
import { buildResultButtons } from "../../ui/resultButtons.js";
import {
  assignHealerAuxRole,
  removeHealerAuxRoleFromMember,
  removeHealerAuxRoleFromUserIds
} from "../../utils/healerAuxRole.js";
import {
  assignTankAuxRole,
  removeTankAuxRoleFromMember,
  removeTankAuxRoleFromUserIds
} from "../../utils/tankAuxRole.js";
import { isSystem32Member } from "../../utils/roleChecks.js";
import {
  getManualHealerUserIds,
  isManualHealerUser
} from "../../data/manualHealerStore.js";
import {
  getManualTankUserIds,
  isManualTankUser
} from "../../data/manualTankStore.js";
import {
  closeCommunityRegistrationBoard,
  createCommunityRegistrationBatch,
  createCommunityRegistrationEntry,
  deleteCommunityRegistrationEntry,
  getCommunityRegistrationBoard,
  getCommunityRegistrationEntry,
  getCommunityRegistrationEntryByUserId,
  getFirstOpenBatch,
  updateCommunityRegistrationEntry
} from "../../data/communityRegistrationStore.js";
import { buildCommunityRegistrationPanel } from "../../ui/communityRegistrationPanel.js";
import {
  assignCommunityRole,
  removeAllCommunityRoles
} from "../../utils/communityRegistrationRoles.js";

function getPanelModeFromMessage(interaction) {
  const title = interaction.message.embeds?.[0]?.title?.toLowerCase() || "";
  return title.includes("fake") ? "fake" : "real";
}

function isAdminResolver(interaction) {
  return (
    isSystem32Member(interaction.member) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.member.roles.cache.some((role) =>
      role.name.toLowerCase().includes("admin")
    )
  );
}

function parseResultButton(customId) {
  const [prefix, draftId, winner] = customId.split(":");

  if (prefix !== BUTTON_IDS.resultPrefix || !draftId || !winner) {
    return null;
  }

  return {
    draftId: Number(draftId),
    winner
  };
}

function parseRematchButton(customId) {
  const [prefix, draftId] = customId.split(":");

  if (prefix !== BUTTON_IDS.rematchPrefix || !draftId) {
    return null;
  }

  return {
    draftId: Number(draftId)
  };
}

function parseCommunityButton(customId) {
  const [prefix, boardId] = customId.split(":");

  if (!prefix || !boardId) {
    return null;
  }

  const allowedPrefixes = [
    BUTTON_IDS.communityRegisterPrefix,
    BUTTON_IDS.communityArenaPrefix,
    BUTTON_IDS.communityScrimPrefix,
    BUTTON_IDS.communityCrystalPrefix,
    BUTTON_IDS.communityCrystal20Prefix,
    BUTTON_IDS.communityCancelPrefix,
    BUTTON_IDS.communityClosePrefix
  ];

  if (!allowedPrefixes.includes(prefix)) {
    return null;
  }

  return {
    prefix,
    boardId: Number(boardId)
  };
}

function getCommunityRoleKeyByPrefix(prefix) {
  if (prefix === BUTTON_IDS.communityArenaPrefix) {
    return "arena";
  }

  if (prefix === BUTTON_IDS.communityScrimPrefix) {
    return "scrim";
  }

  if (prefix === BUTTON_IDS.communityCrystalPrefix) {
    return "crystalLeague";
  }

  if (prefix === BUTTON_IDS.communityCrystal20Prefix) {
    return "crystal20v20";
  }

  return null;
}

async function buildCommunityBoardMessage(interaction, boardId, batchNumber) {
  const board = await getCommunityRegistrationBoard(boardId);
  const entries = board.entries.filter((entry) => entry.batchNumber === batchNumber);

  return buildCommunityRegistrationPanel({
    boardId,
    batchNumber,
    isClosed: board.isClosed,
    entries,
    guild: interaction.guild
  });
}

async function refreshCommunityBoardMessages(interaction, boardId) {
  const board = await getCommunityRegistrationBoard(boardId);

  if (!board) {
    return;
  }

  for (const batch of board.batches) {
    const channel =
      interaction.channelId === batch.channelId
        ? interaction.channel
        : await interaction.guild.channels.fetch(batch.channelId).catch(() => null);

    if (!channel?.messages) {
      continue;
    }

    const message = await channel.messages.fetch(batch.messageId).catch(() => null);

    if (!message) {
      continue;
    }

    const entries = board.entries.filter((entry) => entry.batchNumber === batch.batchNumber);

    await message.edit(
      buildCommunityRegistrationPanel({
        boardId,
        batchNumber: batch.batchNumber,
        isClosed: board.isClosed,
        entries,
        guild: interaction.guild
      })
    );
  }
}

async function createNextCommunityBatchMessage(interaction, boardId) {
  const board = await getCommunityRegistrationBoard(boardId);
  const nextBatchNumber =
    board.batches.reduce((max, batch) => Math.max(max, batch.batchNumber), 0) + 1;
  const panel = buildCommunityRegistrationPanel({
    boardId,
    batchNumber: nextBatchNumber,
    isClosed: false,
    entries: [],
    guild: interaction.guild
  });
  const message = await interaction.channel.send(panel);

  await createCommunityRegistrationBatch({
    boardId,
    batchNumber: nextBatchNumber,
    channelId: interaction.channelId,
    messageId: message.id
  });

  return {
    batchNumber: nextBatchNumber,
    messageId: message.id
  };
}

async function enableAuxButtonsFromError(errorMessage, interaction) {
  const nextSettings = {};

  if (errorMessage.includes("`Soy healer`")) {
    nextSettings.allowAuxHealerSignup = true;
  }

  if (errorMessage.includes("`Soy tank`")) {
    nextSettings.allowAuxTankSignup = true;
  }

  if (Object.keys(nextSettings).length === 0) {
    return;
  }

  await setScrimSettings(nextSettings);

  if (interaction.message?.editable) {
    const panelMode = getPanelModeFromMessage(interaction);
    await interaction.message.edit(
      await buildRegisterPanel(panelMode, interaction.guild)
    );
  }
}

export async function handleButtonInteraction(interaction) {
  const communityButton = parseCommunityButton(interaction.customId);

  if (communityButton) {
    const board = await getCommunityRegistrationBoard(communityButton.boardId);

    if (!board) {
      await interaction.reply({
        content: "Ese registro ya no existe.",
        ephemeral: true
      });
      return;
    }

    if (
      communityButton.prefix === BUTTON_IDS.communityClosePrefix &&
      !isSystem32Member(interaction.member)
    ) {
      await interaction.reply({
        content: "Solo system32 puede cerrar este registro.",
        ephemeral: true
      });
      return;
    }

    if (board.isClosed) {
      await interaction.reply({
        content: "Este registro ya fue cerrado.",
        ephemeral: true
      });
      return;
    }

    if (communityButton.prefix === BUTTON_IDS.communityRegisterPrefix) {
      const existingEntry = await getCommunityRegistrationEntryByUserId(interaction.user.id);

      if (existingEntry) {
        await interaction.reply({
          content: "No puedes volver a registrarte porque tu usuario ya existe en la base de datos del registro.",
          ephemeral: true
        });
        return;
      }

      let openBatch = await getFirstOpenBatch(communityButton.boardId);

      if (!openBatch) {
        openBatch = await createNextCommunityBatchMessage(interaction, communityButton.boardId);
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);

      await createCommunityRegistrationEntry({
        boardId: communityButton.boardId,
        batchNumber: openBatch.batchNumber,
        userId: interaction.user.id,
        username: member.displayName || interaction.user.username
      });

      await refreshCommunityBoardMessages(interaction, communityButton.boardId);
      await interaction.reply({
        content: `Quedaste registrado en el bloque #${openBatch.batchNumber}.`,
        ephemeral: true
      });
      return;
    }

    if (communityButton.prefix === BUTTON_IDS.communityCancelPrefix) {
      const existingEntry = await getCommunityRegistrationEntry(
        communityButton.boardId,
        interaction.user.id
      );

      if (!existingEntry) {
        await interaction.reply({
          content: "No estabas registrado en esta lista.",
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

      if (member) {
        await removeAllCommunityRoles(member).catch(() => null);
      }

      await deleteCommunityRegistrationEntry(communityButton.boardId, interaction.user.id);
      await refreshCommunityBoardMessages(interaction, communityButton.boardId);
      await interaction.reply({
        content: "Tu registro fue cancelado y se quitaron tus roles seleccionados.",
        ephemeral: true
      });
      return;
    }

    if (communityButton.prefix === BUTTON_IDS.communityClosePrefix) {
      await closeCommunityRegistrationBoard(communityButton.boardId);
      await refreshCommunityBoardMessages(interaction, communityButton.boardId);
      await interaction.reply({
        content: "El registro fue cerrado.",
        ephemeral: true
      });
      return;
    }

    const roleKey = getCommunityRoleKeyByPrefix(communityButton.prefix);
    const roleConfig = COMMUNITY_REGISTRATION_ROLE_ORDER.find((role) => role.key === roleKey);
    const existingEntry = await getCommunityRegistrationEntry(
      communityButton.boardId,
      interaction.user.id
    );

    if (!existingEntry) {
      await interaction.reply({
        content: "Primero debes registrarte para poder seleccionar roles.",
        ephemeral: true
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    try {
      await assignCommunityRole(member, roleKey);
    } catch (error) {
      await interaction.reply({
        content: error.message,
        ephemeral: true
      });
      return;
    }

    await updateCommunityRegistrationEntry(existingEntry.id, {
      [roleKey]: true,
      username: member.displayName || interaction.user.username
    });
    await refreshCommunityBoardMessages(interaction, communityButton.boardId);
    await interaction.reply({
      content: `Se te asigno el rol \`${roleConfig.label}\` y se actualizo tu registro.`,
      ephemeral: true
    });
    return;
  }

  if (interaction.customId === BUTTON_IDS.register) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const panelMode = getPanelModeFromMessage(interaction);
    const result = await registerArenaMember(member, panelMode);

    if (result.status === "full") {
      const { maxPlayers } = await getScrimSettings();
      await interaction.reply({
        content: `La scrim ya llego al maximo de ${maxPlayers} jugadores.`,
        ephemeral: true
      });
      return;
    }

    await interaction.deferUpdate();
    await interaction.message.edit(await buildRegisterPanel(panelMode, interaction.guild));
    return;
  }

  if (interaction.customId === BUTTON_IDS.cancel) {
    const panelMode = getPanelModeFromMessage(interaction);
    await removeHealerAuxRoleFromMember(interaction.member).catch(() => null);
    await removeTankAuxRoleFromMember(interaction.member).catch(() => null);
    await removeArenaRegistrationByUserId(interaction.user.id, panelMode);
    await interaction.deferUpdate();
    await interaction.message.edit(await buildRegisterPanel(panelMode, interaction.guild));
    return;
  }

  if (interaction.customId === BUTTON_IDS.selfHealer) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const panelMode = getPanelModeFromMessage(interaction);

    if (await isManualHealerUser(member.id)) {
      await removeHealerAuxRoleFromMember(member).catch(() => null);
      await toggleSelfHealerRegistration(member, panelMode);
      await interaction.deferUpdate();
      await interaction.message.edit(await buildRegisterPanel(panelMode, interaction.guild));
      return;
    }

    try {
      await assignHealerAuxRole(member);
    } catch {
      await interaction.reply({
        content: "No pude asignarte el rol `Healer-Auxiliar`. Revisa permisos y jerarquia del bot.",
        ephemeral: true
      });
      return;
    }

    const result = await toggleSelfHealerRegistration(member, panelMode);

    if (result.status === "manual_healer_full") {
      await removeHealerAuxRoleFromMember(member).catch(() => null);
      await interaction.reply({
        content: "Ya hay 2 cupos ocupados en `Soy healer`.",
        ephemeral: true
      });
      return;
    }

    if (result.status === "full") {
      await removeHealerAuxRoleFromMember(member).catch(() => null);
      const { maxPlayers } = await getScrimSettings();
      await interaction.reply({
        content: `La scrim ya llego al maximo de ${maxPlayers} jugadores.`,
        ephemeral: true
      });
      return;
    }

    await interaction.deferUpdate();
    await interaction.message.edit(await buildRegisterPanel(panelMode, interaction.guild));
    return;
  }

  if (interaction.customId === BUTTON_IDS.selfTank) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const panelMode = getPanelModeFromMessage(interaction);

    if (await isManualTankUser(member.id)) {
      await removeTankAuxRoleFromMember(member).catch(() => null);
      await toggleSelfTankRegistration(member, panelMode);
      await interaction.deferUpdate();
      await interaction.message.edit(await buildRegisterPanel(panelMode, interaction.guild));
      return;
    }

    try {
      await assignTankAuxRole(member);
    } catch {
      await interaction.reply({
        content: "No pude asignarte el rol `Tank-Auxiliar`. Revisa permisos y jerarquia del bot.",
        ephemeral: true
      });
      return;
    }

    const result = await toggleSelfTankRegistration(member, panelMode);

    if (result.status === "manual_tank_full") {
      await removeTankAuxRoleFromMember(member).catch(() => null);
      await interaction.reply({
        content: "Ya hay 2 cupos ocupados en `Soy tank`.",
        ephemeral: true
      });
      return;
    }

    if (result.status === "full") {
      await removeTankAuxRoleFromMember(member).catch(() => null);
      const { maxPlayers } = await getScrimSettings();
      await interaction.reply({
        content: `La scrim ya llego al maximo de ${maxPlayers} jugadores.`,
        ephemeral: true
      });
      return;
    }

    await interaction.deferUpdate();
    await interaction.message.edit(await buildRegisterPanel(panelMode, interaction.guild));
    return;
  }

  if (interaction.customId === BUTTON_IDS.fight) {
    if (!isSystem32Member(interaction.member)) {
      await interaction.reply({
        content: "Solo un jugador con el rol `system32` puede iniciar la pelea.",
        ephemeral: true
      });
      return;
    }

    try {
      const matchup = await createScrimFight(interaction.guild);

      await interaction.reply({
        embeds: [await buildMatchPreviewEmbed("Pelea", matchup, interaction.guild)],
        components: buildResultButtons(matchup.id)
      });
    } catch (error) {
      await enableAuxButtonsFromError(error.message, interaction);
      await interaction.reply({
        content: error.message,
        ephemeral: true
      });
    }

    return;
  }

  if (interaction.customId === BUTTON_IDS.cancelScrim) {
    if (!isSystem32Member(interaction.member)) {
      await interaction.reply({
        content: "Solo un jugador con el rol `system32` puede cancelar la scrim.",
        ephemeral: true
      });
      return;
    }

    const panelMode = getPanelModeFromMessage(interaction);
    await interaction.deferReply({ ephemeral: true });
    const manualHealerUserIds = await getManualHealerUserIds();
    const manualTankUserIds = await getManualTankUserIds();

    try {
      await removeHealerAuxRoleFromUserIds(interaction.guild, manualHealerUserIds);
      await removeTankAuxRoleFromUserIds(interaction.guild, manualTankUserIds);
      await clearArenaRegistrations();
      await interaction.message.delete();
    } catch {
      await removeHealerAuxRoleFromUserIds(interaction.guild, manualHealerUserIds);
      await removeTankAuxRoleFromUserIds(interaction.guild, manualTankUserIds);
      await clearArenaRegistrations();
      await interaction.message.edit(
        await buildClosedRegisterPanel(panelMode, interaction.guild)
      );
    }

    await interaction.editReply({
      content: "La scrim fue cancelada."
    });
    return;
  }

  const rematchButton = parseRematchButton(interaction.customId);

  if (rematchButton) {
    if (!isSystem32Member(interaction.member)) {
      await interaction.reply({
        content: "Solo un jugador con el rol `system32` puede iniciar la revancha.",
        ephemeral: true
      });
      return;
    }

    const matchup = await createScrimRematch(rematchButton.draftId);

    if (!matchup) {
      await interaction.reply({
        content: "No pude crear la revancha para esa pelea.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [await buildMatchPreviewEmbed("Revancha", matchup, interaction.guild)],
      components: buildResultButtons(matchup.id)
    });
    return;
  }

  const resultButton = parseResultButton(interaction.customId);

  if (!resultButton) {
    return;
  }

  if (!isAdminResolver(interaction)) {
    await interaction.reply({
      content: "Solo un admin puede cerrar la pelea.",
      ephemeral: true
    });
    return;
  }

  const result = await resolveScrimFight(
    resultButton.draftId,
    resultButton.winner,
    interaction.guild
  );

  if (!result) {
    await interaction.reply({
      content: "Esa pelea ya fue resuelta o no existe.",
      ephemeral: true
    });
    return;
  }

  await interaction.update({
    embeds: [await buildSimulationResultEmbed("Resultado de la pelea", result, interaction.guild)],
    components: buildResultButtons(resultButton.draftId, true)
  });
}
