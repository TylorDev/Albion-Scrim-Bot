import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fakePlayers = [
  { userId: "fake_player_01", username: "Astra", isHealer: false },
  { userId: "fake_player_02", username: "Blaze", isHealer: false },
  { userId: "fake_player_03", username: "Cipher", isHealer: false },
  { userId: "fake_player_04", username: "Drako", isHealer: false },
  { userId: "fake_player_05", username: "Echo", isHealer: false },
  { userId: "fake_player_06", username: "Frost", isHealer: false },
  { userId: "fake_player_07", username: "Ghost", isHealer: false },
  { userId: "fake_player_08", username: "Havoc", isHealer: false },
  { userId: "fake_player_09", username: "Inferno", isHealer: false },
  { userId: "fake_player_10", username: "Jinx", isHealer: false },
  { userId: "fake_player_11", username: "Kairo", isHealer: false },
  { userId: "fake_player_12", username: "Lynx", isHealer: false },
  { userId: "fake_player_13", username: "Mako", isHealer: false },
  { userId: "fake_player_14", username: "Nova", isHealer: false },
  { userId: "fake_player_15", username: "Onyx", isHealer: false },
  { userId: "fake_player_16", username: "Pyro", isHealer: false },
  { userId: "fake_player_17", username: "Quark", isHealer: false },
  { userId: "fake_player_18", username: "Rogue", isHealer: false },
  { userId: "fake_player_19", username: "Shade", isHealer: false },
  { userId: "fake_player_20", username: "Titan", isHealer: false },
  { userId: "fake_healer_01", username: "Lumina", isHealer: true },
  { userId: "fake_healer_02", username: "Seraph", isHealer: true }
];

async function main() {
  for (const player of fakePlayers) {
    await prisma.player.upsert({
      where: { userId: player.userId },
      update: {
        username: player.username,
        isFake: true,
        isHealer: player.isHealer,
        mmr: 1000,
        partidas: 0,
        victorias: 0
      },
      create: {
        ...player,
        isFake: true,
        mmr: 1000,
        partidas: 0,
        victorias: 0
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
