import { randomUUID } from "node:crypto";
import { db } from "./prisma";
import type { Message, Thread } from "../contracts";

export function upsertThread({ id, cwd }: Thread, model: string, title: string) {
  const now = new Date();
  return db().thread.upsert({
    where: { id },
    create: { id, cwd, model, title, createdAt: now, updatedAt: now },
    update: { updatedAt: now },
  });
}

export function appendMessage(threadId: string, { role, text }: Message) {
  const now = new Date();
  return db().message.create({ data: { id: randomUUID(), threadId, role, text, createdAt: now, updatedAt: now } });
}
