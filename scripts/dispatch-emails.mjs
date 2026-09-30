const appUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL;
const secret = process.env.JOB_SECRET;
if (!appUrl || !secret) {
  console.error("APP_URL/BETTER_AUTH_URL and JOB_SECRET are required");
  process.exit(1);
}
const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/jobs/email-dispatch`, { method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) });
if (!response.ok) {
  console.error(`Email dispatch failed with HTTP ${response.status}`);
  process.exit(1);
}
const result = await response.json();
console.log(`Processed ${result.processed} scheduled email(s): ${result.sent} sent, ${result.failed} failed. Synced ${result.mailboxesSynced} mailbox(es), ${result.mailboxSyncFailed} failed.`);
