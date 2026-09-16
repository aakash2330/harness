import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./contracts";
import { Channels } from "./ipc/channels";

const api: DesktopBridge = {
  thread: {
    send: (req) => ipcRenderer.invoke(Channels.threadSend, req),
  },
  dialog: {
    pickDirectory: () => ipcRenderer.invoke(Channels.dialogPickDirectory),
  },
  auth: {
    loggedIn: () => ipcRenderer.invoke(Channels.authLoggedIn),
    login: () => ipcRenderer.invoke(Channels.authLogin),
    logout: () => ipcRenderer.invoke(Channels.authLogout),
  },
};

contextBridge.exposeInMainWorld("desktop", api);
