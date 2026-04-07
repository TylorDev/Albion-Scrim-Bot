import { ManualRegistrationType } from "@prisma/client";
import { prisma } from "../database/prisma.js";

const MAX_MANUAL_HEALERS = 2;

async function getHealerRegistrations() {
  return prisma.manualRegistration.findMany({
    where: { role: ManualRegistrationType.HEALER },
    orderBy: { createdAt: "asc" }
  });
}

export async function getManualHealerUserIds() {
  const registrations = await getHealerRegistrations();
  return registrations.map((registration) => registration.userId);
}

export async function isManualHealerUser(userId) {
  const registration = await prisma.manualRegistration.findUnique({
    where: {
      userId_role: {
        userId,
        role: ManualRegistrationType.HEALER
      }
    }
  });

  return Boolean(registration);
}

export async function addManualHealerUser(userId) {
  const current = await getManualHealerUserIds();

  if (current.includes(userId)) {
    return {
      status: "already_manual_healer",
      userIds: current
    };
  }

  if (current.length >= MAX_MANUAL_HEALERS) {
    return {
      status: "manual_healer_full",
      userIds: current
    };
  }

  await prisma.manualRegistration.create({
    data: {
      userId,
      role: ManualRegistrationType.HEALER
    }
  });

  return {
    status: "manual_healer_added",
    userIds: [...current, userId]
  };
}

export async function removeManualHealerUser(userId) {
  const result = await prisma.manualRegistration.deleteMany({
    where: {
      userId,
      role: ManualRegistrationType.HEALER
    }
  });

  return {
    status: result.count === 0 ? "not_found" : "manual_healer_removed",
    userIds: await getManualHealerUserIds()
  };
}

export async function clearManualHealers() {
  await prisma.manualRegistration.deleteMany({
    where: { role: ManualRegistrationType.HEALER }
  });
}

export function getMaxManualHealers() {
  return MAX_MANUAL_HEALERS;
}
