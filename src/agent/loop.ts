import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam, BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages";
import { NodeExecutionEnv } from "./env/nodejs.ts";
import { createBashTool, createEditTool, createReadTool, createWriteTool } from "./tools/index.ts";
import type { AgentHarnessTool, ExecutionEnv } from "./types.ts";

type ToolContext = { env: ExecutionEnv };
const tools: AgentHarnessTool<ToolContext>[] = [createReadTool(), createBashTool(), createEditTool(), createWriteTool()];

const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude.";

export interface AgentRunOptions {
  model: string;
  /** Extra instructions. Sent as a second system block; the first block is always the exact Claude Code identity sentence, which the OAuth path requires byte-for-byte. */
  system: string;
  cwd: string;
  messages: BetaMessageParam[];
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  betas: string[];
}

/** Minimal pi-style agent loop: call the model, run every tool it asked for, feed results back, repeat until it stops. */
export async function runAgent(client: Anthropic, opts: AgentRunOptions): Promise<string> {
  const toolContext: ToolContext = { env: new NodeExecutionEnv({ cwd: opts.cwd }) };
  const messages = [...opts.messages];
  const context = {};
  for (;;) {
    const res = await client.beta.messages.create({
      model: opts.model,
      max_tokens: 16000,
      output_config: { effort: opts.effort },
      betas: opts.betas,
      system: [
        { type: "text", text: CLAUDE_CODE_IDENTITY },
        { type: "text", text: opts.system },
      ],
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: JSON.parse(JSON.stringify(t.parameters)) })),
      messages,
    });
    messages.push({ role: "assistant", content: res.content });
    const calls = res.content.filter((b) => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || calls.length === 0) {
      return res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    }
    const results: BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      const tool = tools.find((t) => t.name === call.name);
      try {
        if (!tool) throw new Error(`Unknown tool: ${call.name}`);
        const args = tool.prepareArguments ? tool.prepareArguments(call.input) : call.input;
        const invocation = { invocationId: call.id, operationId: call.id, turnId: res.id };
        const out = await tool.execute(call.id, args, () => {}, toolContext, invocation, context);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: out.content.map((c) =>
            c.type === "text" ? c : { type: "image", source: { type: "base64", media_type: c.mimeType as "image/png", data: c.data } },
          ),
        });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: e instanceof Error ? e.message : String(e), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
}
