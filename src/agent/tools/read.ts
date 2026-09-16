import { type Static, Type } from "typebox";
import type { AgentHarnessTool } from "../types.ts";
import { getOrThrow } from "../types.ts";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationResult,
	truncateHead,
} from "../utils/truncate.ts";
import { resolveReadToolPath } from "./path-utils.ts";
import type { ExecutionToolContext } from "./tool-context.ts";

const readSchema = Type.Object({
	path: Type.String({ description: "Path to the file to read (relative or absolute)" }),
	offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
});

export type ReadToolInput = Static<typeof readSchema>;

export interface ReadToolDetails {
	truncation?: TruncationResult;
}

export function createReadTool<TContext extends ExecutionToolContext = ExecutionToolContext>(): AgentHarnessTool<TContext, typeof readSchema, ReadToolDetails | undefined> {
	return {
		name: "read",
		label: "read",
		description: `Read the contents of a text file. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). Use offset/limit for large files. When you need the full file, continue with offset until complete.`,
		parameters: readSchema,
		async execute(_toolCallId, { path, offset, limit }, _onUpdate, { env }, _invocation, context) {
			const absolutePath = await resolveReadToolPath(env, path, context);
			const bytes = getOrThrow(await env.readBinaryFile(absolutePath, context));
			const textContent = new TextDecoder().decode(bytes);
			const allLines = textContent.split("\n");
			const totalFileLines = allLines.length;
			const startLine = offset ? Math.max(0, offset - 1) : 0;
			const startLineDisplay = startLine + 1;
			if (startLine >= allLines.length) {
				throw new Error(`Offset ${offset} is beyond end of file (${allLines.length} lines total)`);
			}

			let selectedContent: string;
			let userLimitedLines: number | undefined;
			if (limit !== undefined) {
				const endLine = Math.min(startLine + limit, allLines.length);
				selectedContent = allLines.slice(startLine, endLine).join("\n");
				userLimitedLines = endLine - startLine;
			} else {
				selectedContent = allLines.slice(startLine).join("\n");
			}

			const truncation = truncateHead(selectedContent);
			let outputText: string;
			let details: ReadToolDetails | undefined;
			if (truncation.firstLineExceedsLimit) {
				const firstLineSize = formatSize(new TextEncoder().encode(allLines[startLine]).byteLength);
				outputText = `[Line ${startLineDisplay} is ${firstLineSize}, exceeds ${formatSize(DEFAULT_MAX_BYTES)} limit. Use bash: sed -n '${startLineDisplay}p' ${path} | head -c ${DEFAULT_MAX_BYTES}]`;
				details = { truncation };
			} else if (truncation.truncated) {
				const endLineDisplay = startLineDisplay + truncation.outputLines - 1;
				const nextOffset = endLineDisplay + 1;
				outputText = truncation.content;
				if (truncation.truncatedBy === "lines") {
					outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines}. Use offset=${nextOffset} to continue.]`;
				} else {
					outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Use offset=${nextOffset} to continue.]`;
				}
				details = { truncation };
			} else if (userLimitedLines !== undefined && startLine + userLimitedLines < allLines.length) {
				const remaining = allLines.length - (startLine + userLimitedLines);
				const nextOffset = startLine + userLimitedLines + 1;
				outputText = `${truncation.content}\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
			} else {
				outputText = truncation.content;
			}

			return { content: [{ type: "text", text: outputText }], details };
		},
	};
}
