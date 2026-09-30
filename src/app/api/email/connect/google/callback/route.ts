import { NextResponse } from "next/server";
import { completeGoogleAuthorization } from "@/lib/email/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.BETTER_AUTH_URL || url.origin;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  if (providerError) return NextResponse.redirect(new URL(`/settings?mail=${encodeURIComponent(providerError)}`, base));
  if (!state || !code) return NextResponse.redirect(new URL("/settings?mail=invalid-callback", base));
  try {
    await completeGoogleAuthorization(state, code);
    return NextResponse.redirect(new URL("/settings?mail=connected", base));
  } catch {
    return NextResponse.redirect(new URL("/settings?mail=connection-failed", base));
  }
}
