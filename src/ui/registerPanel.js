import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { BUTTON_IDS } from "../constants/customIds.js";
import {
  getArenaPlayers
} from "../data/arenaRegistrationStore.js";
import {
  getScrimSettings,
  SCRIM_FAKE_PRESETS,
  SCRIM_FORMATS
} from "../data/scrimConfigStore.js";
import { formatPlayerLabel } from "./playerFormatting.js";

async function buildRegistrationLines(players, guild) {
  if (players.length === 0) {
    return "Nadie se ha registrado todavia.";
  }

  const lines = await Promise.all(
    players.map(async (player, index) => {
      return `${index + 1}: ${await formatPlayerLabel(player, guild)}`;
    })
  );

  return lines.join("\n\n").slice(0, 4096);
}

function buildRegisterButtons(settings) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.register)
        .setLabel("Registrarse")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.selfHealer)
        .setLabel("Soy healer")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!settings.allowAuxHealerSignup),
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.selfTank)
        .setLabel("Soy tank")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!settings.allowAuxTankSignup),
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.cancel)
        .setLabel("Cancelar registro")
        .setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.fight)
        .setLabel("Lucha")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.cancelScrim)
        .setLabel("Cancelar scrim")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function buildRequirementsLabel(settings) {
  if (settings.format === SCRIM_FORMATS.meta) {
    return "Modo Meta: 1 Healer, 1 Rdps, 1 Dps, 1 Tank y 1 Debuffer por equipo.";
  }

  if (settings.format === SCRIM_FORMATS.libre) {
    return "Modo Libre: solo exige 1 Healer por equipo.";
  }

  return "Modo Normal: exige 1 Healer y 1 Tank por equipo.";
}

function buildFakeDescription(fakePreset) {
  if (fakePreset === SCRIM_FAKE_PRESETS.nohealers) {
    return "Preset NoHealers: todos los bots son Dps, Rdps o Tank.";
  }

  if (fakePreset === SCRIM_FAKE_PRESETS.notanks) {
    return "Preset NoTanks: todos los bots son Dps, Rdps y Healers.";
  }

  if (fakePreset === SCRIM_FAKE_PRESETS.nodps) {
    return "Preset NoDps: todos los bots son Tank y Healers.";
  }

  if (fakePreset === SCRIM_FAKE_PRESETS.onehealer) {
    return "Preset OneHealer: 1 Healer. El resto son Tank, Dps y Rdps.";
  }

  return "Preset Default: entran 2 Healers fijos y una mezcla base de Tank, Rdps, Debuffer y Dps.";
}

export async function buildRegisterPanel(mode = "real", guild = null) {
  const players = await getArenaPlayers();
  const settings = await getScrimSettings();
  const title = mode === "fake" ? "Scrim Fake" : "Scrim";
  const description =
    mode === "fake"
      ? buildFakeDescription(settings.fakePreset)
      : `Usa los botones para registrarte o cancelar tu registro. Maximo ${settings.maxPlayers} jugadores.`;

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields({
          name: "Reglas",
          value: buildRequirementsLabel(settings)
        })
        .addFields({
          name: `Participantes (${players.length}/${settings.maxPlayers})`,
          value: await buildRegistrationLines(players, guild)
        })
        .setColor(mode === "fake" ? 0x6741d9 : 0x2b8a3e)
    ],
    components: buildRegisterButtons(settings)
  };
}

export async function buildClosedRegisterPanel(mode = "real", guild = null) {
  const players = await getArenaPlayers();
  const settings = await getScrimSettings();
  const title = mode === "fake" ? "Scrim Fake" : "Scrim";

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`${title} cerrada`)
        .setDescription("La inscripcion fue cancelada por el anfitrion.")
        .addFields({
          name: "Reglas",
          value: buildRequirementsLabel(settings)
        })
        .addFields({
          name: `Participantes finales (${players.length}/${settings.maxPlayers})`,
          value: await buildRegistrationLines(players, guild)
        })
        .setColor(0x868e96)
    ],
    components: []
  };
}
