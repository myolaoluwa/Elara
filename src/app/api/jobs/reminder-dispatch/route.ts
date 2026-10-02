import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchDueReminders } from "@/lib/reminders/dispatch";

export const runtime = "nodejs";

function authorized(request: Request) {
  const configured = process.env.JOB_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configured || supplied.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await dispatchDueReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reminder dispatch failed", error);
    return NextResponse.json({ error: "Reminder dispatch failed" }, { status: 503 });
  }
}
