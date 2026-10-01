const REMINDER_DB = "elara-reminders-db";
const REMINDER_STORE = "reminders";
const CHECK_INTERVAL_MS = 30_000;

function openReminderDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REMINDER_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(REMINDER_STORE)) {
        db.createObjectStore(REMINDER_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open reminder database."));
  });
}

async function loadReminderRecords() {
  const db = await openReminderDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REMINDER_STORE, "readonly");
    const store = transaction.objectStore(REMINDER_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Unable to read reminders."));
  });
}

async function saveReminderRecords(records) {
  const db = await openReminderDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REMINDER_STORE, "readwrite");
    const store = transaction.objectStore(REMINDER_STORE);

    records.forEach((record) => store.put(record));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Unable to persist reminders."));
  });
}

async function triggerDueReminders() {
  try {
    const records = await loadReminderRecords();
    if (!Array.isArray(records) || !records.length) return;

    const now = Date.now();
    const due = records.filter((record) => {
      const triggerAt = new Date(record.triggerAt).getTime();
      if (Number.isNaN(triggerAt)) return false;
      return triggerAt <= now && !record.firedAt;
    });

    if (!due.length) return;

    for (const record of due) {
      const body = record.body || (record.source ? `Source: ${record.source}` : "Your Elara reminder is ready.");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        self.registration.showNotification(record.title, {
          body,
          tag: record.id,
          icon: "/icon.png",
        });
      }
    }

    const nextRecords = records.map((record) => {
      const matched = due.some((item) => item.id === record.id);
      return matched ? { ...record, firedAt: new Date().toISOString() } : record;
    });

    await saveReminderRecords(nextRecords);
  } catch {
    // no-op; reminders will retry on next sync pass
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open("elara-shell-v1").then((cache) => cache.addAll(["/", "/icon.png", "/apple-icon.png"]))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CHECK_REMINDERS") {
    event.waitUntil(triggerDueReminders());
  }
});

setInterval(() => {
  void triggerDueReminders();
}, CHECK_INTERVAL_MS);
