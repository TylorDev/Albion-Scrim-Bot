import { env } from "./config/env.js";
import { initializeDatabase } from "./database/initializeDatabase.js";
import { createClient } from "./discord/createClient.js";
import { registerCommands } from "./discord/registerCommands.js";
import { handleButtonInteraction } from "./discord/handlers/buttonHandler.js";
import { handleChatInputCommand } from "./discord/handlers/chatInputHandler.js";

const client = createClient();

client.once("clientReady", async () => {
  try {
    await initializeDatabase();
    await registerCommands();
    console.log(`Bot conectado como ${client.user.tag}`);
  } catch (error) {
    console.error("No se pudieron registrar los comandos:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleChatInputCommand(interaction);
    return;
  }

  if (!interaction.isButton()) {
    return;
  }

  await handleButtonInteraction(interaction);
});

client.login(env.token);
