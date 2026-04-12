CREATE TABLE "CommunityRegistrationBoard" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityRegistrationBoard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityRegistrationBatch" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRegistrationBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityRegistrationEntry" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "arena" BOOLEAN NOT NULL DEFAULT false,
    "scrim" BOOLEAN NOT NULL DEFAULT false,
    "crystalLeague" BOOLEAN NOT NULL DEFAULT false,
    "crystal20v20" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRegistrationEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityRegistrationBatch_messageId_key" ON "CommunityRegistrationBatch"("messageId");
CREATE UNIQUE INDEX "CommunityRegistrationBatch_boardId_batchNumber_key" ON "CommunityRegistrationBatch"("boardId", "batchNumber");
CREATE UNIQUE INDEX "CommunityRegistrationEntry_boardId_userId_key" ON "CommunityRegistrationEntry"("boardId", "userId");
CREATE INDEX "CommunityRegistrationEntry_boardId_batchNumber_idx" ON "CommunityRegistrationEntry"("boardId", "batchNumber");

ALTER TABLE "CommunityRegistrationBatch" ADD CONSTRAINT "CommunityRegistrationBatch_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CommunityRegistrationBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRegistrationEntry" ADD CONSTRAINT "CommunityRegistrationEntry_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CommunityRegistrationBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
