import type { DesktopBridge } from "./contracts";

declare global {
  interface Window { desktop: DesktopBridge }
}
