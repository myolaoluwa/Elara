"use client";

import { useEffect } from "react";
import { getDueReminders, loadReminders, markReminderFired } from "@/lib/reminder-engine";

function syncRemindersToWorker() {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "SYNC_REMINDERS",
    reminders: loadReminders(),
  });
}

export function ReminderProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: "SYNC_REMINDERS",
            reminders: loadReminders(),
          });
        }
      } catch {
        // Browser may not support service workers for this context.
      }
    };

    const triggerDueReminders = () => {
      const due = getDueReminders(new Date());
      if (!due.length) return;

      due.forEach((reminder) => {
        const body = reminder.body || (reminder.source ? `Source: ${reminder.source}` : "Your Elara reminder is ready.");

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(reminder.title, {
            body,
            tag: reminder.id,
            icon: "/icon.png",
          });
        }

        markReminderFired(reminder.id, new Date());
        syncRemindersToWorker();
      });
    };

    const handleStorageSync = () => syncRemindersToWorker();
    window.addEventListener("storage", handleStorageSync);

    void registerServiceWorker();
    syncRemindersToWorker();
    triggerDueReminders();

    const interval = window.setInterval(triggerDueReminders, 10_000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, []);

  return null;
}
