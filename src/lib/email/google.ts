import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, hashOAuthState } from "./crypto";
import { cleanHeader } from "./personalization";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1";
const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.modify"];

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export function googleMailConfigured(environment: NodeJS.ProcessEnv = process.env) {
  return Boolean(environment.GOOGLE_CLIENT_ID?.trim() && environment.GOOGLE_CLIENT_SECRET?.trim() && environment.EMAIL_TOKEN_ENCRYPTION_KEY?.trim());
}

function googleConfig(environment: NodeJS.ProcessEnv = process.env) {
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = environment.BETTER_AUTH_URL?.trim()?.replace(/\/$/, "");
  if (!clientId || !clientSecret || !appUrl) throw new Error("Google mailbox OAuth is not configured");
  return { clientId, clientSecret, redirectUri: `${appUrl}/api/email/connect/google/callback` };
}

export async function createGoogleAuthorization(organizationId: string, userId: string) {
  const config = googleConfig();
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  await prisma.oAuthState.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { organizationId, userId, provider: "GMAIL" }] } });
  await prisma.oAuthState.create({
    data: {
      stateHash: hashOAuthState(state),
      organizationId,
      userId,
      provider: "GMAIL",
      codeVerifierEncrypted: encryptSecret(codeVerifier),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function completeGoogleAuthorization(state: string, code: string) {
  const stateHash = hashOAuthState(state);
  const record = await prisma.oAuthState.findUnique({ where: { stateHash } });
  if (!record || record.provider !== "GMAIL" || record.expiresAt <= new Date()) {
    if (record) await prisma.oAuthState.delete({ where: { id: record.id } });
    throw new Error("The mailbox connection request expired. Please try again.");
  }
  const config = googleConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: decryptSecret(record.codeVerifierEncrypted),
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const tokens = await response.json() as GoogleTokenResponse & { error?: string };
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error || "Google did not authorize this mailbox");
  const profile = await gmailFetch<{ emailAddress: string; historyId?: string }>(tokens.access_token, "/users/me/profile");
  const existing = await prisma.mailboxConnection.findUnique({
    where: { organizationId_userId_provider: { organizationId: record.organizationId, userId: record.userId, provider: "GMAIL" } },
  });
  const refreshToken = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : existing?.refreshTokenEncrypted;
  if (!refreshToken) throw new Error("Google did not return offline access. Reconnect and approve access.");
  const connection = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.mailboxConnection.upsert({
      where: { organizationId_userId_provider: { organizationId: record.organizationId, userId: record.userId, provider: "GMAIL" } },
      create: {
        organizationId: record.organizationId,
        userId: record.userId,
        provider: "GMAIL",
        emailAddress: profile.emailAddress.toLowerCase(),
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: refreshToken,
        accessTokenExpiresAt: tokenExpiry(tokens.expires_in),
        scopesJson: JSON.stringify((tokens.scope || GMAIL_SCOPES.join(" ")).split(" ")),
        historyId: profile.historyId,
      },
      update: {
        emailAddress: profile.emailAddress.toLowerCase(),
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: refreshToken,
        accessTokenExpiresAt: tokenExpiry(tokens.expires_in),
        scopesJson: JSON.stringify((tokens.scope || GMAIL_SCOPES.join(" ")).split(" ")),
        historyId: profile.historyId,
        status: "ACTIVE",
      },
    });
    await transaction.oAuthState.delete({ where: { id: record.id } });
    await transaction.activityLog.create({ data: { organizationId: record.organizationId, actorUserId: record.userId, actorType: "user", action: "mailbox.connected", entityType: "mailbox", entityId: saved.id, source: "settings" } });
    return saved;
  });
  return connection;
}

export async function getGoogleAccessToken(connectionId: string) {
  const connection = await prisma.mailboxConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.provider !== "GMAIL" || connection.status === "DISCONNECTED") throw new Error("Mailbox is not connected");
  if (!connection.accessTokenExpiresAt || connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) return { connection, accessToken: decryptSecret(connection.accessTokenEncrypted) };
  if (!connection.refreshTokenEncrypted) throw new Error("Mailbox must be reconnected");
  const config = googleConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: decryptSecret(connection.refreshTokenEncrypted), grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(20_000),
  });
  const tokens = await response.json() as GoogleTokenResponse & { error?: string };
  if (!response.ok || !tokens.access_token) {
    await prisma.mailboxConnection.update({ where: { id: connection.id }, data: { status: "REAUTH_REQUIRED" } });
    throw new Error("Mailbox authorization expired. Reconnect Gmail.");
  }
  const updated = await prisma.mailboxConnection.update({ where: { id: connection.id }, data: { accessTokenEncrypted: encryptSecret(tokens.access_token), accessTokenExpiresAt: tokenExpiry(tokens.expires_in), status: "ACTIVE" } });
  return { connection: updated, accessToken: tokens.access_token };
}

