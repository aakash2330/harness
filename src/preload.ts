import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./contracts";
import { Channels } from "./ipc/channels";

const api: DesktopBridge = {
  thread: {
    send: (req) => ipcRenderer.invoke(Channels.threadSend, req),
    getAll: () => ipcRenderer.invoke(Channels.threadGetAll),
  },
  dialog: {
    pickDirectory: () => ipcRenderer.invoke(Channels.dialogPickDirectory),
  },
};

contextBridge.exposeInMainWorld("desktop", api);
