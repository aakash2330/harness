import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import * as claude from "./claude-auth";

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.webContents.openDevTools();
  win.loadFile(path.join(app.getAppPath(), "dist-renderer", "index.html"));
}

ipcMain.handle("hello", () => "world");
ipcMain.handle("claude:loggedIn", () => !!claude.load());
ipcMain.handle("claude:login", async () => { await claude.login(); });
ipcMain.handle("claude:logout", () => claude.logout());

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
