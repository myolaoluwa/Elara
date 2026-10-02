self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Elara reminder", body: event.data?.text() || "An alarm is due." };
  }

  const title = typeof payload.title === "string" && payload.title ? payload.title : "Elara reminder";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "An alarm is due.",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: typeof payload.reminderId === "string" ? `elara-reminder-${payload.reminderId}` : "elara-reminder",
    data: { url: typeof payload.url === "string" ? payload.url : "/alarms" },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/alarms", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client && client.url !== target) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
