import type { Context } from "../context.ts";
import type { ShellOutputCaptureOptions, ShellOutputMetadata, ShellOutputUpdate, ShellOutputView } from "../types.ts";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, truncateHead, truncateTail, utf8ByteLength } from "./truncate.ts";

const INVALID_SHELL_OUTPUT = /[\x00-\x08\x0b-\x1f\ufff9-\ufffb]/g;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface OutputCaptureHandlers {
	onUpdate?: (update: ShellOutputUpdate, context: Context) => void;
	onError(error: unknown): void;
}

/**
 * Maintains and publishes one bounded shell-output view.
 *
 * Every write publishes an update immediately. pi throttles this through an
 * AdaptivePublisher (see docs/structure.md, "Left out of the pi port"); bring
 * that back when tool output is streamed to the UI.
 */
export class OutputCapture {
	readonly #maxBytes: number;
	readonly #maxLines: number;
	readonly #retain: "head" | "tail";
	readonly #context: Context;
	readonly #onUpdate: OutputCaptureHandlers["onUpdate"];

	readonly #decoder = new TextDecoder();
	#buffer = "";
	#bufferBytes = 0;
	#totalBytes = 0;
	#newlines = 0;
	#endsWithNewline = true;
	#currentLineBytes = 0;
	#spillPath: string | undefined;
	#disposed = false;
	readonly #onError: OutputCaptureHandlers["onError"];
	#published: ShellOutputView | undefined;

