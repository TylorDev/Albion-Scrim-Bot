import { prisma } from "../database/prisma.js";
import { COMMUNITY_REGISTRATION_BATCH_CAPACITY } from "../constants/communityRegistrationRoles.js";

export async function createCommunityRegistrationBoard({
  guildId,
  channelId,
  createdByUserId
}) {
  return prisma.communityRegistrationBoard.create({
    data: {
      guildId,
      channelId,
      createdByUserId
    }
  });
}

export async function getOpenCommunityRegistrationBoard(guildId, channelId) {
  return prisma.communityRegistrationBoard.findFirst({
    where: {
      guildId,
      channelId,
      isClosed: false
    },
    orderBy: { createdAt: "desc" },
    include: {
      batches: {
        orderBy: { batchNumber: "asc" }
      },
      entries: {
        orderBy: [
          { batchNumber: "asc" },
          { registeredAt: "asc" }
        ]
      }
    }
  });
}

export async function createCommunityRegistrationBatch({
  boardId,
  batchNumber,
  channelId,
  messageId
}) {
  return prisma.communityRegistrationBatch.create({
    data: {
      boardId,
      batchNumber,
      channelId,
      messageId
    }
  });
}

export async function getCommunityRegistrationBoard(boardId) {
  return prisma.communityRegistrationBoard.findUnique({
    where: { id: boardId },
    include: {
      batches: {
        orderBy: { batchNumber: "asc" }
      },
      entries: {
        orderBy: [
          { batchNumber: "asc" },
          { registeredAt: "asc" }
        ]
      }
    }
  });
}

export async function getCommunityRegistrationBatch(boardId, batchNumber) {
  return prisma.communityRegistrationBatch.findUnique({
    where: {
      boardId_batchNumber: {
        boardId,
        batchNumber
      }
    }
  });
}

export async function getCommunityRegistrationEntry(boardId, userId) {
  return prisma.communityRegistrationEntry.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId
      }
    }
  });
}

export async function getBatchEntries(boardId, batchNumber) {
  return prisma.communityRegistrationEntry.findMany({
    where: {
      boardId,
      batchNumber
    },
    orderBy: { registeredAt: "asc" }
  });
}

export async function countBatchEntries(boardId, batchNumber) {
  return prisma.communityRegistrationEntry.count({
    where: {
      boardId,
      batchNumber
    }
  });
}

export async function getFirstOpenBatch(boardId) {
  const batches = await prisma.communityRegistrationBatch.findMany({
    where: { boardId },
    orderBy: { batchNumber: "asc" }
  });

  for (const batch of batches) {
    const count = await countBatchEntries(boardId, batch.batchNumber);

    if (count < COMMUNITY_REGISTRATION_BATCH_CAPACITY) {
      return batch;
    }
  }

  return null;
}

export async function createCommunityRegistrationEntry({
  boardId,
  batchNumber,
  userId,
  username
}) {
  return prisma.communityRegistrationEntry.create({
    data: {
      boardId,
      batchNumber,
      userId,
      username
    }
  });
}

export async function updateCommunityRegistrationEntry(entryId, data) {
  return prisma.communityRegistrationEntry.update({
    where: { id: entryId },
    data
  });
}

export async function deleteCommunityRegistrationEntry(boardId, userId) {
  return prisma.communityRegistrationEntry.deleteMany({
    where: {
      boardId,
      userId
    }
  });
}

export async function closeCommunityRegistrationBoard(boardId) {
  return prisma.communityRegistrationBoard.update({
    where: { id: boardId },
    data: {
      isClosed: true,
      closedAt: new Date()
    },
    include: {
      batches: {
        orderBy: { batchNumber: "asc" }
      },
      entries: {
        orderBy: [
          { batchNumber: "asc" },
          { registeredAt: "asc" }
        ]
      }
    }
  });
}
