import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { getWebPushPublicKey } from "@/lib/web-push";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const publicKey = getWebPushPublicKey();
  return NextResponse.json({ configured: Boolean(publicKey), publicKey });
}
