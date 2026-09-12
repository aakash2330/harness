import type { IpcMain } from "electron";
import { Channels } from "./channels";
import * as claude from "../claude-auth";

export function registerAuth(ipc: IpcMain) {
  ipc.handle(Channels.authLoggedIn, () => !!claude.load());
  ipc.handle(Channels.authLogin, async () => { await claude.login(); });
  ipc.handle(Channels.authLogout, () => claude.logout());
}
