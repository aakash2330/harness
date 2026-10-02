import type { Thread, ThreadSendRequest } from "./thread";

export type DesktopBridge = {
  thread: {
    send(req: ThreadSendRequest): Promise<string>;
    getAll(): Promise<Thread[]>;
  };
  dialog: {
    pickDirectory(): Promise<string | null>;
  };
};
