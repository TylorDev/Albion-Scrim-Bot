import { spawnSync } from "node:child_process";

const FAILED_MIGRATION = "20260412_make_community_registration_user_unique";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function runPrismaCommand(args, { optional = false } = {}) {
  const result = spawnSync(npxCommand, ["prisma", ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status === 0) {
    return;
  }

  if (optional) {
    console.warn(
      `Prisma ${args.join(" ")} devolvio un error; continuamos con el siguiente paso.`,
    );
    return;
  }

  process.exit(result.status ?? 1);
}

console.log(
  `Intentando resolver la migracion fallida ${FAILED_MIGRATION} antes del deploy...`,
);
runPrismaCommand(
  ["migrate", "resolve", "--rolled-back", FAILED_MIGRATION],
  { optional: true },
);

console.log("Aplicando migraciones pendientes...");
runPrismaCommand(["migrate", "deploy"]);
