import { describe, expect, it } from "vitest";
import { safeDocumentName, validateDocumentBytes } from "./validation";

describe("document validation", () => {
  it("accepts a PDF with the expected signature", () => {
    expect(validateDocumentBytes("brief.pdf", Buffer.from("%PDF-1.7"))?.mimeType).toBe("application/pdf");
  });

  it("rejects extension-only spoofing", () => {
    expect(validateDocumentBytes("payload.pdf", Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });

  it("removes paths and control characters from display names", () => {
    expect(safeDocumentName("../../secret\u0000.txt")).toBe("secret.txt");
  });
});
