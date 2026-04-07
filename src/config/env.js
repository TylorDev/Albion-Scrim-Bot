import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

export const env = {
  token: requireEnv("DISCORD_TOKEN"),
  clientId: requireEnv("CLIENT_ID"),
  guildIds: (process.env.GUILD_IDS || process.env.GUILD_ID || "")
    .split(",")
    .map((guildId) => guildId.trim())
    .filter(Boolean)
};

if (env.guildIds.length === 0) {
  throw new Error("Falta GUILD_ID o GUILD_IDS en el archivo .env.");
}
