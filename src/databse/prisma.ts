import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";

let client: PrismaClient | undefined;

// Opened once by main.ts at app ready. Schema changes go through `bun run db:migrate`.
export function openDatabase(filename: string): PrismaClient {
  client = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${filename}` }) });
  return client;
}

export function db(): PrismaClient {
  if (!client) throw new Error("Database not opened. Call openDatabase() first.");
  return client;
}
