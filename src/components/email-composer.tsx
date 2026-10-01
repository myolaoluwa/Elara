"use client";

import { FormEvent, useState } from "react";
import { Clock3, FileEdit, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseRecipientEntries } from "@/lib/email/recipients";

type Contact = { id: string; name: string; email: string | null };
type Group = { id: string; name: string; memberCount: number };

export function EmailComposer({ contacts, groups, mailboxConnected }: { contacts: Contact[]; groups: Group[]; mailboxConnected: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null); const [failed, setFailed] = useState(false);
  const [action, setAction] = useState<"draft" | "send" | "schedule">("draft");
  const [recipientMode, setRecipientMode] = useState<"saved" | "direct">("saved");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setFailed(false); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const requestedAction = submitter instanceof HTMLButtonElement && ["draft", "send", "schedule"].includes(submitter.value) ? submitter.value as "draft" | "send" | "schedule" : action;
    const scheduledRaw = String(form.get("scheduledAt") || "");
    try {
      const recipientType = form.get("recipientType");
      const recipientId = String(form.get("recipientId") || "");
      const selection = recipientMode === "direct"
        ? { recipients: parseRecipientEntries(String(form.get("directRecipients") || "")) }
        : recipientType === "group" ? { groupId: recipientId } : { contactIds: [recipientId] };
      if (recipientMode === "direct" && !selection.recipients?.length) throw new Error("Enter at least one email address.");
      const body = { subject: form.get("subject"), bodyText: form.get("bodyText"), action: requestedAction, ...selection, ...(requestedAction === "schedule" && scheduledRaw ? { scheduledAt: new Date(scheduledRaw).toISOString() } : {}) };
      const response = await fetch("/api/email/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      setFailed(!response.ok); setMessage(response.ok ? requestedAction === "send" ? `${payload.messages.length} personalized email${payload.messages.length === 1 ? "" : "s"} sent.` : requestedAction === "schedule" ? `${payload.messages.length} personalized email${payload.messages.length === 1 ? "" : "s"} scheduled.` : `${payload.messages.length} draft${payload.messages.length === 1 ? "" : "s"} prepared.` : payload.error || "Unable to prepare email");
      if (response.ok) { formElement.reset(); setAction("draft"); router.refresh(); }
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Unable to reach Elara."); } finally { setPending(false); }
  }
  const options = [...groups.map((group) => ({ type: "group", id: group.id, label: `${group.name} (${group.memberCount})` })), ...contacts.filter((contact) => contact.email).map((contact) => ({ type: "contact", id: contact.id, label: `${contact.name} · ${contact.email}` }))];
  return <section className="panel email-composer"><header><div><p className="eyebrow">Compose</p><h2>Send to anyone, personally</h2><p>Choose saved people or enter new addresses. Groups are delivered as private, personalized copies.</p></div></header><form onSubmit={submit}><div className="recipient-mode" role="group" aria-label="Recipient source"><button type="button" aria-pressed={recipientMode === "saved"} className={recipientMode === "saved" ? "selected" : ""} onClick={() => setRecipientMode("saved")}>Contacts & groups</button><button type="button" aria-pressed={recipientMode === "direct"} className={recipientMode === "direct" ? "selected" : ""} onClick={() => setRecipientMode("direct")}>Type email addresses</button></div>{recipientMode === "saved" ? <label>Recipient or group<select name="recipientSelection" required defaultValue="" onChange={(event) => { const [type, id] = event.target.value.split(":"); const form = event.currentTarget.form; if (form) { (form.elements.namedItem("recipientType") as HTMLInputElement).value = type; (form.elements.namedItem("recipientId") as HTMLInputElement).value = id; } }}><option value="" disabled>Select a recipient</option>{options.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.label}</option>)}</select></label> : <label>Email addresses<textarea name="directRecipients" rows={3} required placeholder="name@example.com, Alex Morgan <alex@example.com>" /><span className="field-hint">Separate multiple addresses with commas or new lines. They will receive individual copies.</span></label>}<input type="hidden" name="recipientType" /><input type="hidden" name="recipientId" /><label>Subject<input name="subject" required maxLength={200} /></label><label>Message<textarea name="bodyText" rows={8} required maxLength={50000} placeholder="Write naturally. Use {{firstName}} or {{name}} for personalization." /></label>{action === "schedule" && <label>Send at<input name="scheduledAt" type="datetime-local" required /></label>}<div className="compose-actions">{action === "schedule" ? <><button type="button" onClick={() => setAction("draft")} disabled={pending}>Cancel schedule</button><button className="primary-button" type="submit" value="schedule" disabled={pending || !mailboxConnected}><Clock3 size={15} />Confirm schedule</button></> : <><button type="submit" value="draft" disabled={pending}><FileEdit size={15} />Save draft</button><button type="button" onClick={() => setAction("schedule")} disabled={pending || !mailboxConnected}><Clock3 size={15} />Schedule</button><button className="primary-button" type="submit" value="send" disabled={pending || !mailboxConnected}>{pending ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}Send now</button></>}</div>{!mailboxConnected && <p className="settings-message">Connect Gmail in Settings to send or schedule. Local drafts are still available.</p>}{message && <p className={failed ? "form-error" : "settings-message"} role={failed ? "alert" : "status"}>{message}</p>}</form></section>;
}
