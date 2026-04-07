import { SlashCommandBuilder } from "discord.js";
import { COMMANDS } from "../constants/commands.js";
import {
  SCRIM_FAKE_PRESETS,
  SCRIM_FORMATS
} from "../data/scrimConfigStore.js";

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName(COMMANDS.secret)
    .setDescription("Devuelve un hola simple."),
  new SlashCommandBuilder()
    .setName(COMMANDS.scrim)
    .setDescription("Muestra el panel de scrim con registro real.")
    .addStringOption((option) =>
      option
        .setName("modo")
        .setDescription("Reglas del scrim.")
        .addChoices(
          { name: "Normal", value: SCRIM_FORMATS.standard },
          { name: "Meta", value: SCRIM_FORMATS.meta },
          { name: "Libre", value: SCRIM_FORMATS.libre }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("numero")
        .setDescription("Maximo de participantes. Debe ser par.")
        .setMinValue(10)
        .setMaxValue(20)
    ),
  new SlashCommandBuilder()
    .setName(COMMANDS.scrimfake)
    .setDescription("Carga 10 jugadores fake y muestra el panel de scrim.")
    .addStringOption((option) =>
      option
        .setName("modo")
        .setDescription("Preset de composicion fake.")
        .addChoices(
          { name: "Default", value: SCRIM_FAKE_PRESETS.default },
          { name: "NoHealers", value: SCRIM_FAKE_PRESETS.nohealers },
          { name: "NoTanks", value: SCRIM_FAKE_PRESETS.notanks },
          { name: "NoDps", value: SCRIM_FAKE_PRESETS.nodps },
          { name: "OneHealer", value: SCRIM_FAKE_PRESETS.onehealer }
        )
    ),
  new SlashCommandBuilder()
    .setName(COMMANDS.pelea)
    .setDescription("Arma ambos teams equilibrados y permite resolver el resultado."),
  new SlashCommandBuilder()
    .setName(COMMANDS.ranking)
    .setDescription("Muestra el ranking general por MMR."),
  new SlashCommandBuilder()
    .setName(COMMANDS.resetranks)
    .setDescription("Pone a todos los jugadores en 1000 MMR."),
  new SlashCommandBuilder()
    .setName(COMMANDS.resetearbd)
    .setDescription("Elimina los jugadores fake de la base de datos."),
  new SlashCommandBuilder()
    .setName(COMMANDS.test)
    .setDescription("Inserta 20 jugadores fake de prueba en la base de datos.")
];
