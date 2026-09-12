import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./contracts";
import { Channels } from "./ipc/channels";

const api: DesktopBridge = {
  chat: {
    send: (messages) => ipcRenderer.invoke(Channels.chatSend, messages),
  },
  auth: {
    loggedIn: () => ipcRenderer.invoke(Channels.authLoggedIn),
    login: () => ipcRenderer.invoke(Channels.authLogin),
    logout: () => ipcRenderer.invoke(Channels.authLogout),
  },
};

contextBridge.exposeInMainWorld("desktop", api);
