"use client";

import { Clock3, LoaderCircle, MailCheck, RotateCcw, Send, X } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Message = { id: string; toName: string; toEmail: string; subject: string; status: string; scheduledAt: string | null; sentAt: string | null; lastError: string | null };

export function OutboundEmailList({ messages, mailboxConnected }: { messages: Message[]; mailboxConnected: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function cancel(id: string) {
    setPending(id);
    setError(null);
    try {
      const response = await fetch(`/api/email/messages/${id}`, { method: "DELETE" });
      if (response.ok) router.refresh();
      else setError("Unable to cancel this message. Please try again.");
    } catch { setError("Unable to reach Elara. Check your connection and try again."); }
    finally { setPending(null); }
  }
  async function send(id: string) {
    setPending(id);
    setError(null);
    try {
      const response = await fetch(`/api/email/messages/${id}`, { method: "PATCH" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to send this message.");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to reach Elara."); }
    finally { setPending(null); }
  }
  if (!messages.length) return null;
  return <section className="panel outbound-list"><header><div><p className="eyebrow">Outgoing mail</p><h2>Drafts and delivery</h2></div><MailCheck size={19} /></header>{error && <p className="form-error" role="alert">{error}</p>}{messages.map((message) => <article key={message.id}><span className={`outbound-status ${message.status.toLowerCase()}`}>{message.status.replace("_", " ")}</span><div><strong>{message.subject}</strong><p>To {message.toName} · {message.toEmail}</p>{message.scheduledAt && message.status === "SCHEDULED" && <p><Clock3 size={11} /> <LocalDateTime value={message.scheduledAt} /></p>}{message.lastError && <p className="form-error">{message.lastError}</p>}</div><div className="outbound-actions">{["DRAFT", "FAILED"].includes(message.status) && <button className="send-draft-button" aria-label={`${message.status === "FAILED" ? "Retry" : "Send"} ${message.subject}`} title={mailboxConnected ? (message.status === "FAILED" ? "Retry send" : "Send now") : "Connect Gmail to send"} onClick={() => send(message.id)} disabled={pending === message.id || !mailboxConnected}>{pending === message.id ? <LoaderCircle className="spin" size={14} /> : message.status === "FAILED" ? <RotateCcw size={14} /> : <Send size={14} />}<span>{message.status === "FAILED" ? "Retry" : "Send"}</span></button>}{["DRAFT", "SCHEDULED"].includes(message.status) && <button className="cancel-email-button" aria-label={`Cancel ${message.subject}`} title="Cancel" onClick={() => cancel(message.id)} disabled={pending === message.id}>{pending === message.id ? <LoaderCircle className="spin" size={14} /> : <X size={14} />}</button>}</div></article>)}</section>;
}
