import { prisma } from "./prisma.js";

export async function initializeDatabase() {
  await prisma.$connect();
}
