/** Sanitize display name: strip HTML, control chars, RTL overrides, trim, limit length */
export function sanitizeDisplayName(name: string): string {
  return name
    .trim()
    .replace(/[<>&"']/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 20)
}
