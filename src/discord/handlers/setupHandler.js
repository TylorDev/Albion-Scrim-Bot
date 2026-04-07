import { PermissionFlagsBits } from "discord.js";
import { COMMANDS } from "../../constants/commands.js";
import {
  addArenaRole,
  addArenaUser,
  clearArenaAccess,
  getSettings,
  setCommandPublic
} from "../../data/settingsStore.js";

function formatMentionList(ids, formatter, emptyLabel) {
  if (ids.length === 0) {
    return emptyLabel;
  }

  return ids.map((id) => formatter(id)).join("\n");
}

function buildSettingsMessage(settings) {
  const publicCommands = settings.publicCommands.length > 0
    ? settings.publicCommands.map((command) => `/${command}`).join(", ")
    : "Ninguno";

  return [
    "**Configuracion actual**",
    `Comandos publicos: ${publicCommands}`,
    `Roles con acceso a /${COMMANDS.arena}: ${formatMentionList(
      settings.allowedArenaRoleIds,
      (id) => `<@&${id}>`,
      "Ninguno"
    )}`,
    `Usuarios con acceso a /${COMMANDS.arena}: ${formatMentionList(
      settings.allowedArenaUserIds,
      (id) => `<@${id}>`,
      "Ninguno"
    )}`
  ].join("\n");
}

function hasSetupPermission(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

export async function handleSetupCommand(interaction) {
  if (!hasSetupPermission(interaction)) {
    await interaction.reply({
      content: "Necesitas el permiso `Administrar servidor` para usar /setup.",
      ephemeral: true
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "arena") {
    const role = interaction.options.getRole("rol");
    const user = interaction.options.getUser("usuario");

    if (!role && !user) {
      await interaction.reply({
        content: "Debes indicar un `rol`, un `usuario` o ambos.",
        ephemeral: true
      });
      return;
    }

    if (role) {
      addArenaRole(role.id);
    }

    if (user) {
      addArenaUser(user.id);
    }

    const addedTargets = [role ? `${role}` : null, user ? `${user}` : null]
      .filter(Boolean)
      .join(" y ");

    await interaction.reply({
      content: `${addedTargets} ahora puede usar /${COMMANDS.arena}.`,
      ephemeral: true
    });
    return;
  }

  if (subcommand === "publico") {
    const commandName = interaction.options.getString("comando", true);
    const state = interaction.options.getBoolean("estado", true);

    if (commandName === COMMANDS.setup && !state) {
      await interaction.reply({
        content: "No voy a desactivar /setup como publico para evitar que te quedes sin configurarlo.",
        ephemeral: true
      });
      return;
    }

    setCommandPublic(commandName, state);

    await interaction.reply({
      content: `/${commandName} ahora es ${state ? "publico" : "privado"}.`,
      ephemeral: true
    });
    return;
  }

  if (subcommand === "limpiar") {
    clearArenaAccess();
    await interaction.reply({
      content: `Se limpiaron los accesos exclusivos de /${COMMANDS.arena}.`,
      ephemeral: true
    });
    return;
  }

  if (subcommand === "ver") {
    await interaction.reply({
      content: buildSettingsMessage(getSettings()),
      ephemeral: true
    });
  }
}
