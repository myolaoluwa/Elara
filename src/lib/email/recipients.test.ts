import { describe, expect, it } from "vitest";
import { parseRecipientEntries } from "./recipients";

describe("parseRecipientEntries", () => {
  it("accepts plain and named addresses across common separators", () => {
    expect(parseRecipientEntries("Ada <ada@example.com>, sam@example.com\nLee <lee@example.com>")).toEqual([
      { name: "Ada", email: "ada@example.com" },
      { name: "sam", email: "sam@example.com" },
      { name: "Lee", email: "lee@example.com" },
    ]);
  });

  it("deduplicates addresses case-insensitively", () => {
    expect(parseRecipientEntries("Ada@Example.com; Ada Lovelace <ada@example.com>")).toEqual([
      { name: "Ada Lovelace", email: "ada@example.com" },
    ]);
  });

  it("rejects malformed addresses", () => {
    expect(() => parseRecipientEntries("not-an-email")).toThrow("not a valid email address");
  });
});
