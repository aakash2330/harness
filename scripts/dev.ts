// Dev loop: renderer served with HMR; main/preload rebuilt on save, then Electron is relaunched.
import fs from "node:fs";
import index from "../src/renderer/index.html";

const env = { ...process.env, HARNESS_DEV_SERVER_URL: "http://127.0.0.1:5733" };
const run = (...cmd: string[]) => Bun.spawn(cmd, { env, stdout: "inherit", stderr: "inherit" });

Bun.serve({ hostname: "127.0.0.1", port: 5733, routes: { "/*": index }, development: { hmr: true, console: true } });

let electron: Bun.Subprocess | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
async function relaunch() {
  electron?.kill();
  await electron?.exited;
  electron = run("node_modules/.bin/electron", ".");
}

fs.mkdirSync("dist-electron", { recursive: true });
fs.watch("dist-electron", () => { clearTimeout(timer); timer = setTimeout(relaunch, 120); });
run("bun", "run", "build:electron", "--watch"); // initial build triggers the first launch
