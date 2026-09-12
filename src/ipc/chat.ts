import type { IpcMain } from "electron";
import Anthropic from "@anthropic-ai/sdk";
import { Channels } from "./channels";
import { accessToken } from "../claude-auth";
import { appendMessage, upsertThread } from "../persistence/threads";
import type { ChatSendRequest } from "../contracts";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

// Mirrors pi-mono's Anthropic OAuth path: Bearer token + Claude Code identity
// (beta flags, user-agent, x-app, and the system prompt) or the API rejects it.
export function registerChat(ipc: IpcMain) {
  ipc.handle(Channels.chatSend, async (_e, { thread, messages }: ChatSendRequest) => {
    const user = messages.at(-1)!;
    await upsertThread(thread, MODEL, user.text.slice(0, 80));
    await appendMessage(thread.id, user);

    const client = new Anthropic({
      apiKey: null,
      authToken: await accessToken(),
      defaultHeaders: { "user-agent": "claude-cli/2.1.251", "x-app": "cli" },
    });
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: (process.env.CLAUDE_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max" },
      betas: ["claude-code-20250219", "oauth-2025-04-20"],
      system: [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }],
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    });
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    await appendMessage(thread.id, { role: "assistant", text });
    return text;
  });
}
