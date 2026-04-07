import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import { BUTTON_IDS } from "../constants/customIds.js";

function buildResultButton(draftId, label, result, style, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(`${BUTTON_IDS.resultPrefix}:${draftId}:${result}`)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled);
}

function buildRematchButton(draftId, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(`${BUTTON_IDS.rematchPrefix}:${draftId}`)
    .setLabel("Revancha")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);
}

export function buildResultButtons(draftId, disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      buildResultButton(draftId, "Equipo 1", "A", ButtonStyle.Primary, disabled),
      buildResultButton(draftId, "Equipo 2", "B", ButtonStyle.Danger, disabled),
      buildResultButton(draftId, "Empate", "DRAW", ButtonStyle.Secondary, disabled)
    ),
    new ActionRowBuilder().addComponents(
      buildRematchButton(draftId, !disabled)
    )
  ];
}
