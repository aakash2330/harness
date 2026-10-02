import { runAgent } from "./src/agent/loop";
import { AGENT_IDENTITY, createLlmClient } from "./src/llm";

const instruction = process.argv[2];
if (!instruction) {
  console.error('usage: bun cli.ts "<instruction>"');
  process.exit(2);
}

const cwd = process.cwd();
console.log(
  await runAgent(createLlmClient(), {
    identity: AGENT_IDENTITY,
    system: `Working directory: ${cwd}`,
    cwd,
    messages: [{ role: "user", content: instruction }],
  }),
);
