import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  hello: (): Promise<string> => ipcRenderer.invoke("hello"),
  claudeLoggedIn: (): Promise<boolean> => ipcRenderer.invoke("claude:loggedIn"),
  claudeLogin: (): Promise<void> => ipcRenderer.invoke("claude:login"),
  claudeLogout: (): Promise<void> => ipcRenderer.invoke("claude:logout"),
});
