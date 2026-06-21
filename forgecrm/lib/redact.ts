// lib/redact.ts — data protection (Phase 8.5). Before any tenant/customer text is sent to the
// LLM, strip direct identifiers (emails, phone numbers) — data minimisation to the processor,
// the core UK-GDPR principle. Names in our data are first-name only; full names are masked too.

/** Mask emails and phone numbers in free text. */
export function redactContact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email redacted]")
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, "[phone redacted]");
}

/** Mask known full names down to the first name (so the model still reads naturally). */
export function redactNames(text: string, names: string[]): string {
  let out = text;
  for (const full of names) {
    const parts = full.trim().split(/\s+/);
    if (parts.length > 1) out = out.split(full).join(parts[0]);
  }
  return out;
}

/** Full redaction pass for content destined for the LLM. */
export function redactForLLM(text: string, names: string[] = []): string {
  return redactNames(redactContact(text), names);
}
