export type MessageRole = "user" | "assistant";
export interface Message { role: MessageRole; text: string }
