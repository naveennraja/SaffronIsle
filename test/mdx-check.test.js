import { describe, test, expect } from 'vitest'
import { checkMdx } from '../lib/mdx-check.js'
import { convertDocx, htmlToMarkdown } from '../lib/docx-to-mdx.js'
import { buildDocx } from './helpers/docx.js'

describe('checkMdx', () => {
  test('accepts ordinary prose', async () => {
    const result = await checkMdx('# Title\n\nA sentence, and a [link](https://x.ie).')
    expect(result.ok).toBe(true)
  })

  test('accepts the ArticleImage blocks the converter emits', async () => {
    const result = await checkMdx(
      'Before.\n\n<ArticleImage src="/images/articles/a/01.png" alt="A queue" width="400" height="300" />\n\nAfter.'
    )
    expect(result.ok).toBe(true)
  })

  test('rejects a raw < and names the character', async () => {
    const result = await checkMdx('Salaries <2000 euro are common.')

    expect(result.ok).toBe(false)
    // Actionable in Word: the character, the text to search for, no MDX jargon.
    expect(result.error).toContain('"<"')
    expect(result.error).toContain('<2000')
    expect(result.error).not.toContain('U+')
  })

  test('rejects an unparseable brace and names that instead', async () => {
    const result = await checkMdx('Costs {a b} 500 euro.')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('"{"')
    expect(result.error).toContain('{a b}')
  })

  test('points at the offending line, not the first one', async () => {
    const result = await checkMdx('Fine opening.\n\nMore prose.\n\nSalaries <2000 euro.')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Salaries <2000 euro.')
    expect(result.error).not.toContain('Fine opening')
  })

  test('keeps the compiler message for the logs', async () => {
    const result = await checkMdx('Salaries <2000 euro.')
    expect(result.detail).toMatch(/Unexpected character/)
  })
})

describe('the converter and the gate together', () => {
  // The point of the pair: escaping means these documents publish rather than
  // being rejected. The gate is the backstop for whatever escaping misses.
  const risky = [
    'Salaries <2000 euro are common.',
    'Use the <b> tag carefully.',
    'Compare <IRP and PPS numbers.',
    'Costs {around} 500 euro.',
  ]

  test.each(risky)('a document reading %j compiles', async (text) => {
    const { markdown } = await convertDocx({
      buffer: await buildDocx([{ text }]),
      slug: 'risky',
    })

    expect((await checkMdx(markdown)).ok).toBe(true)
  })

  test('the escaped output still says what the writer typed', () => {
    // &lt; is not a workaround the reader ever sees — MDX decodes it back.
    expect(htmlToMarkdown('<p>Salaries &lt;2000 euro.</p>')).toBe(
      'Salaries &lt;2000 euro.'
    )
  })
})
