const appUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL;
const secret = process.env.JOB_SECRET;
const intervalMs = Number(process.env.REMINDER_POLL_INTERVAL_MS || 15_000);

if (!appUrl || !secret) {
  console.error("APP_URL/BETTER_AUTH_URL and JOB_SECRET are required");
  process.exit(1);
}

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

while (!stopping) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/jobs/reminder-dispatch`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      console.error(`Reminder dispatch returned HTTP ${response.status}`);
    } else {
      const result = await response.json();
      if (result.processed > 0) {
        console.log(`Processed ${result.processed} reminder(s): ${result.sent} sent, ${result.failed} failed, ${result.retried} queued for retry.`);
      }
    }
  } catch (error) {
    console.error("Reminder dispatch request failed", error instanceof Error ? error.message : "Unknown error");
  }

  const delay = Math.max(0, intervalMs - (Date.now() - startedAt));
  if (stopping) break;
  await new Promise((resolve) => setTimeout(resolve, delay));
}
