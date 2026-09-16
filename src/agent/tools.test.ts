import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeExecutionEnv } from "./env/nodejs.ts";
import { createBashTool, createEditTool, createReadTool, createWriteTool } from "./tools/index.ts";

test("write, edit, read, bash round-trip through NodeExecutionEnv", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "harness-tools-"));
  const ctx = { env: new NodeExecutionEnv({ cwd }) };
  const inv = { invocationId: "1", operationId: "1", turnId: "1" };
  const noop = () => {};

  await createWriteTool().execute("w", { path: "a.txt", content: "hello\nworld\n" }, noop, ctx, inv, {});
  await createEditTool().execute("e", { path: "a.txt", edits: [{ oldText: "world", newText: "pi" }] }, noop, ctx, inv, {});
  const read = await createReadTool().execute("r", { path: "a.txt" }, noop, ctx, inv, {});
  expect(read.content[0]).toEqual({ type: "text", text: "hello\npi\n" });
  const bash = await createBashTool().execute("b", { command: "cat a.txt | wc -l" }, noop, ctx, inv, {});
  expect((bash.content[0] as { text: string }).text.trim()).toBe("2");
});
