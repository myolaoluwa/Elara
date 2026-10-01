"use client";

import { useEffect } from "react";
import { getDueReminders, markReminderFired } from "@/lib/reminder-engine";

export function ReminderProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        await navigator.serviceWorker.register("/sw.js");
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
      });
    };

    void registerServiceWorker();

    triggerDueReminders();
    const interval = window.setInterval(triggerDueReminders, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
