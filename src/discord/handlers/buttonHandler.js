import { PermissionFlagsBits } from "discord.js";
import { BUTTON_IDS } from "../../constants/customIds.js";
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

  setScrimSettings(nextSettings);

  if (interaction.message?.editable) {
    const panelMode = getPanelModeFromMessage(interaction);
    await interaction.message.edit(
      await buildRegisterPanel(panelMode, interaction.guild)
    );
  }
}

export async function handleButtonInteraction(interaction) {
  if (interaction.customId === BUTTON_IDS.register) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const panelMode = getPanelModeFromMessage(interaction);
    const result = await registerArenaMember(member, panelMode);

    if (result.status === "full") {
      const { maxPlayers } = getScrimSettings();
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

    if (isManualHealerUser(member.id)) {
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
      const { maxPlayers } = getScrimSettings();
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

    if (isManualTankUser(member.id)) {
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
      const { maxPlayers } = getScrimSettings();
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
    const manualHealerUserIds = getManualHealerUserIds();
    const manualTankUserIds = getManualTankUserIds();

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
