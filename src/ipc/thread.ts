import type { IpcMain } from "electron";
import { Channels } from "./channels";
import { AGENT_IDENTITY, createLlmClient } from "../llm";
import { appendMessage, getAllThreads, upsertThread } from "../databse/threads";
import { runAgent } from "../agent/loop";
import { type MessageRole, type Thread, type ThreadSendRequest } from "../contracts";

export function registerThreadSendMessage(ipc: IpcMain) {
  ipc.handle(Channels.threadSend, async (_e, { thread }: ThreadSendRequest) => {
    const messages = thread.messages;
    const user = messages.at(-1)!;
    await upsertThread(thread.id, thread.cwd, process.env.HARNESS_MODEL!, user.text.slice(0, 80));
    await appendMessage(thread.id, user.role, user.text);

    const text = await runAgent(createLlmClient(), {
      identity: AGENT_IDENTITY,
      system: `Working directory: ${thread.cwd}`,
      cwd: thread.cwd,
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    });
    await appendMessage(thread.id, "assistant", text);
    return text;
  });
}

export function registerThreadGetAll(ipc: IpcMain) {
  ipc.handle(Channels.threadGetAll, async (): Promise<Thread[]> => {
    const rows = await getAllThreads();
    return rows.map(({ id, cwd, title, model, messages }) => ({
      id,
      cwd,
      title,
      model,
      messages: messages.map(({ role, text }) => ({ role: role as MessageRole, text })),
    }));
  });
}
