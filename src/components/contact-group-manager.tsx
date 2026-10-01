"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";

type Contact = { id: string; name: string; email: string | null };
type Group = { id: string; name: string; description: string | null; members: { contact: Contact }[] };

export function ContactGroupManager({ contacts, groups }: { contacts: Contact[]; groups: Group[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null); const [failed, setFailed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setFailed(false); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/email/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), contactIds: form.getAll("contactIds") }) });
      const payload = await response.json();
      setFailed(!response.ok); setMessage(response.ok ? "Email group created." : payload.error || "Unable to create group");
      if (response.ok) { formElement.reset(); router.refresh(); }
    } catch { setFailed(true); setMessage("Unable to reach Elara."); } finally { setPending(false); }
  }
  return <section className="panel group-manager"><header><div><p className="eyebrow">Email groups</p><h2>Personalized group delivery</h2><p>Each member receives an individual message addressed to them. Recipient addresses are never exposed to the rest of the group.</p></div><UsersRound size={20} /></header><div className="group-grid"><form onSubmit={submit}><label>Group name<input name="name" required maxLength={100} placeholder="Board members" /></label><label>Description<input name="description" maxLength={500} placeholder="Optional context for the assistant" /></label><fieldset><legend>Members with email addresses</legend>{contacts.filter((contact) => contact.email).map((contact) => <label className="check-row" key={contact.id}><input type="checkbox" name="contactIds" value={contact.id} />{contact.name}<span>{contact.email}</span></label>)}</fieldset><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={15} /> : <UsersRound size={15} />}Create group</button>{message && <p className={failed ? "form-error" : "settings-message"} role={failed ? "alert" : "status"}>{message}</p>}</form><div className="group-list">{groups.length ? groups.map((group) => <article key={group.id}><strong>{group.name}</strong><p>{group.description || `${group.members.length} member${group.members.length === 1 ? "" : "s"}`}</p><span>{group.members.map((member) => member.contact.name).join(", ") || "No members yet"}</span></article>) : <p>No email groups yet.</p>}</div></div></section>;
}
