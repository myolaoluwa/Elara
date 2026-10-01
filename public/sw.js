const CHECK_INTERVAL_MS = 10_000;
let reminders = [];

function normalizeReminderRecord(record) {
  if (!record || typeof record !== "object") return null;
  if (!record.id || !record.triggerAt || !record.title) return null;
  return {
    ...record,
    triggerAt: String(record.triggerAt),
    title: String(record.title),
    body: record.body ? String(record.body) : undefined,
    source: record.source ? String(record.source) : undefined,
    kind: record.kind || "custom",
    createdAt: record.createdAt ? String(record.createdAt) : new Date().toISOString(),
  };
}

async function triggerDueReminders() {
  try {
    const now = Date.now();
    const due = reminders.filter((record) => {
      const triggerAt = new Date(record.triggerAt).getTime();
      return !Number.isNaN(triggerAt) && triggerAt <= now && !record.firedAt;
    });

    if (!due.length) return;

    for (const record of due) {
      const body = record.body || (record.source ? `Source: ${record.source}` : "Your Elara reminder is ready.");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        self.registration.showNotification(record.title, { body, tag: record.id, icon: "/icon.png" });
      }
    }

    reminders = reminders.map((record) => {
      const matched = due.some((item) => item.id === record.id);
      return matched ? { ...record, firedAt: new Date().toISOString() } : record;
    });
  } catch {
    // no-op; reminder checks will retry on the next interval
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open("elara-shell-v1").then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icon.png", "/apple-icon.png"]))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (!event.data || typeof event.data !== "object") return;

  if (event.data.type === "SYNC_REMINDERS") {
    const incoming = Array.isArray(event.data.reminders) ? event.data.reminders : [];
    reminders = incoming.map(normalizeReminderRecord).filter(Boolean);
    return;
  }

  if (event.data.type === "CHECK_REMINDERS") {
    event.waitUntil(triggerDueReminders());
  }
});

setInterval(() => {
  void triggerDueReminders();
}, CHECK_INTERVAL_MS);
