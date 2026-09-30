import type { IpcMain } from "electron";
import Anthropic from "@anthropic-ai/sdk";
import { Channels } from "./channels";
import { accessToken } from "../claude-auth";
import { appendMessage, getAllThreads, upsertThread } from "../databse/threads";
import { runAgent } from "../agent/loop";
import type { MessageRole, Thread, ThreadSendRequest } from "../contracts";

// Mirrors pi-mono's Anthropic OAuth path: Bearer token + Claude Code identity
// (beta flags, user-agent, x-app, and the system prompt) or the API rejects it.
export function registerThreadSendMessage(ipc: IpcMain) {
  ipc.handle(Channels.threadSend, async (_e, { thread }: ThreadSendRequest) => {
    const messages = thread.messages;
    const user = messages.at(-1)!;
    const { model } = await upsertThread(thread.id, thread.cwd, thread.model, user.text.slice(0, 80));
    await appendMessage(thread.id, user.role, user.text);

    const client = new Anthropic({
      apiKey: null,
      authToken: await accessToken(),
      defaultHeaders: { "user-agent": "claude-cli/2.1.251", "x-app": "cli" },
    });
    const text = await runAgent(client, {
      model,
      effort: (process.env.CLAUDE_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max",
      betas: ["claude-code-20250219", "oauth-2025-04-20"],
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
