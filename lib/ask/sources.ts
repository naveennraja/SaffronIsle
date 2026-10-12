import type { AskDocument } from './documents'

/**
 * Which articles an answer came from, and whether it needs the immigration
 * note — both decided in code rather than by the model.
 *
 * Sources come from the API's citations, not from article names the model
 * happens to mention, so "this answer used the IRP guide" is a fact about the
 * response rather than a claim inside it. An answer with no citations, or one
 * that opens by saying the topic isn't covered, counts as not answered.
 */

export interface AskSource extends AskDocument {}

/**
 * The exact opening the prompt requires when the articles don't answer the
 * question asked. Citations alone can't tell "answered" from "not covered,
 * but here is something related" — an answer can cite the first-time IRP
 * guide while saying renewal isn't covered — so the opening is the signal.
 */
export const NOT_COVERED_OPENING = "Saffron Isle doesn't have an article on"

export function saysNotCovered(answer: string): boolean {
  // Tolerate a curly apostrophe or leading whitespace/markdown.
  const start = answer.replace(/^[\s*_>#-]+/, '').replace(/’/g, "'")
  return start.toLowerCase().startsWith(NOT_COVERED_OPENING.toLowerCase())
}

/** Answered from the articles: something was cited, and the model didn't say the topic is missing. */
export function isAnswered(answer: string, sources: AskSource[]): boolean {
  return sources.length > 0 && !saysNotCovered(answer)
}

/** The only part of a citation this needs; every document citation carries it. */
interface CitationLike {
  document_index?: number
}

export function collectSources(
  citations: CitationLike[],
  documents: AskDocument[]
): AskSource[] {
  const seen = new Set<number>()
  const sources: AskSource[] = []
  for (const citation of citations) {
    const index = citation.document_index
    if (typeof index !== 'number' || seen.has(index)) continue
    const doc = documents[index]
    if (!doc) continue
    seen.add(index)
    sources.push(doc)
  }
  return sources
}

/**
 * Words that make a question an immigration question even when the answer
 * cites nothing from the visa category — "Can I work 40 hours on Stamp 2?" is
 * answered from a student-life article but is still an immigration rule.
 */
const IMMIGRATION_PATTERN =
  /\b(visas?|irp|gnib|stamp\s?[0-9]|stamp|permits?|immigration|residen(ce|cy)|citizenship|naturali[sz]ation|isd|inis|deport\w*|asylum|re-?entry)\b/i

/**
 * Rules change faster than articles, so anything touching immigration points
 * readers at the official source. Deterministic on purpose: this note matters
 * most exactly when the model is most likely to sound confident.
 */
export function needsImmigrationNote(question: string, sources: AskSource[]): boolean {
  return sources.some((s) => s.category === 'visa') || IMMIGRATION_PATTERN.test(question)
}
