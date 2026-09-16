export type MessageRole = "user" | "assistant";
export type Message = { role: MessageRole; text: string }
export type Thread = {
  id: string;
  cwd: string;
  title: string;
  messages: Message[];
}
export type ThreadSendRequest = { thread: Thread }
