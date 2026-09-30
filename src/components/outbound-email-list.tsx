"use client";

import { Clock3, LoaderCircle, MailCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Message = { id: string; toName: string; toEmail: string; subject: string; status: string; scheduledAt: string | null; sentAt: string | null; lastError: string | null };

export function OutboundEmailList({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  async function cancel(id: string) {
    setPending(id);
    try {
      const response = await fetch(`/api/email/messages/${id}`, { method: "DELETE" });
      if (response.ok) router.refresh();
    } finally { setPending(null); }
  }
  if (!messages.length) return null;
  return <section className="panel outbound-list"><header><div><p className="eyebrow">Outgoing mail</p><h2>Drafts and delivery</h2></div><MailCheck size={19} /></header>{messages.map((message) => <article key={message.id}><span className={`outbound-status ${message.status.toLowerCase()}`}>{message.status.replace("_", " ")}</span><div><strong>{message.subject}</strong><p>To {message.toName} · {message.toEmail}</p>{message.scheduledAt && message.status === "SCHEDULED" && <p><Clock3 size={11} /> {new Date(message.scheduledAt).toLocaleString()}</p>}{message.lastError && <p className="form-error">{message.lastError}</p>}</div>{["DRAFT", "SCHEDULED"].includes(message.status) && <button aria-label={`Cancel ${message.subject}`} onClick={() => cancel(message.id)} disabled={pending === message.id}>{pending === message.id ? <LoaderCircle className="spin" size={14} /> : <X size={14} />}</button>}</article>)}</section>;
}
