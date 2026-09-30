import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

type Environment = Record<string, string | undefined>;

function encryptionKey(environment: Environment = process.env) {
  const raw = environment.EMAIL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value");
  return key;
}

export function encryptSecret(value: string, environment: Environment = process.env) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(environment), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string, environment: Environment = process.env) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) throw new Error("Invalid encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(environment), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state).digest("base64url");
}
