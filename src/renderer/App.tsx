import { useEffect, useState } from "react";
import { ChevronRight, LogIn, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/chat";
import { Sidebar, SidebarContent, SidebarFooter, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const drag = "[-webkit-app-region:drag]";

export function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { window.desktop?.auth.loggedIn().then(setLoggedIn); }, []);

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem" } as React.CSSProperties}>
      <Sidebar collapsible="none" className="h-svh border-r">
        <div className={cn("h-[30px] shrink-0", drag)} />
        <SidebarContent className="px-2 pt-3">
          <button className="flex h-[27px] items-center gap-2 rounded-md px-1.5 text-sm hover:bg-sidebar-accent">
            <Plus className="size-4 rounded-full bg-neutral-200 p-[3px]" />
            New
          </button>
          <div className="mt-7 flex h-[34px] items-center pl-2 pr-1 text-[13px] text-muted-foreground">
            <button className="flex items-center gap-1 hover:text-foreground">
              capsule
              <ChevronRight className="size-3" />
            </button>
            <Button variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground"><Plus className="size-4" /></Button>
          </div>
        </SidebarContent>
        <SidebarFooter className="items-start px-2 pb-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={loggedIn ? "Logout" : "Login with Claude"}
            title={loggedIn ? "Logout" : "Login with Claude"}
            onClick={async () => {
              await (loggedIn ? window.desktop.auth.logout() : window.desktop.auth.login());
              setLoggedIn(await window.desktop.auth.loggedIn());
            }}
          >
            {loggedIn ? <LogOut /> : <LogIn />}
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="h-svh">
        <div className={cn("h-[30px] shrink-0", drag)} />
        <Chat />
      </SidebarInset>
    </SidebarProvider>
  );
}
