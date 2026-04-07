CREATE TYPE "DraftMode" AS ENUM ('SIMULATED', 'ARENA');
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'COMPLETED');
CREATE TYPE "TeamSide" AS ENUM ('A', 'B');
CREATE TYPE "ScrimFormat" AS ENUM ('STANDARD', 'META', 'LIBRE');
CREATE TYPE "ScrimFakePreset" AS ENUM ('DEFAULT', 'NOHEALERS', 'NOTANKS', 'NODPS', 'ONEHEALER');
CREATE TYPE "ManualRegistrationType" AS ENUM ('HEALER', 'TANK');

CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "mmr" INTEGER NOT NULL DEFAULT 1000,
    "partidas" INTEGER NOT NULL DEFAULT 0,
    "victorias" INTEGER NOT NULL DEFAULT 0,
    "isFake" BOOLEAN NOT NULL DEFAULT false,
    "isHealer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaRegistration" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Draft" (
    "id" SERIAL NOT NULL,
    "mode" "DraftMode" NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "teamAAvgMmr" INTEGER NOT NULL,
    "teamBAvgMmr" INTEGER NOT NULL,
    "teamAProbability" DOUBLE PRECISION NOT NULL,
    "teamBProbability" DOUBLE PRECISION NOT NULL,
    "winner" "TeamSide",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DraftPlayer" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "team" "TeamSide" NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "DraftPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "allowedArenaRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedArenaUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicCommands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scrimFormat" "ScrimFormat" NOT NULL DEFAULT 'STANDARD',
    "scrimMaxPlayers" INTEGER NOT NULL DEFAULT 10,
    "scrimFakePreset" "ScrimFakePreset" NOT NULL DEFAULT 'DEFAULT',
    "allowAuxHealerSignup" BOOLEAN NOT NULL DEFAULT false,
    "allowAuxTankSignup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManualRegistration" (
    "userId" TEXT NOT NULL,
    "role" "ManualRegistrationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualRegistration_pkey" PRIMARY KEY ("userId","role")
);

CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");
CREATE UNIQUE INDEX "ArenaRegistration_playerId_key" ON "ArenaRegistration"("playerId");
CREATE UNIQUE INDEX "DraftPlayer_draftId_playerId_key" ON "DraftPlayer"("draftId", "playerId");
CREATE INDEX "ManualRegistration_role_idx" ON "ManualRegistration"("role");

ALTER TABLE "ArenaRegistration" ADD CONSTRAINT "ArenaRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPlayer" ADD CONSTRAINT "DraftPlayer_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPlayer" ADD CONSTRAINT "DraftPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
