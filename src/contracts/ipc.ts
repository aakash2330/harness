import type { Message } from "./chat";

export interface DesktopBridge {
  chat: {
    send(messages: Message[]): Promise<string>;
  };
  auth: {
    loggedIn(): Promise<boolean>;
    login(): Promise<void>;
    logout(): Promise<void>;
  };
}
