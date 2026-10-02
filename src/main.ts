import { app, BrowserWindow, ipcMain } from "electron";
import dotenv from "dotenv";
import path from "node:path";
import { registerThreadSendMessage, registerThreadGetAll } from "./ipc/thread";
import { registerDialog } from "./ipc/dialog";
import { openDatabase } from "./databse/prisma";

dotenv.config({ path: path.join(process.cwd(), ".env") });

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.webContents.openDevTools();
  const devServerUrl = process.env.HARNESS_DEV_SERVER_URL;
  if (devServerUrl) win.loadURL(devServerUrl);
  else win.loadFile(path.join(app.getAppPath(), "dist-renderer", "index.html"));
}

registerThreadSendMessage(ipcMain);
registerThreadGetAll(ipcMain);
registerDialog(ipcMain);

app.whenReady().then(() => {
  openDatabase(path.join(app.getPath("userData"), "state.sqlite"));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
