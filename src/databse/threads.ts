import { randomUUID } from "node:crypto";
import { db } from "./prisma";

export function upsertThread(id: string, cwd: string, model: string, title: string) {
  const now = new Date();
  return db().thread.upsert({
    where: { id },
    create: { id, cwd, model, title, createdAt: now, updatedAt: now },
    update: { updatedAt: now },
  });
}

export function appendMessage(threadId: string, role: string, text: string) {
  const now = new Date();
  return db().message.create({ data: { id: randomUUID(), threadId, role, text, createdAt: now, updatedAt: now } });
}

export function getAllThreads() {
  return db().thread.findMany({
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });
}
