import { describe, test, expect } from 'vitest'
import matter from 'gray-matter'
import { buildFrontmatter } from '../lib/frontmatter.js'

const base = {
  title: 'Renting in Dublin',
  slug: 'renting-in-dublin',
  category: 'housing',
  description: 'What to expect when you start looking.',
  date: '2026-08-06',
}

/**
 * Every test parses the block the way the site does, rather than asserting on
 * the generated text. A string that merely looks escaped is worth nothing —
 * what matters is that gray-matter reads back exactly what went in.
 */
const roundTrip = (fields) => {
  const block = buildFrontmatter({ ...base, ...fields })
  return matter(`${block}\n\nBody paragraph.\n`)
}

describe('buildFrontmatter', () => {
  test('emits the fields the article loader requires', () => {
    const { data } = roundTrip({})

    // Mirrors REQUIRED_FIELDS in lib/articles.ts.
    for (const field of [
      'title',
      'description',
      'date',
      'category',
      'author',
      'coverImage',
      'coverAlt',
    ]) {
      expect(data[field], `missing ${field}`).toBeTruthy()
      expect(typeof data[field]).toBe('string')
    }
  })

  test('keeps numbers and booleans typed rather than stringified', () => {
    const { data } = roundTrip({})

    expect(data.readTime).toBe(5)
    expect(data.featured).toBe(false)
  })

  test('derives the cover image path from the slug and extension', () => {
    expect(roundTrip({}).data.coverImage).toBe(
      '/images/articles/renting-in-dublin.jpg'
    )
    expect(roundTrip({ imageExt: 'png' }).data.coverImage).toBe(
      '/images/articles/renting-in-dublin.png'
    )
  })

  test('leaves the body untouched', () => {
    expect(roundTrip({}).content.trim()).toBe('Body paragraph.')
  })
})

describe('buildFrontmatter — values that used to break the build', () => {
  // Straight quotes in a description produced `description: "She said "x""`,
  // which is not valid YAML. gray-matter threw, and because lib/articles.ts
  // parses every file with no per-file recovery, the whole build died.
  test('survives double quotes in the description', () => {
    const description = 'She said "come to Ireland" and I did.'

    expect(() => roundTrip({ description })).not.toThrow()
    expect(roundTrip({ description }).data.description).toBe(description)
  })

  test('survives double quotes in the title, which reach coverAlt too', () => {
    // The admin form's title input has no autocorrect, so straight quotes
    // arrive verbatim — the most likely way to hit this in practice.
    const title = 'The "Real" Cost of Dublin Rent'
    const { data } = roundTrip({ title })

    expect(data.title).toBe(title)
    expect(data.coverAlt).toBe(title)
  })

  test('survives backslashes', () => {
    const description = 'Use the C:\\Users\\ path, or \\n to break a line.'

    expect(roundTrip({ description }).data.description).toBe(description)
  })

  test('survives colons, which YAML treats as key separators', () => {
    const title = 'Visas: what Stamp 4 actually means'

    expect(roundTrip({ title }).data.title).toBe(title)
  })

  test('survives a newline inside a value', () => {
    const description = 'First line.\nSecond line.'

    expect(roundTrip({ description }).data.description).toBe(description)
  })

  test('survives leading characters YAML reads as structure', () => {
    for (const description of [
      '- a leading dash',
      '# a leading hash',
      '> a leading angle bracket',
      '@ a leading at sign',
      '*emphasis at the start',
      '{ a leading brace',
      '[ a leading bracket',
    ]) {
      expect(roundTrip({ description }).data.description).toBe(description)
    }
  })

  test('preserves the curly quotes and accents Word actually produces', () => {
    const description = 'Word’s autocorrect gives “curly” quotes — and en dashes.'

    expect(roundTrip({ description }).data.description).toBe(description)
  })

  test('survives a value that is only a quote', () => {
    expect(roundTrip({ description: '"' }).data.description).toBe('"')
  })
})

describe('buildFrontmatter — metaTitle', () => {
  test('omits the key entirely when no meta title is given', () => {
    const { data } = roundTrip({})

    // Absent, not "". The reader falls back to `title` on absence, and an
    // empty string would read as a deliberate (blank) SEO title.
    expect('metaTitle' in data).toBe(false)
  })

  test('omits the key when the meta title is blank or whitespace', () => {
    expect('metaTitle' in roundTrip({ metaTitle: '' }).data).toBe(false)
    expect('metaTitle' in roundTrip({ metaTitle: '   ' }).data).toBe(false)
  })

  test('carries the meta title through without touching the article title', () => {
    const { data } = roundTrip({
      metaTitle: 'Renting in Dublin: Costs, Deposits & Tenant Rights (2026)',
    })

    expect(data.metaTitle).toBe(
      'Renting in Dublin: Costs, Deposits & Tenant Rights (2026)'
    )
    expect(data.title).toBe('Renting in Dublin')
    // coverAlt describes the image, so it tracks the on-page title.
    expect(data.coverAlt).toBe('Renting in Dublin')
  })

  test('escapes a meta title containing quotes and colons', () => {
    const hostile = 'She said "go": a guide — 100% free'
    const { data } = roundTrip({ metaTitle: hostile })

    expect(data.metaTitle).toBe(hostile)
  })
})
