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

function buildEntriesList(entries, guild) {
  if (entries.length === 0) {
    return "Nadie se ha registrado todavia.";
  }

  return entries
    .map(
      (entry, index) =>
        `${index + 1}. <@${entry.userId}> - ${formatSelectedRoles(entry, guild)}`
    )
    .join("\n")
    .slice(0, 4096);
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
        .addFields({
          name: `Registrados (${entries.length})`,
          value: buildEntriesList(entries, guild)
        })
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
        .addFields({
          name: `Registrados (${totalEntries})`,
          value: buildEntriesList(entries, guild)
        })
        .setColor(0x1c7ed6)
    ]
  };
}