export async function disconnectGoogleMailbox(connectionId: string, organizationId: string, userId: string) {
  const connection = await prisma.mailboxConnection.findFirst({ where: { id: connectionId, organizationId, userId, provider: "GMAIL" } });
  if (!connection) return false;
  const encryptedToken = connection.refreshTokenEncrypted || connection.accessTokenEncrypted;
  if (encryptedToken && encryptedToken !== "revoked") {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: decryptSecret(encryptedToken) }), signal: AbortSignal.timeout(15_000) });
    } catch {
      // Local access is still removed if Google is temporarily unavailable.
    }
  }
  await prisma.$transaction([
    prisma.mailboxConnection.update({ where: { id: connection.id }, data: { status: "DISCONNECTED", accessTokenEncrypted: "revoked", refreshTokenEncrypted: null, accessTokenExpiresAt: null } }),
    prisma.activityLog.create({ data: { organizationId, actorUserId: userId, actorType: "user", action: "mailbox.disconnected", entityType: "mailbox", entityId: connection.id, source: "settings" } }),
  ]);
  return true;
}

export async function sendGmailMessage(connectionId: string, message: { fromName: string; toEmail: string; toName: string; subject: string; bodyText: string; threadId?: string | null }) {
  const { connection, accessToken } = await getGoogleAccessToken(connectionId);
  const raw = createMimeMessage({ ...message, fromEmail: connection.emailAddress });
  return gmailFetch<{ id: string; threadId: string }>(accessToken, "/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw, threadId: message.threadId || undefined }) });
}

export async function createGmailDraft(connectionId: string, message: { fromName: string; toEmail: string; toName: string; subject: string; bodyText: string; threadId?: string | null }) {
  const { connection, accessToken } = await getGoogleAccessToken(connectionId);
  const raw = createMimeMessage({ ...message, fromEmail: connection.emailAddress });
  return gmailFetch<{ id: string; message: { id: string; threadId: string } }>(accessToken, "/users/me/drafts", { method: "POST", body: JSON.stringify({ message: { raw, threadId: message.threadId || undefined } }) });
}

export async function syncRecentGmail(connectionId: string, limit = 50) {
  const { connection, accessToken } = await getGoogleAccessToken(connectionId);
  const list = await gmailFetch<{ messages?: { id: string; threadId: string }[]; resultSizeEstimate?: number }>(accessToken, `/users/me/messages?maxResults=${Math.min(Math.max(limit, 1), 100)}&q=${encodeURIComponent("newer_than:30d")}`);
  let imported = 0;
  for (const item of list.messages || []) {
    const exists = await prisma.email.findUnique({ where: { organizationId_provider_externalId: { organizationId: connection.organizationId, provider: "gmail", externalId: item.id } }, select: { id: true } });
    if (exists) continue;
    const message = await gmailFetch<GmailMessage>(accessToken, `/users/me/messages/${encodeURIComponent(item.id)}?format=full`);
    const headers = new Map((message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value]));
    const from = headers.get("from") || "Unknown sender";
    const emailAddress = extractAddress(from);
    const contact = emailAddress ? await prisma.contact.findFirst({ where: { organizationId: connection.organizationId, email: emailAddress } }) : null;
    await prisma.email.create({ data: {
      organizationId: connection.organizationId,
      contactId: contact?.id,
      provider: "gmail",
      externalId: message.id,
      threadId: message.threadId,
      subject: headers.get("subject") || "(no subject)",
      sender: from,
      recipientsJson: JSON.stringify(splitAddresses(headers.get("to") || "")),
      bodyText: extractText(message.payload).slice(0, 100_000),
      receivedAt: message.internalDate ? new Date(Number(message.internalDate)) : new Date(),
      isImportant: message.labelIds?.includes("IMPORTANT") || false,
    } });
    imported += 1;
  }
  await prisma.mailboxConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
  return { imported, scanned: list.messages?.length || 0 };
}

export async function syncActiveGmailMailboxes(limit = 10) {
  const connections = await prisma.mailboxConnection.findMany({ where: { provider: "GMAIL", status: "ACTIVE" }, orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } }, take: limit, select: { id: true } });
  const results = [];
  for (const connection of connections) {
    try {
      const result = await syncRecentGmail(connection.id, 25);
      results.push({ id: connection.id, status: "synced" as const, ...result });
    } catch (error) {
      results.push({ id: connection.id, status: "failed" as const, error: error instanceof Error ? error.message : "Sync failed" });
    }
  }
  return results;
}

function createMimeMessage(input: { fromName: string; fromEmail: string; toName: string; toEmail: string; subject: string; bodyText: string }) {
  const headers = [
    `From: ${encodeHeader(cleanHeader(input.fromName))} <${cleanHeader(input.fromEmail)}>`,
    `To: ${encodeHeader(cleanHeader(input.toName))} <${cleanHeader(input.toEmail)}>`,
    `Subject: ${encodeHeader(cleanHeader(input.subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  const body = Buffer.from(input.bodyText, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`, "utf8").toString("base64url");
}

function encodeHeader(value: string) {
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

async function gmailFetch<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${GMAIL_API_URL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || `Gmail request failed (${response.status})`);
  return body;
}

function tokenExpiry(expiresIn?: number) {
  return expiresIn ? new Date(Date.now() + Math.max(0, expiresIn - 60) * 1000) : null;
}

type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[]; headers?: { name: string; value: string }[] };
type GmailMessage = { id: string; threadId: string; internalDate?: string; labelIds?: string[]; payload?: GmailPart };

function extractText(part?: GmailPart): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8");
  return (part.parts || []).map(extractText).filter(Boolean).join("\n");
}

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/) || value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return match?.[1]?.toLowerCase() || match?.[0]?.toLowerCase() || null;
}

function splitAddresses(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
