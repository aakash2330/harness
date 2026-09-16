export type MessageRole = "user" | "assistant";
export interface Message { role: MessageRole; text: string }
export interface Thread { id: string; cwd: string }
export interface ThreadSendRequest { thread: Thread; messages: Message[] }
