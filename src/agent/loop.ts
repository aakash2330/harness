import type OpenAI from "openai";
import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { AGENT_IDENTITY } from "../llm.ts";
import { NodeExecutionEnv } from "./env/nodejs.ts";
import { createBashTool, createEditTool, createReadTool, createWriteTool } from "./tools/index.ts";
import type { AgentHarnessTool, ExecutionEnv, TextContent, ImageContent } from "./types.ts";

type ToolContext = { env: ExecutionEnv };
const tools: AgentHarnessTool<ToolContext>[] = [createReadTool(), createBashTool(), createEditTool(), createWriteTool()];

export type AgentMessage = { role: "user" | "assistant"; content: string };

export interface AgentRunOptions {
  identity?: string;
  system: string;
  cwd: string;
  messages: AgentMessage[];
}

function openaiTools(): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: JSON.parse(JSON.stringify(t.parameters)),
    },
  }));
}

function formatToolResult(content: (TextContent | ImageContent)[]): string {
  return content
    .map((c) => (c.type === "text" ? c.text : `[image: ${c.mimeType}]`))
    .join("\n");
}

/** Minimal pi-style agent loop: call the model, run tools, feed results back, repeat until it stops. */
export async function runAgent(client: OpenAI, opts: AgentRunOptions): Promise<string> {
  const toolContext: ToolContext = { env: new NodeExecutionEnv({ cwd: opts.cwd }) };
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: `${opts.identity ?? AGENT_IDENTITY}\n\n${opts.system}` },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const context = {};
  for (;;) {
    const res = await client.chat.completions.create({
      model: process.env.HARNESS_MODEL!,
      max_tokens: 16_000,
      messages,
      tools: openaiTools(),
      tool_choice: "auto",
      reasoning_effort: process.env.HARNESS_EFFORT! as ChatCompletionCreateParams["reasoning_effort"],
    });
    const choice = res.choices[0];
    const assistant = choice.message;
    messages.push(assistant);

    const toolCalls = assistant.tool_calls;
    if (!toolCalls?.length || choice.finish_reason === "stop") {
      return assistant.content ?? "";
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const tool = tools.find((t) => t.name === call.function.name);
      let content: string;
      try {
        if (!tool) throw new Error(`Unknown tool: ${call.function.name}`);
        const args = JSON.parse(call.function.arguments || "{}");
        const prepared = tool.prepareArguments ? tool.prepareArguments(args) : args;
        const invocation = { invocationId: call.id, operationId: call.id, turnId: res.id };
        const out = await tool.execute(call.id, prepared, () => {}, toolContext, invocation, context);
        content = formatToolResult(out.content);
      } catch (e) {
        content = e instanceof Error ? e.message : String(e);
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }
}
