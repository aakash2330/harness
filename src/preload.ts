import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./contracts";
import { Channels } from "./ipc/channels";

const api: DesktopBridge = {
  chat: {
    send: (text) => ipcRenderer.invoke(Channels.chatSend, text),
  },
  auth: {
    loggedIn: () => ipcRenderer.invoke(Channels.authLoggedIn),
    login: () => ipcRenderer.invoke(Channels.authLogin),
    logout: () => ipcRenderer.invoke(Channels.authLogout),
  },
};

contextBridge.exposeInMainWorld("desktop", api);
