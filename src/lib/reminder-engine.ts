export type ReminderKind = "custom" | "task" | "meeting" | "system";

export type BrowserReminder = {
  id: string;
  title: string;
  triggerAt: string;
  kind: ReminderKind;
  body?: string;
  source?: string;
  createdAt: string;
  firedAt?: string;
};

const STORAGE_KEY = "elara-reminders-v1";
const memoryStore = new Map<string, string>();

function getStorage() {
  if (typeof globalThis === "undefined") return null;
  if ("localStorage" in globalThis) {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

function readStorageValue() {
  const storage = getStorage();
  if (storage) {
    return storage.getItem(STORAGE_KEY) ?? "";
  }
  return memoryStore.get(STORAGE_KEY) ?? "";
}

function writeStorageValue(value: string) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, value);
    return;
  }
  memoryStore.set(STORAGE_KEY, value);
}

function normalizeReminder(reminder: Partial<BrowserReminder>): BrowserReminder | null {
  if (!reminder || typeof reminder !== "object") return null;
  if (!reminder.id || !reminder.title || !reminder.triggerAt || !reminder.kind || !reminder.createdAt) return null;
  return {
    id: String(reminder.id),
    title: String(reminder.title),
    triggerAt: String(reminder.triggerAt),
    kind: reminder.kind as ReminderKind,
    body: reminder.body ? String(reminder.body) : undefined,
    source: reminder.source ? String(reminder.source) : undefined,
    createdAt: String(reminder.createdAt),
    firedAt: reminder.firedAt ? String(reminder.firedAt) : undefined,
  };
}

export function loadReminders(): BrowserReminder[] {
  try {
    const raw = readStorageValue();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeReminder(item)).filter((item): item is BrowserReminder => item !== null);
  } catch {
    return [];
  }
}

export function saveReminders(reminders: BrowserReminder[]) {
  try {
    writeStorageValue(JSON.stringify(reminders));
  } catch {
    // ignore storage quota issues; the app should still render without persisted reminders
  }
}

export function addReminder(reminder: BrowserReminder) {
  const items = loadReminders();
  const normalized = normalizeReminder(reminder) ?? {
    id: `reminder-${Date.now()}`,
    title: "Reminder",
    triggerAt: new Date().toISOString(),
    kind: "custom",
    createdAt: new Date().toISOString(),
  };
  const next = [...items.filter((item) => item.id !== normalized.id), normalized].sort((a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime());
  saveReminders(next);
  return normalized;
}

export function removeReminder(id: string) {
  const items = loadReminders();
  const next = items.filter((item) => item.id !== id);
  saveReminders(next);
  return next;
}

export function markReminderFired(id: string, firedAt = new Date()) {
  const items = loadReminders();
  const next = items.map((item) => {
    if (item.id !== id) return item;
    return { ...item, firedAt: firedAt.toISOString() };
  });
  saveReminders(next);
  return next;
}

export function getDueReminders(now = new Date()) {
  return loadReminders().filter((item) => {
    const dueAt = new Date(item.triggerAt).getTime();
    if (Number.isNaN(dueAt)) return false;
    const fired = item.firedAt ? new Date(item.firedAt).getTime() : null;
    return dueAt <= now.getTime() && (!fired || fired < dueAt);
  });
}

export function getUpcomingReminders(limit = 10) {
  return loadReminders()
    .filter((item) => !item.firedAt)
    .sort((a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime())
    .slice(0, limit);
}
