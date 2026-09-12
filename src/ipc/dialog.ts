import { dialog, type IpcMain } from "electron";
import { Channels } from "./channels";

export function registerDialog(ipc: IpcMain) {
  ipc.handle(Channels.dialogPickDirectory, async () => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return filePaths[0] ?? null;
  });
}
