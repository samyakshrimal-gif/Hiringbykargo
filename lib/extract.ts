import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export async function fileToText(name: string, buf: Buffer): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buf.toString("utf8");
  }
  throw new Error("Unsupported file type. Use PDF, DOCX, TXT or MD.");
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)\d{3,5}[\s-]?\d{3,5}/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b(?:linkedin|github)\.com\/\S+/gi;
const PERSONAL_LINE_RE =
  /^.*\b(date of birth|dob|d\.o\.b|age|gender|sex|marital status|nationality|religion|caste|father'?s name|address)\b\s*[:\-].*$/gim;

function guessName(text: string, fileName: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6);
  for (const l of lines) {
    const cleaned = l.replace(/^(name\s*[:\-]\s*)/i, "").trim();
    const words = cleaned.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      !/\d|@|\|/.test(cleaned) &&
      !/(resume|curriculum|vitae|cv|product|manager|profile|summary)/i.test(cleaned) &&
      words.every((w) => /^[A-Z][A-Za-z.'-]*$/.test(w) || /^[A-Z.'-]+$/.test(w))
    ) {
      return words.map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
    }
  }
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b(cv|resume)\b/gi, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Unnamed candidate";
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface Prepared {
  name: string;
  email: string | null;
  phone: string | null;
  redacted: string;
  redactions: number;
}

// Contact and personal details stay in our database for sending emails;
// the model only ever sees the redacted text.
export function prepare(text: string, fileName: string): Prepared {
  const name = guessName(text, fileName);
  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone =
    text.match(PHONE_RE)?.find((p) => p.replace(/\D/g, "").length >= 10)?.trim() ?? null;

  let count = 0;
  const sub = (re: RegExp, token: string) => (s: string) =>
    s.replace(re, () => {
      count++;
      return token;
    });

  let redacted = text;
  redacted = sub(PERSONAL_LINE_RE, "[personal detail removed]")(redacted);
  redacted = sub(EMAIL_RE, "[email]")(redacted);
  redacted = sub(URL_RE, "[link]")(redacted);
  redacted = redacted.replace(PHONE_RE, (m) => {
    if (m.replace(/\D/g, "").length < 10) return m;
    count++;
    return "[phone]";
  });
  const nameParts = name.split(/\s+/).filter((p) => p.length > 2);
  if (nameParts.length) {
    const re = new RegExp(`\\b(${nameParts.map(escapeRe).join("|")})\\b`, "gi");
    redacted = sub(re, "[candidate]")(redacted);
  }
  redacted = redacted.replace(/\n{3,}/g, "\n\n").trim();

  return { name, email, phone, redacted, redactions: count };
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] || "there";
}
