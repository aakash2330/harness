import type { ThreadSendRequest } from "./thread";

export interface DesktopBridge {
  thread: {
    send(req: ThreadSendRequest): Promise<string>;
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
