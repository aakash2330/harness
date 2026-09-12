import type { ChatSendRequest } from "./chat";

export interface DesktopBridge {
  chat: {
    send(req: ChatSendRequest): Promise<string>;
  };
  dialog: {
    pickDirectory(): Promise<string | null>;
  };
  auth: {
    loggedIn(): Promise<boolean>;
    login(): Promise<void>;
    logout(): Promise<void>;
  };
}
