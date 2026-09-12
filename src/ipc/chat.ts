import type { IpcMain } from "electron";
import { Channels } from "./channels";

export function registerChat(ipc: IpcMain) {
  ipc.handle(Channels.chatSend, (_e, _text: string) => "world");
}
