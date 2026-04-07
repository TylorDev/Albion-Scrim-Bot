import { prisma } from "./prisma.js";
import { ensureAppConfig } from "../data/appConfigStore.js";
import { syncLegacyFileState } from "./syncLegacyFileState.js";

export async function initializeDatabase() {
  await prisma.$connect();
  await ensureAppConfig();
  await syncLegacyFileState();
}
