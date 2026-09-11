import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const items = ["Home", "Runs", "Settings"];

export function App() {
  const [reply, setReply] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { window.desktop.claudeLoggedIn().then(setLoggedIn); }, []);
  return (
    <SidebarProvider>
      <Sidebar collapsible="none" className="h-svh border-r">
        <SidebarContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item}>
                <SidebarMenuButton>{item}</SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Button
            onClick={async () => {
              await (loggedIn ? window.desktop.claudeLogout() : window.desktop.claudeLogin());
              setLoggedIn(await window.desktop.claudeLoggedIn());
            }}
          >
            {loggedIn ? "Logout" : "Login with Claude"}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="p-6 space-y-4">
          <Button onClick={async () => setReply(await window.desktop.hello())}>
            hello
          </Button>
          <p>{reply}</p>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
