export const MAX_ATTACHMENT_COUNT = 3;
export const MAX_ATTACHMENT_BYTES = 3_400_000;
export const MAX_ATTACHMENT_TEXT_CHARS = 24_000;
export const MAX_ATTACHMENT_TOTAL_TEXT_CHARS = 56_000;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml"
]);

import type { ProcessedAttachment } from "../domain/attachments";
export type { ProcessedAttachment } from "../domain/attachments";
const cleanExtractedText = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_ATTACHMENT_TEXT_CHARS);

const extractPdf = async (buffer: Buffer) => {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
};

const extractDocx = async (buffer: Buffer) => {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

const cellToText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const extractWorkbook = async (buffer: Buffer) => {
  const { default: readXlsxFile } = await import("read-excel-file/node");
  const workbook = await readXlsxFile(buffer);
  const lines: string[] = [];
  workbook.slice(0, 8).forEach((sheet) => {
    lines.push(`Hoja: ${sheet.sheet}`);
    for (const row of sheet.data.slice(0, 200)) {
      const cells = row.slice(0, 40).map(cellToText);
      if (cells.some(Boolean)) lines.push(cells.join(" | "));
      if (lines.join("\n").length >= MAX_ATTACHMENT_TEXT_CHARS) break;
    }
    lines.push("");
  });
  return lines.join("\n");
};

const extractDocumentText = async (file: File, buffer: Buffer) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (TEXT_TYPES.has(file.type) || ["txt", "md", "csv", "json", "xml"].includes(extension)) {
    return buffer.toString("utf8");
  }
  if (file.type === "application/pdf" || extension === "pdf") return extractPdf(buffer);
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return extractDocx(buffer);
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === "xlsx"
  ) {
    return extractWorkbook(buffer);
  }
  throw new Error("unsupported_attachment_type");
};

export const isSupportedAttachment = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    IMAGE_TYPES.has(file.type) ||
    TEXT_TYPES.has(file.type) ||
    ["txt", "md", "csv", "json", "xml", "pdf", "docx", "xlsx"].includes(extension)
  );
};

export const processAttachments = async (files: File[]) => {
  if (files.length > MAX_ATTACHMENT_COUNT) throw new Error("too_many_attachments");
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error("attachments_too_large");

  const processed: ProcessedAttachment[] = [];
  let remainingText = MAX_ATTACHMENT_TOTAL_TEXT_CHARS;

  for (const file of files) {
    if (!isSupportedAttachment(file)) throw new Error("unsupported_attachment_type");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (IMAGE_TYPES.has(file.type)) {
      processed.push({
        name: file.name,
        mimeType: file.type,
        size: file.size,
        kind: "image",
        extractedText: null,
        dataUrl: `data:${file.type};base64,${buffer.toString("base64")}`,
        warning: null
      });
      continue;
    }

    try {
      const extracted = cleanExtractedText(await extractDocumentText(file, buffer)).slice(
        0,
        remainingText
      );
      remainingText = Math.max(0, remainingText - extracted.length);
      processed.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        kind: "document",
        extractedText: extracted,
        dataUrl: null,
        warning: extracted
          ? null
          : "No se encontró texto legible. Puede ser un documento escaneado."
      });
    } catch (error) {
      processed.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        kind: "document",
        extractedText: null,
        dataUrl: null,
        warning:
          error instanceof Error && error.message === "unsupported_attachment_type"
            ? "Tipo de archivo no compatible."
            : "No se pudo extraer texto del archivo."
      });
    }
  }
  return processed;
};

export { buildAttachmentContext } from "../domain/attachments";
