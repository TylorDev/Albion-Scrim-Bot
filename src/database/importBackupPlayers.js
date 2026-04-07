import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma.js";

const backupFilePath = path.resolve(process.cwd(), "backup.txt");

function extractValuesSection(line) {
  const match = line.match(/VALUES\s*\((.*)\);?$/i);

  if (!match) {
    throw new Error(`No pude leer la linea del backup: ${line}`);
  }

  return match[1];
}

function parseSqlValueList(rawValues) {
  const values = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < rawValues.length; index += 1) {
    const char = rawValues[index];
    const nextChar = rawValues[index + 1];

    if (char === "'") {
      if (inString && nextChar === "'") {
        current += "'";
        index += 1;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (char === "," && !inString) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    values.push(current.trim());
  }

  return values;
}

function parseBoolean(value) {
  return value === "1";
}

function parseTimestamp(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Timestamp invalido en backup: ${value}`);
  }

  return new Date(parsed);
}

function parseBackupLine(line) {
  const values = parseSqlValueList(extractValuesSection(line));

  if (values.length !== 9) {
    throw new Error(`Cantidad inesperada de columnas en backup: ${line}`);
  }

  return {
    userId: values[0],
    username: values[1],
    mmr: Number(values[2]),
    partidas: Number(values[3]),
    victorias: Number(values[4]),
    isFake: parseBoolean(values[5]),
    isHealer: parseBoolean(values[6]),
    createdAt: parseTimestamp(values[7]),
    updatedAt: parseTimestamp(values[8])
  };
}

async function readBackupPlayers() {
  const rawContent = await fs.readFile(backupFilePath, "utf8");
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map(parseBackupLine);
}

export async function importBackupPlayers() {
  const players = await readBackupPlayers();

  if (players.length === 0) {
    return {
      total: 0,
      created: 0,
      updated: 0
    };
  }

  const existingPlayers = await prisma.player.findMany({
    where: {
      userId: {
        in: players.map((player) => player.userId)
      }
    },
    select: {
      userId: true
    }
  });
  const existingUserIds = new Set(existingPlayers.map((player) => player.userId));

  await prisma.$transaction(
    players.map((player) =>
      prisma.player.upsert({
        where: { userId: player.userId },
        update: {
          username: player.username,
          mmr: player.mmr,
          partidas: player.partidas,
          victorias: player.victorias,
          isFake: player.isFake,
          isHealer: player.isHealer,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt
        },
        create: player
      })
    )
  );

  const updated = players.filter((player) => existingUserIds.has(player.userId)).length;
  const created = players.length - updated;

  return {
    total: players.length,
    created,
    updated
  };
}
