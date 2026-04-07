import { ManualRegistrationType } from "@prisma/client";
import { prisma } from "../database/prisma.js";

const MAX_MANUAL_TANKS = 2;

async function getTankRegistrations() {
  return prisma.manualRegistration.findMany({
    where: { role: ManualRegistrationType.TANK },
    orderBy: { createdAt: "asc" }
  });
}

export async function getManualTankUserIds() {
  const registrations = await getTankRegistrations();
  return registrations.map((registration) => registration.userId);
}

export async function isManualTankUser(userId) {
  const registration = await prisma.manualRegistration.findUnique({
    where: {
      userId_role: {
        userId,
        role: ManualRegistrationType.TANK
      }
    }
  });

  return Boolean(registration);
}

export async function addManualTankUser(userId) {
  const current = await getManualTankUserIds();

  if (current.includes(userId)) {
    return {
      status: "already_manual_tank",
      userIds: current
    };
  }

  if (current.length >= MAX_MANUAL_TANKS) {
    return {
      status: "manual_tank_full",
      userIds: current
    };
  }

  await prisma.manualRegistration.create({
    data: {
      userId,
      role: ManualRegistrationType.TANK
    }
  });

  return {
    status: "manual_tank_added",
    userIds: [...current, userId]
  };
}

export async function removeManualTankUser(userId) {
  const result = await prisma.manualRegistration.deleteMany({
    where: {
      userId,
      role: ManualRegistrationType.TANK
    }
  });

  return {
    status: result.count === 0 ? "not_found" : "manual_tank_removed",
    userIds: await getManualTankUserIds()
  };
}

export async function clearManualTanks() {
  await prisma.manualRegistration.deleteMany({
    where: { role: ManualRegistrationType.TANK }
  });
}
