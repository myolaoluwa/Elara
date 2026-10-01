"use client";

import { AppShell } from "@/components/app-shell";
import { addReminder, getUpcomingReminders, loadReminders, removeReminder } from "@/lib/reminder-engine";
import { BellRing, CalendarClock, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const defaultTitle = "Personal alarm";

export default function AlarmPage() {
  const [entries, setEntries] = useState(() => loadReminders().filter((item) => item.kind === "custom"));
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setEntries(loadReminders().filter((item) => item.kind === "custom"));
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const upcoming = useMemo(() => getUpcomingReminders(20).filter((item) => item.kind === "custom"), [entries]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || defaultTitle).trim() || defaultTitle;
    const triggerAt = String(form.get("triggerAt") || "");
    const body = String(form.get("body") || "");

    if (!triggerAt) return;

    addReminder({
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      body: body || "Alarm triggered from your Elara web app.",
      triggerAt: new Date(triggerAt).toISOString(),
      kind: "custom",
      source: "browser-alarm",
      createdAt: new Date().toISOString(),
    });

    setEntries(loadReminders().filter((item) => item.kind === "custom"));
    event.currentTarget.reset();
  }

  function handleDelete(id: string) {
    removeReminder(id);
    setEntries(loadReminders().filter((item) => item.kind === "custom"));
  }

  return (
    <AppShell workspaceName="Personal workspace" userName="You">
      <div className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Alerts</p>
          <h1>Alarms</h1>
          <p className="page-subtitle">Set personal alarms outside tasks and meeting reminders so your browser can notify you whenever they are due.</p>
        </div>
      </div>

      <div className="settings-stack">
        <section className="panel">
          <header className="panel-header">
            <div>
              <span className="section-kicker">Notification access</span>
              <h2>Browser alerts</h2>
            </div>
            {permission === "granted" ? <span className="badge success">Enabled</span> : <button type="button" className="secondary-button" onClick={enableNotifications}>Enable notifications</button>}
          </header>
          <p className="page-subtitle">This permission lets the web app display alarm and reminder notifications even when the browser is in the background.</p>
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
              <input name="title" type="text" defaultValue={defaultTitle} maxLength={120} placeholder="Take medication, check in with team, etc." />
            </label>
            <label>
              Trigger time
              <input name="triggerAt" type="datetime-local" required />
            </label>
            <label>
              Notes
              <textarea name="body" rows={3} maxLength={500} placeholder="Optional reminder details." />
            </label>
            <button type="submit" className="primary-button"><BellRing size={16} />Save alarm</button>
          </form>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <span className="section-kicker">Upcoming</span>
              <h2>Alarm list</h2>
            </div>
          </header>

          {upcoming.length ? (
            <div className="dashboard-list">
              {upcoming.map((item) => (
                <article key={item.id}>
                  <time>{new Date(item.triggerAt).toLocaleString()}</time>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body || "Custom browser alarm"}</p>
                  </div>
                  <button type="button" className="icon-button" aria-label={`Remove ${item.title}`} onClick={() => handleDelete(item.id)}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>
          ) : (
            <div className="task-empty">
              <CalendarClock size={32} />
              <h2>No alarms yet</h2>
              <p>Create the first reminder above and the browser will notify you at the scheduled time.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
