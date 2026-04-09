import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createRandomFakePlayers } from "../src/database/ensureSeedData.js";

const prisma = new PrismaClient();

async function main() {
  const fakePlayers = createRandomFakePlayers(20);

  for (const player of fakePlayers) {
    await prisma.player.upsert({
      where: { userId: player.userId },
      update: {
        username: player.username,
        isFake: true,
        isHealer: player.isHealer,
        fakeRoles: player.fakeRoles,
        mmr: player.mmr,
        partidas: player.partidas,
        victorias: player.victorias
      },
      create: player
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
