"use client";

import { LoaderCircle, Mail, RefreshCw, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Connection = { emailAddress: string; status: string; lastSyncedAt: string | null } | null;

export function MailboxSettings({ connection, configured, notice }: { connection: Connection; configured: boolean; notice?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState(notice || null);

  async function sync() {
    setPending("sync"); setMessage(null);
    try {
      const response = await fetch("/api/email/sync", { method: "POST" });
      const payload = await response.json();
      setMessage(response.ok ? `Gmail synced. ${payload.imported} new message${payload.imported === 1 ? "" : "s"} imported.` : payload.error || "Unable to sync Gmail");
      if (response.ok) router.refresh();
    } catch { setMessage("Unable to reach Elara."); } finally { setPending(null); }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Gmail from Elara? Scheduled messages will no longer be deliverable.")) return;
    setPending("disconnect"); setMessage(null);
    try {
      const response = await fetch("/api/email/connection", { method: "DELETE" });
      const payload = await response.json();
      setMessage(response.ok ? "Gmail disconnected." : payload.error || "Unable to disconnect Gmail");
      if (response.ok) router.refresh();
    } catch { setMessage("Unable to reach Elara."); } finally { setPending(null); }
  }

  return <section className="settings-form panel mailbox-settings"><div><p className="eyebrow">Connected email</p><h2>Gmail access</h2><p>Elara uses delegated OAuth access to read mail, create drafts, and send only from your connected account.</p></div>{connection && connection.status !== "DISCONNECTED" ? <div className="mailbox-row"><div><strong>{connection.emailAddress}</strong><span>{connection.status === "ACTIVE" ? "Connected" : "Reconnect required"}{connection.lastSyncedAt ? ` · Last synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : ""}</span></div><div className="mailbox-actions"><button type="button" onClick={sync} disabled={Boolean(pending)}><RefreshCw size={15} />{pending === "sync" ? "Syncing" : "Sync now"}</button><button className="danger-button" type="button" onClick={disconnect} disabled={Boolean(pending)}><Unplug size={15} />Disconnect</button></div></div> : configured ? <Link className="primary-button mailbox-connect" href="/api/email/connect/google"><Mail size={15} />Connect Gmail</Link> : <p className="settings-message">Google OAuth is not configured on the server yet.</p>}{pending && <LoaderCircle className="spin" size={16} />}{message && <p className="settings-message">{message}</p>}</section>;
}
