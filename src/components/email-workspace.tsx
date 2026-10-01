"use client";
import Link from "next/link";
import { ArrowLeft, CheckSquare2, LoaderCircle, MessageSquareText, FileText, Send } from "lucide-react";
import { useState } from "react";
export function EmailWorkspace({ email, mailboxConnected }: { email: { id: string; subject: string; sender: string; receivedAt: string; bodyText: string }; mailboxConnected: boolean }) {
  const [result, setResult] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  async function action(name: "summarize" | "draft-reply" | "create-task") {
    setPending(name); setDraftId(null); setIsDraft(false);
    try {
      const response = await fetch(`/api/inbox/${email.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name }) });
      const data = await response.json();
      setResult(response.ok ? name === "create-task" ? "Task created and linked to this email." : data.text : data.error || "Unable to complete that action.");
      if (response.ok && name === "draft-reply") { setIsDraft(true); setDraftId(data.savedDraftId || null); }
    } catch { setResult("Unable to reach Elara. Check your connection and try again."); }
    finally { setPending(null); }
  }
  async function sendDraft() {
    if (!draftId) return;
    setPending("send");
    try {
      const response = await fetch(`/api/email/messages/${draftId}`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send this reply.");
      setResult(`Reply sent to ${email.sender}.`); setDraftId(null); setIsDraft(false);
    } catch (error) { setResult(error instanceof Error ? error.message : "Unable to send this reply."); }
    finally { setPending(null); }
  }
  return <><Link className="back-link" href="/inbox"><ArrowLeft size={14} />Inbox</Link><div className="page-heading compact-heading"><div><p className="eyebrow">Imported email</p><h1>{email.subject}</h1><p className="page-subtitle">From {email.sender} · {email.receivedAt}</p></div></div><div className="email-layout"><article className="panel email-body"><p>{email.bodyText}</p></article><aside><section className="panel email-actions"><p className="eyebrow">AI-assisted</p><h2>Prepare the next step</h2><button onClick={() => action("summarize")} disabled={Boolean(pending)}><FileText size={15} />Summarize email</button><button onClick={() => action("draft-reply")} disabled={Boolean(pending)}><MessageSquareText size={15} />Draft reply</button><button onClick={() => action("create-task")} disabled={Boolean(pending)}><CheckSquare2 size={15} />Create response task</button>{pending && <LoaderCircle className="spin" size={16} />}</section>{result && <section className="panel email-result"><p className="eyebrow">{result.startsWith("Task created") || result.startsWith("Reply sent") ? "Complete" : isDraft ? "Draft for review" : "Result"}</p><div>{result}</div>{isDraft && <div className="draft-result-actions">{draftId ? <button className="primary-button" onClick={sendDraft} disabled={Boolean(pending) || !mailboxConnected}>{pending === "send" ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}Send reply now</button> : <Link className="secondary-button" href="/inbox">Open drafts</Link>}{!mailboxConnected && <p>Connect Gmail in Settings to send this draft.</p>}</div>}</section>}</aside></div></>;
}
