import { NextResponse } from "next/server";
import { createGoogleAuthorization, googleMailConfigured } from "@/lib/email/google";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", process.env.BETTER_AUTH_URL || "http://localhost:3000"));
  if (!googleMailConfigured()) return NextResponse.redirect(new URL("/settings?mail=not-configured", process.env.BETTER_AUTH_URL || "http://localhost:3000"));
  const authorizationUrl = await createGoogleAuthorization(context.organization.id, context.user.id);
  return NextResponse.redirect(authorizationUrl);
}
