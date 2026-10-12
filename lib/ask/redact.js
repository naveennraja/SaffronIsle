// @ts-check
/**
 * Strips personal details from a reader's question before it is saved.
 *
 * This is the deterministic half of redaction and always runs first. It
 * removes everything that has a recognisable shape — emails, phone numbers,
 * IP addresses, PPS and passport numbers, Eircodes, long ID-like digit runs,
 * links. Names have no shape, so they are left to a model pass afterwards
 * (lib/ask/scrub.ts); if that pass fails, this result is what gets saved, so
 * it has to be safe on its own.
 *
 * The rules lean towards removing too much. A question that loses a stray
 * number is still useful for spotting topics; a saved phone number is a
 * GDPR problem.
 *
 * CommonJS to match the other shared modules in lib/, and so the tests can
 * require it directly.
 */

const REMOVED = '[removed]'

/** @type {[RegExp, string | ((m: string) => string)][]} */
const RULES = [
  // Links first: a URL can carry an email or an ID in its query string.
  [/\b(?:https?:\/\/|www\.)\S+/gi, REMOVED],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REMOVED],
  // IPv4 and the common IPv6 forms.
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, REMOVED],
  [/\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/gi, REMOVED],
  // PPS number: seven digits and one or two letters (1234567T, 1234567TW).
  [/\b\d{7}[A-Z]{1,2}\b/gi, REMOVED],
  // Indian passport: one letter, seven digits (A1234567).
  [/\b[A-Z]\s?\d{7}\b/gi, REMOVED],
  // Eircode: routing key (A65, D6W) plus a four-character identifier that
  // contains at least one digit — which keeps "D01 area" or "A12 card" intact.
  [/\b(?:[AC-FHKNPRTV-Y]\d{2}|D6W)\s?(?=[0-9AC-FHKNPRTV-Y]{0,3}\d)[0-9AC-FHKNPRTV-Y]{4}\b/gi, REMOVED],
  // Phone numbers and card/reference numbers: any run of digits (with spaces,
  // dashes, dots, brackets or a leading +) holding eight or more digits.
  // Fewer than eight leaves amounts, years and hours alone; a year range like
  // "2024-2025" is spared explicitly.
  [
    /\+?\(?\d[\d\s().-]{6,}\d/g,
    (m) => {
      const digits = m.replace(/\D/g, '')
      if (digits.length < 8) return m
      if (/^(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}$/.test(m.trim())) return m
      return REMOVED
    },
  ],
]

/**
 * @param {string} text
 * @returns {string}
 */
function redact(text) {
  let out = String(text)
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, /** @type {any} */ (replacement))
  }
  // Collapse runs left behind by adjacent removals.
  return out.replace(/(\[removed\][\s,;]*){2,}/g, `${REMOVED} `).replace(/\s+/g, ' ').trim()
}

module.exports = { redact, REMOVED }
