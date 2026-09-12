import { useState } from "react";
import { CornerDownLeft, LoaderCircle } from "lucide-react";
import { CircleLoader } from "react-spinners";
import { Input } from "@/components/ui/input";
import type { Message, Thread } from "../../contracts";


export function Chat({ thread }: { thread: Thread }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  async function send(text: string) {
    const next: Message[] = [...messages, { role: "user", text }];
    setMessages(next);
    setPending(true);
    try {
      const reply = await window.desktop.chat.send({ thread, messages: next });
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-12 pb-6 text-[15px] leading-5">
          {messages.map((m, i) => <MessageBubble key={i} {...m} />)}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 pb-4">
        <ChatInput pending={pending} onSend={send} />
      </div>
    </>
  );
}

function MessageBubble({ role, text }: Message) {
  if (role === "assistant") return <p>{text}</p>;
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-xl bg-secondary px-3 py-[7px]">{text}</div>
    </div>
  );
}

function ChatInput({ pending, onSend }: { pending: boolean; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  function submit() {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    onSend(text);
  }

  return (
    <div className="relative">
      {pending && (
        <div className="mb-2 flex justify-start">
          <CircleLoader color="var(--primary)" size={20} />
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        className="pr-8"
      />
      {pending ? (
        <LoaderCircle className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-primary" />
      ) : (
        <button
          aria-label="Send"
          onClick={submit}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <CornerDownLeft className="size-4" />
        </button>
      )}
    </div>
  );
}
