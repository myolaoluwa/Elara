import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storageRoot = path.join(process.cwd(), ".data", "uploads");

export async function storeDocument(organizationId: string, originalName: string, bytes: Buffer) {
  const extension = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const directory = path.join(storageRoot, organizationId);
  await mkdir(directory, { recursive: true });
  const storageKey = `${organizationId}/${randomUUID()}${extension}`;
  await writeFile(path.join(storageRoot, storageKey), bytes, { flag: "wx" });
  return storageKey;
}

export async function readDocument(storageKey: string) {
  const resolved = path.resolve(storageRoot, storageKey);
  if (!resolved.startsWith(`${path.resolve(storageRoot)}${path.sep}`)) throw new Error("Invalid storage key");
  return readFile(resolved);
}
