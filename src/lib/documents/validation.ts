import path from "node:path";

export const allowedDocumentExtensions = new Set([".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".csv", ".rtf"]);

const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".rtf": "application/rtf",
};

export function safeDocumentName(originalName: string) {
  const baseName = path.basename(originalName).normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (baseName || "document").slice(0, 180);
}

export function validateDocumentBytes(name: string, bytes: Buffer) {
  const extension = path.extname(name).toLowerCase();
  if (!allowedDocumentExtensions.has(extension)) return null;

  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
  const valid = extension === ".pdf" ? bytes.subarray(0, 5).toString("ascii") === "%PDF-"
    : [".docx", ".xlsx", ".pptx"].includes(extension) ? isZip
      : extension === ".png" ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : [".jpg", ".jpeg"].includes(extension) ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : extension === ".webp" ? bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
            : extension === ".rtf" ? bytes.subarray(0, 5).toString("ascii") === "{\\rtf"
              : !bytes.subarray(0, 8192).includes(0);

  return valid ? { extension, mimeType: mimeTypes[extension]! } : null;
}
