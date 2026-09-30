import { NextResponse } from "next/server";

export class RequestBodyError extends Error {
  constructor(message: string, readonly status: 400 | 413 | 415 = 400) {
    super(message);
  }
}

export function rejectCrossOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  const requestUrl = new URL(request.url);
  const host = firstHeaderValue(request.headers.get("x-forwarded-host")) || request.headers.get("host") || requestUrl.host;
  const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto")) || requestUrl.protocol.replace(":", "");

  try {
    if (new URL(origin).origin !== `${protocol}://${host}`) {
      return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}

export function rejectOversizedBody(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;
  const bytes = Number(contentLength);
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    return NextResponse.json({ error: "Invalid Content-Length" }, { status: 400 });
  }
  if (bytes > maxBytes) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  return null;
}

export function rejectReadOnlyRole(role: string) {
  return role === "VIEWER"
    ? NextResponse.json({ error: "Insufficient permission" }, { status: 403 })
    : null;
}

export async function readJsonBody(request: Request, maxBytes = 1_000_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new RequestBodyError("Content-Type must be application/json", 415);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > maxBytes) throw new RequestBodyError("Request body is too large", 413);

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new RequestBodyError("Request body is too large", 413);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new RequestBodyError("Malformed JSON");
  }
}

type RateLimitEntry = { count: number; resetAt: number };
const rateLimits = new Map<string, RateLimitEntry>();

/** Best-effort per-instance protection. Production should additionally use an edge/distributed limiter. */
export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = rateLimits.get(key);
  const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  entry.count += 1;
  rateLimits.set(key, entry);

  if (rateLimits.size > 10_000) {
    for (const [candidate, value] of rateLimits) if (value.resetAt <= now) rateLimits.delete(candidate);
  }

  if (entry.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "retry-after": String(retryAfter), "cache-control": "no-store" } },
  );
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}
