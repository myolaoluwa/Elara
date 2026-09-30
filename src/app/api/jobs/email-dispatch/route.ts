import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchDueEmails } from "@/lib/email/outbound";
import { syncActiveGmailMailboxes } from "@/lib/email/google";

function authorized(request: Request) {
  const configured = process.env.JOB_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configured || supplied.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [results, mailboxSync] = await Promise.all([dispatchDueEmails(), syncActiveGmailMailboxes()]);
  return NextResponse.json({ processed: results.length, sent: results.filter((item) => item.status === "sent").length, failed: results.filter((item) => item.status === "failed").length, mailboxesSynced: mailboxSync.filter((item) => item.status === "synced").length, mailboxSyncFailed: mailboxSync.filter((item) => item.status === "failed").length });
}
