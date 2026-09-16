import { create } from "zustand";
import type { Message, Thread } from "../contracts";

type State = {
  threads: Thread[];
  currentId: string | null;
  cwds: string[];
  pending: string[]; // thread ids awaiting a reply
};

export const useStore = create<State>(() => ({ threads: [], currentId: null, cwds: [], pending: [] }));

export const currentThread = (s: State) => s.threads.find((t) => t.id === s.currentId) ?? null;

export async function loadThreads() {
  const threads = await window.desktop.thread.getAll();
  useStore.setState((s) => ({ threads, cwds: [...new Set([...s.cwds, ...threads.map((t) => t.cwd)])] }));
}

export function addCwd(cwd: string) {
  useStore.setState((s) => (s.cwds.includes(cwd) ? s : { cwds: [...s.cwds, cwd] }));
}

export function newThread(cwd: string) {
  const thread: Thread = { id: crypto.randomUUID(), cwd, title: "", messages: [] };
  useStore.setState((s) => ({ threads: [thread, ...s.threads], currentId: thread.id }));
}

export function openThread(id: string) {
  useStore.setState({ currentId: id });
}

function appendMessage(id: string, msg: Message) {
  useStore.setState((s) => ({
    threads: s.threads.map((t) =>
      t.id === id ? { ...t, title: t.title || msg.text.slice(0, 80), messages: [...t.messages, msg] } : t,
    ),
  }));
}

export async function sendMessage(id: string, text: string) {
  appendMessage(id, { role: "user", text });
  useStore.setState((s) => ({ pending: [...s.pending, id] }));
  try {
    const thread = useStore.getState().threads.find((t) => t.id === id)!;
    const reply = await window.desktop.thread.send({ thread });
    appendMessage(id, { role: "assistant", text: reply });
  } catch (e) {
    appendMessage(id, { role: "assistant", text: `Error: ${e instanceof Error ? e.message : String(e)}` });
  } finally {
    useStore.setState((s) => ({ pending: s.pending.filter((p) => p !== id) }));
  }
}
