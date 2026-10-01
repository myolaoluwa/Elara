"use client";

import { ArrowUp, LoaderCircle, UserRound } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };
const suggestions = ["What’s happening today?", "What tasks are overdue?", "What am I waiting for?", "What decisions have we recorded?"];

function ElaraAvatar({ className = "" }: { className?: string }) {
  return <span className={`elara-avatar ${className}`} aria-hidden="true"><Image src="/images/elara-avatar.png" alt="" width={96} height={96} /></span>;
}

export function CommandCenter({ initialConversationId = null, initialMessages = [], history = [] }: { initialConversationId?: string | null; initialMessages?: Message[]; history?: { id: string; title: string | null; updatedAt: string }[] }) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pending, setPending] = useState(false);

  async function ask(prompt: string) {
    if (!prompt.trim() || pending) return;
    setPending(true);
    const userMessage: Message = { role: "user", content: prompt.trim() };
    setMessages((current) => [...current, userMessage, { role: "assistant", content: "" }]);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, conversationId }) });
      if (!response.ok || !response.body) throw new Error("AI request failed");
      const workspaceUpdated = response.headers.get("x-workspace-updated") === "true";
      setConversationId(response.headers.get("x-conversation-id"));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const delta = decoder.decode(value, { stream: true });
        setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + delta } : message));
      }
      if (workspaceUpdated) router.refresh();
    } catch {
      setMessages((current) => [...current.slice(0, -1), { role: "assistant", content: "I couldn’t process that request." }]);
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form).get("prompt")?.toString() || "";
    form.reset();
    void ask(input);
  }

  return (
    <div className="command-layout">
      <section className="command-main panel">
        <header className="command-header"><ElaraAvatar className="header-avatar" /><div><p className="eyebrow">Command center</p><h1>Ask Elara</h1><p>Answers stay grounded in your workspace.</p></div></header>
        <div className="message-thread">
          {messages.length === 0 ? <div className="command-welcome"><ElaraAvatar className="welcome-avatar" /><h2>What should we get ahead of?</h2><p>Ask questions or create tasks, reminders, calendar events, meetings, follow-ups, contacts, projects, research, travel plans, and other workspace records.</p><div className="suggestion-grid">{suggestions.map((suggestion) => <button onClick={() => ask(suggestion)} key={suggestion}>{suggestion}</button>)}</div></div> : messages.map((message, index) => <article className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.role === "user" ? <span className="user-avatar"><UserRound size={15} /></span> : <ElaraAvatar className="message-avatar" />}<div className="chat-content">{message.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : <LoaderCircle className="spin" size={16} />}</div></article>)}
        </div>
        <form className="command-input" onSubmit={submit}><textarea name="prompt" required rows={1} placeholder="Ask about your workspace…" /><button disabled={pending} aria-label="Send"><ArrowUp size={17} /></button></form>
      </section>
      <aside className="command-side"><div className="panel grounding-card"><p className="eyebrow">Grounding</p><h2>Workspace facts only</h2><p>If a detail isn’t in connected or imported data, Elara will say so. Read actions are automatic; important mutations remain supervised.</p></div><div className="panel conversation-history"><p className="eyebrow">Recent conversations</p>{history.length ? history.map((item) => <a className={item.id === conversationId ? "active" : ""} href={`/command?conversation=${item.id}`} key={item.id}>{item.title || "Untitled conversation"}<span>{new Date(item.updatedAt).toLocaleDateString()}</span></a>) : <p>No conversations yet.</p>}</div></aside>
    </div>
  );
}
