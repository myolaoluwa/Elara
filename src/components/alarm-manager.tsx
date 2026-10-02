"use client";

import { BellRing, CalendarClock, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReminderItem = {
  id: string;
  title: string;
  body: string;
  triggerAt: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
  sentAt: string | null;
  lastError: string | null;
};

type ReminderResponse = {
  reminders: ReminderItem[];
  pushConfigured: boolean;
  subscribed: boolean;
};

function decodeApplicationServerKey(value: string) {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function AlarmManager() {
  const [data, setData] = useState<ReminderResponse>({ reminders: [], pushConfigured: false, subscribed: false });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/reminders", { cache: "no-store" });
    if (response.status === 401) throw new Error("Your session expired. Sign in again to manage alarms.");
    if (!response.ok) throw new Error("Could not load alarms.");
    setData(await response.json() as ReminderResponse);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/reminders", { cache: "no-store" });
        if (response.status === 401) throw new Error("Your session expired. Sign in again to manage alarms.");
        if (!response.ok) throw new Error("Could not load alarms.");
        const result = await response.json() as ReminderResponse;
        if (active) setData(result);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load alarms.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Web push requires HTTPS and a browser that supports service-worker notifications.");
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        throw new Error(permissionResult === "denied"
          ? "Notifications are blocked in browser settings. Allow them for this site, then try again."
          : "Notification permission was not granted.");
      }

      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyResult = await keyResponse.json() as { configured?: boolean; publicKey?: string | null; error?: string };
      if (!keyResponse.ok || !keyResult.configured || !keyResult.publicKey) {
        throw new Error(keyResult.error || "Push notifications are not configured on the server yet.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(keyResult.publicKey),
        });
      }

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not register this device for notifications.");

      await refresh();
      setMessage("Notifications are enabled for this device.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestPush() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Test push delivery failed.");
      setMessage("Test push sent. Check this device’s notification center.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Test push delivery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const triggerAt = String(values.get("triggerAt") || "");
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: String(values.get("title") || "").trim(),
          body: String(values.get("body") || "").trim(),
          triggerAt: new Date(triggerAt).toISOString(),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save this alarm.");
      form.reset();
      await refresh();
      setMessage("Alarm saved. Elara will send a browser push notification when it is due.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this alarm.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelReminder(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not cancel this alarm.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel this alarm.");
    } finally {
      setBusy(false);
    }
  }

  const upcoming = data.reminders.filter((item) => item.status === "PENDING" || item.status === "SENDING");
  const history = data.reminders.filter((item) => item.status === "SENT" || item.status === "FAILED").slice(0, 10);

  return (
    <div className="settings-stack">
      <section className="panel">
        <header className="panel-header">
          <div>
            <span className="section-kicker">Notification access</span>
            <h2>Browser push</h2>
          </div>
          {data.subscribed ? <div className="button-row"><span className="badge success">This device enabled</span><button type="button" className="quiet-button" disabled={busy} onClick={sendTestPush}>Send test push</button></div> : <button type="button" className="secondary-button" disabled={busy || !data.pushConfigured} onClick={enableNotifications}>{busy ? "Connecting..." : "Enable notifications"}</button>}
        </header>
        <p className="page-subtitle">
          {data.pushConfigured
            ? "Enable this device once. Elara will then send alarms from the server, including when this page is closed, subject to browser and operating-system delivery rules."
            : "Server push is not configured yet. Add VAPID keys and deploy the reminder worker before enabling alarms."}
        </p>
      </section>

      <section className="panel">
        <header className="panel-header">
          <div>
            <span className="section-kicker">Create</span>
            <h2>Set a custom alarm</h2>
          </div>
        </header>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            Alarm name
            <input name="title" type="text" required maxLength={120} placeholder="Take medication, check in with team, etc." />
          </label>
          <label>
            Trigger time
            <input name="triggerAt" type="datetime-local" required />
          </label>
          <label>
            Notes
            <textarea name="body" rows={3} maxLength={500} placeholder="Optional reminder details." />
          </label>
          <button type="submit" className="primary-button" disabled={busy || loading || !data.pushConfigured || !data.subscribed}>
            <BellRing size={16} />{busy ? "Saving..." : "Save alarm"}
          </button>
          {!data.subscribed && <p className="form-hint">Enable browser push on this device before saving an alarm.</p>}
        </form>
      </section>

      {message && <p className="form-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {permission === "denied" && <p className="form-error" role="status">Browser permission is blocked. Change this site’s notification permission in browser settings.</p>}

      <section className="panel">
        <header className="panel-header">
          <div>
            <span className="section-kicker">Upcoming</span>
            <h2>Alarm list</h2>
          </div>
          <button type="button" className="quiet-button" disabled={busy} onClick={() => { setLoading(true); refresh().catch(() => setError("Could not refresh alarms.")).finally(() => setLoading(false)); }}>Refresh</button>
        </header>
        {loading ? <p className="page-subtitle">Loading alarms...</p> : upcoming.length ? (
          <div className="dashboard-list">
            {upcoming.map((item) => (
              <article key={item.id}>
                <time>{new Date(item.triggerAt).toLocaleString()}</time>
                <div><h3>{item.title}</h3><p>{item.body || "Custom alarm"}{item.status === "SENDING" ? " · Sending" : ""}</p></div>
                {item.status === "PENDING" && <button type="button" className="icon-button" aria-label={`Cancel ${item.title}`} disabled={busy} onClick={() => cancelReminder(item.id)}><Trash2 size={15} /></button>}
              </article>
            ))}
          </div>
        ) : (
          <div className="task-empty"><CalendarClock size={32} /><h2>No upcoming alarms</h2><p>Set an alarm above. It is stored on Elara’s server and dispatched independently of this page.</p></div>
        )}
      </section>

      {history.length > 0 && <section className="panel">
        <header className="panel-header"><div><span className="section-kicker">Delivery history</span><h2>Recent alarms</h2></div></header>
        <div className="dashboard-list">
          {history.map((item) => <article key={item.id}><time>{new Date(item.sentAt || item.triggerAt).toLocaleString()}</time><div><h3>{item.title}</h3><p>{item.status === "SENT" ? "Push accepted by browser service" : item.lastError || "Delivery failed"}</p></div></article>)}
        </div>
      </section>}
    </div>
  );
}
