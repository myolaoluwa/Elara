import path from "node:path";
import { parseOffice } from "officeparser";

const parseable = new Set([".pdf", ".docx", ".xlsx", ".pptx", ".csv", ".txt", ".md", ".rtf"]);

export async function extractDocumentText(name: string, bytes: Buffer) {
  const extension = path.extname(name).toLowerCase();
  if (extension === ".txt" || extension === ".md" || extension === ".csv") return bytes.toString("utf8").slice(0, 1_000_000);
  if (!parseable.has(extension)) return null;
  const ast = await parseOffice(bytes, { fileType: extension.slice(1) as "pdf", ocr: extension === ".pdf" });
  const output = await ast.to("text", { textConfig: { preserveLayout: false } });
  return output.value.slice(0, 1_000_000);
}
