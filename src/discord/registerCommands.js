import { REST, Routes } from "discord.js";
import { env } from "../config/env.js";
import { commandDefinitions } from "./commandDefinitions.js";

export async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(env.token);
  const body = commandDefinitions.map((command) => command.toJSON());

  for (const guildId of env.guildIds) {
    await rest.put(Routes.applicationGuildCommands(env.clientId, guildId), {
      body
    });
  }
}
