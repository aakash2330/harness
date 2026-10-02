import { useEffect } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadView } from "@/components/thread";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { addCwd, currentThread, loadThreads, newThread, openThread, useStore } from "./store";

const drag = "[-webkit-app-region:drag]";

export function App() {
  useEffect(() => { loadThreads(); }, []);
  const cwds = useStore((s) => s.cwds);
  const threads = useStore((s) => s.threads);
  const thread = useStore(currentThread);

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem" } as React.CSSProperties}>
      <Sidebar collapsible="none" className="h-svh border-r">
        <div className={cn("h-[30px] shrink-0", drag)} />
        <SidebarContent className="px-2 pt-3">
          <button
            className="flex h-[27px] items-center gap-2 rounded-md px-1.5 text-sm hover:bg-sidebar-accent"
            onClick={async () => {
              const cwd = await window.desktop.dialog.pickDirectory();
              if (!cwd) return;
              addCwd(cwd);
              newThread(cwd);
            }}
          >
            <Plus className="size-4 rounded-full bg-neutral-200 p-[3px]" />
            New
          </button>
          {cwds.map((cwd) => (
            <div key={cwd} className="mt-7">
            <div className="flex h-[34px] items-center pl-2 pr-1 text-[13px] text-muted-foreground">
              <button className="flex items-center gap-1 hover:text-foreground" title={cwd}>
                {cwd.split("/").pop()}
                <ChevronRight className="size-3" />
              </button>
              <Button variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground" aria-label="New thread" onClick={() => newThread(cwd)}>
                <Plus className="size-4" />
              </Button>
            </div>
            {threads.filter((t) => t.cwd === cwd && t.messages.length).map((t) => (
              <button
                key={t.id}
                className={cn("flex h-[27px] w-full items-center truncate rounded-md px-1.5 text-sm hover:bg-sidebar-accent", t.id === thread?.id && "bg-sidebar-accent")}
                onClick={() => openThread(t.id)}
              >
                {t.title}
              </button>
            ))}
            </div>
          ))}
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="h-svh">
        <div className={cn("h-[30px] shrink-0", drag)} />
        {thread && (
          <ThreadView key={thread.id} thread={thread} />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
