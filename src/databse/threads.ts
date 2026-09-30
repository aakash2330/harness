import { randomUUID } from "node:crypto";
import { db } from "./prisma";

export function upsertThread(id: string, cwd: string, model: string, title: string) {
  const now = new Date();
  return db().thread.upsert({
    where: { id },
    create: { id, cwd, model, title, createdAt: now, updatedAt: now },
    update: { model, updatedAt: now },
  });
}

export async function appendMessage(threadId: string, role: string, text: string) {
  const now = new Date();
  const { model } = await db().thread.findUniqueOrThrow({ where: { id: threadId }, select: { model: true } });
  return db().message.create({ data: { id: randomUUID(), threadId, role, text, model, createdAt: now, updatedAt: now } });
}

export function getAllThreads() {
  return db().thread.findMany({
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });
}
