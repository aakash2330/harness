import os from "node:os";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { name } from "./package.json";

// Same file Electron's main process opens: app.getPath("userData")/state.sqlite.
// Override with DATABASE_URL when pointing the CLI somewhere else.
const userData =
  process.platform === "darwin"
    ? path.join(os.homedir(), "Library", "Application Support", name)
    : path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), name);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? `file:${path.join(userData, "state.sqlite")}` },
});
