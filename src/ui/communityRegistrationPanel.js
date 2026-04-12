import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { BUTTON_IDS } from "../constants/customIds.js";
import {
  COMMUNITY_REGISTRATION_ROLE_ORDER
} from "../constants/communityRegistrationRoles.js";

function buildButtonId(prefix, boardId) {
  return `${prefix}:${boardId}`;
}

function getRoleMentionOrFallback(guild, roleName) {
  if (!guild) {
    return `@${roleName}`;
  }

  const role = guild.roles.cache.find(
    (item) => item.name.trim().toLowerCase() === roleName.trim().toLowerCase()
  );

  return role ? `<@&${role.id}>` : `@${roleName}`;
}

function formatSelectedRoles(entry, guild) {
  const selectedRoles = COMMUNITY_REGISTRATION_ROLE_ORDER
    .filter((role) => entry[role.key] === true)
    .map((role) => getRoleMentionOrFallback(guild, role.discordRoleName));

  return selectedRoles.length > 0 ? selectedRoles.join(", ") : "Sin roles";
}

function buildEntryLines(entries, guild) {
  if (entries.length === 0) {
    return ["Nadie se ha registrado todavia."];
  }

  return entries
    .map(
      (entry, index) =>
        `${index + 1}. <@${entry.userId}> - ${formatSelectedRoles(entry, guild)}`
    );
}

function buildEntryFields(entries, guild, totalEntries) {
  const lines = buildEntryLines(entries, guild);
  const fields = [];
  let currentLines = [];
  let currentLength = 0;

  for (const line of lines) {
    const nextLength = currentLength === 0
      ? line.length
      : currentLength + 1 + line.length;

    if (nextLength > 1024 && currentLines.length > 0) {
      fields.push(currentLines.join("\n"));
      currentLines = [line];
      currentLength = line.length;
      continue;
    }

    currentLines.push(line);
    currentLength = nextLength;
  }

  if (currentLines.length > 0) {
    fields.push(currentLines.join("\n"));
  }

  return fields.map((value, index) => ({
    name: index === 0 ? `Registrados (${totalEntries})` : `Registrados (${totalEntries}) cont.`,
    value
  }));
}

export function chunkCommunityRegistrationEntries(entries, chunkSize = 30) {
  const chunks = [];

  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(entries.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildComponents(boardId, isClosed) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityRegisterPrefix, boardId))
        .setLabel("Registrarse")
        .setStyle(ButtonStyle.Success)
        .setDisabled(isClosed),
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityCancelPrefix, boardId))
        .setLabel("Cancelar registro")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(isClosed),
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityClosePrefix, boardId))
        .setLabel("Cerrar Registro")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(isClosed)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityArenaPrefix, boardId))
        .setLabel("Arena")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isClosed),
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityScrimPrefix, boardId))
        .setLabel("Scrim")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isClosed),
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityCrystalPrefix, boardId))
        .setLabel("Crystal League")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isClosed),
      new ButtonBuilder()
        .setCustomId(buildButtonId(BUTTON_IDS.communityCrystal20Prefix, boardId))
        .setLabel("Crystal 20v20")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isClosed)
    )
  ];
}

export function buildCommunityRegistrationPanel({
  boardId,
  batchNumber,
  isClosed,
  entries,
  guild = null
}) {
  const title = isClosed
    ? `Registro Cerrado #${batchNumber}`
    : `Registro #${batchNumber}`;
  const description = isClosed
    ? "El registro fue cerrado por system32. Ya no se permiten nuevas inscripciones ni cambios de roles."
    : "Usa los botones para registrarte una sola vez y seleccionar tus roles.";

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields(buildEntryFields(entries, guild, entries.length))
        .setColor(isClosed ? 0x868e96 : 0x1c7ed6)
    ],
    components: buildComponents(boardId, isClosed)
  };
}

export function buildCommunityRegisteredPage({
  entries,
  pageNumber,
  totalPages,
  totalEntries,
  guild = null
}) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`Registrados ${pageNumber}/${totalPages}`)
        .setDescription("Listado global de usuarios registrados en la base de datos.")
        .addFields(buildEntryFields(entries, guild, totalEntries))
        .setColor(0x1c7ed6)
    ]
  };
}
