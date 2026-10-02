import webpush from "web-push";

export function getWebPushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@elara.app";

  return { publicKey, privateKey, subject, configured: Boolean(publicKey && privateKey) };
}

export function getWebPushPublicKey() {
  const config = getWebPushConfig();
  return config.configured ? config.publicKey : null;
}

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; reminderId: string; url: string },
) {
  const config = getWebPushConfig();
  if (!config.configured) throw new Error("Web Push is not configured on the server.");

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload),
    { TTL: 86_400, urgency: "high", timeout: 10_000 },
  );
}