	constructor(options: ShellOutputCaptureOptions | undefined, context: Context, handlers: OutputCaptureHandlers) {
		this.#maxBytes = options?.limits.maxBytes ?? DEFAULT_MAX_BYTES;
		this.#maxLines = options?.limits.maxLines ?? DEFAULT_MAX_LINES;
		this.#retain = options?.limits.retain ?? "tail";
		this.#context = context;
		this.#onUpdate = handlers.onUpdate;
		this.#onError = handlers.onError;
		if (!Number.isFinite(this.#maxBytes) || this.#maxBytes <= 0) {
			throw new TypeError("Output maxBytes must be a positive finite number");
		}
		if (!Number.isInteger(this.#maxLines) || this.#maxLines <= 0) {
			throw new TypeError("Output maxLines must be a positive integer");
		}
	}

	get truncated(): boolean {
		return this.#totalBytes > this.#maxBytes || this.#totalLines() > this.#maxLines;
	}

	push(chunk: string | Uint8Array): void {
		if (this.#disposed) return;
		if (typeof chunk === "string") {
			this.#appendText(this.#decoder.decode());
			this.#appendText(chunk);
			return;
		}
		this.#appendText(this.#decoder.decode(chunk, { stream: true }));
	}

	finish(): void {
		if (this.#disposed) return;
		this.#appendText(this.#decoder.decode());
	}

	setSpillPath(path: string): void {
		if (this.#disposed || this.#spillPath === path) return;
		this.#spillPath = path;
		this.flush();
	}

	snapshot(): ShellOutputView {
		const retained =
			this.#retain === "head"
				? truncateHead(this.#buffer, { maxBytes: this.#maxBytes, maxLines: this.#maxLines })
				: truncateTail(this.#buffer, { maxBytes: this.#maxBytes, maxLines: this.#maxLines });
		const totalLines = this.#totalLines();
		const truncated = this.truncated;
		const { content, ...truncation } = retained;
		return {
			text: sanitizeShellOutput(content),
			truncation: {
				...truncation,
				truncated,
				truncatedBy: truncated ? (totalLines > this.#maxLines ? "lines" : "bytes") : null,
				totalBytes: this.#totalBytes,
				totalLines,
			},
			...(this.#spillPath === undefined ? {} : { spillPath: this.#spillPath }),
			...(retained.lastLinePartial ? { lastLineBytes: this.#currentLineBytes } : {}),
		};
	}

	flush(): void {
		if (this.#disposed || this.#onUpdate === undefined) return;
		const current = this.snapshot();
		const update = updateFrom(this.#published, current);
		this.#published = current;
		try {
			this.#onUpdate(update, this.#context);
		} catch (error) {
			this.#onError(error);
		}
	}

	dispose(): void {
		this.#disposed = true;
	}

	#appendText(text: string): void {
		if (text === "") return;
		const textBytes = utf8ByteLength(text);
		this.#totalBytes += textBytes;
		this.#newlines += countNewlines(text);
		this.#endsWithNewline = text.endsWith("\n");
		const lastNewline = text.lastIndexOf("\n");
		this.#currentLineBytes =
			lastNewline === -1 ? this.#currentLineBytes + textBytes : utf8ByteLength(text.slice(lastNewline + 1));
		this.#buffer += text;
		this.#bufferBytes += textBytes;

		const guard = this.#maxBytes * 2;
		if (this.#bufferBytes > guard * 2) {
			this.#buffer =
				this.#retain === "tail"
					? trimToLastUtf8Bytes(this.#buffer, guard)
					: trimToFirstUtf8Bytes(this.#buffer, guard);
			this.#bufferBytes = utf8ByteLength(this.#buffer);
		}
		this.flush();
	}

	#totalLines(): number {
		return this.#newlines + (this.#endsWithNewline || this.#totalBytes === 0 ? 0 : 1);
	}
}

export function applyShellOutputUpdate(
	current: ShellOutputView | undefined,
	update: ShellOutputUpdate,
): ShellOutputView {
	switch (update.kind) {
		case "replace":
			return update.output;
		case "append":
			return { text: `${current?.text ?? ""}${update.text}`, ...update.metadata };
		case "slide":
			return { text: `${current?.text.slice(update.drop) ?? ""}${update.text}`, ...update.metadata };
		case "metadata":
			return { text: current?.text ?? "", ...update.metadata };
	}
}

function updateFrom(previous: ShellOutputView | undefined, current: ShellOutputView): ShellOutputUpdate {
	if (previous === undefined) return { kind: "replace", output: current };
	const metadata: ShellOutputMetadata = {
		truncation: current.truncation,
		...(current.spillPath === undefined ? {} : { spillPath: current.spillPath }),
		...(current.lastLineBytes === undefined ? {} : { lastLineBytes: current.lastLineBytes }),
	};
	if (current.text === previous.text) return { kind: "metadata", metadata };
	if (current.text.length > previous.text.length && current.text.slice(0, previous.text.length) === previous.text) {
		return { kind: "append", text: current.text.slice(previous.text.length), metadata };
	}
	const shared = suffixPrefixOverlap(
		previous.text,
		current.text,
		Math.min(previous.text.length, current.text.length, current.truncation.maxBytes * 2),
	);
	if (shared > 0) {
		return {
			kind: "slide",
			drop: previous.text.length - shared,
			text: current.text.slice(shared),
			metadata,
		};
	}
	return { kind: "replace", output: current };
}

function suffixPrefixOverlap(before: string, after: string, scan: number): number {
	if (before.length === 0 || after.length === 0 || scan === 0) return 0;
	const tail = before.length > scan ? before.slice(before.length - scan) : before;
	for (const probeLength of [Math.min(64, after.length), 1]) {
		const probe = after.slice(0, probeLength);
		let candidates = 0;
		for (let index = tail.indexOf(probe); index !== -1; index = tail.indexOf(probe, index + 1)) {
			if (++candidates > 8) break;
			const overlapLength = tail.length - index;
			if (overlapLength <= after.length && tail.slice(index) === after.slice(0, overlapLength)) {
				return overlapLength;
			}
		}
		if (probeLength === 1) break;
	}
	return 0;
}

export function sanitizeShellOutput(text: string): string {
	return text.replace(INVALID_SHELL_OUTPUT, "");
}

function countNewlines(text: string): number {
	let count = 0;
	for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) count++;
	return count;
}

function trimToLastUtf8Bytes(text: string, maxBytes: number): string {
	const bytes = textEncoder.encode(text);
	if (bytes.length <= maxBytes) return text;
	let start = bytes.length - maxBytes;
	while (start < bytes.length && ((bytes[start] ?? 0) & 0xc0) === 0x80) start++;
	return textDecoder.decode(bytes.subarray(start));
}

function trimToFirstUtf8Bytes(text: string, maxBytes: number): string {
	const bytes = textEncoder.encode(text);
	if (bytes.length <= maxBytes) return text;
	let end = maxBytes;
	while (end > 0 && ((bytes[end] ?? 0) & 0xc0) === 0x80) end--;
	return textDecoder.decode(bytes.subarray(0, end));
}
