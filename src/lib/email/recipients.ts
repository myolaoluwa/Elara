export type ParsedRecipient = { name: string; email: string };

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function parseRecipientEntries(value: string): ParsedRecipient[] {
  const recipients = value
    .split(/[;,\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const named = entry.match(/^(.+?)\s*<([^<>]+)>$/);
      const email = (named?.[2] || entry).trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) throw new Error(`“${entry}” is not a valid email address.`);
      const name = named?.[1].trim().replace(/^['"]|['"]$/g, "") || email.split("@")[0];
      return { name, email };
    });

  const unique = new Map(recipients.map((recipient) => [recipient.email, recipient]));
  return [...unique.values()];
}
