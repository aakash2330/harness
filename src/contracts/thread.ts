export const DEFAULT_MODEL = "claude-sonnet-5-5";

export type MessageRole = "user" | "assistant";
export type Message = { role: MessageRole; text: string }
export type Thread = {
  id: string;
  cwd: string;
  title: string;
  model: string;
  messages: Message[];
}
export type ThreadSendRequest = { thread: Thread }
