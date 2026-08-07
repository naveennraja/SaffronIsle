import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import {
  extractTocFromMdx,
  headingIdFromChildren,
  slugifyHeading,
} from '../lib/toc'

/**
 * The contract these tests exist for: the id in the table of contents and the id
 * on the rendered heading are derived from the same source through different
 * inputs, and an anchor only works if they agree. They did not agree once — see
 * the "both sides agree" block at the bottom, which is the regression.
 */

describe('slugifyHeading', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyHeading('Getting Started')).toBe('getting-started')
  })

  it('strips inline markdown', () => {
    expect(slugifyHeading('**Career Help**')).toBe('career-help')
    expect(slugifyHeading('`PPS` numbers')).toBe('pps-numbers')
  })

  it('drops punctuation but keeps hyphens', () => {
    expect(slugifyHeading("Ireland's visas: a guide")).toBe('irelands-visas-a-guide')
    expect(slugifyHeading('Work-life balance')).toBe('work-life-balance')
  })

  it('collapses runs of whitespace', () => {
    expect(slugifyHeading('Too   many    spaces')).toBe('too-many-spaces')
  })
})

describe('extractTocFromMdx', () => {
  const mdx = [
    '# Page title',
    'Some intro text.',
    '## Career Help',
    'Body.',
    '### 1. Intreo',
    '## **Free Courses**',
    '#### Too deep',
  ].join('\n')

  it('takes h2 and h3 only', () => {
    expect(extractTocFromMdx(mdx).map((i) => i.level)).toEqual([2, 3, 2])
  })

  it('reports text without its markdown', () => {
    expect(extractTocFromMdx(mdx).map((i) => i.text)).toEqual([
      'Career Help',
      '1. Intreo',
      'Free Courses',
    ])
  })

  it('ignores headings inside body prose', () => {
    expect(extractTocFromMdx('Text mentioning ## not a heading')).toEqual([])
  })
})

describe('headingIdFromChildren', () => {
  it('reads a bare string', () => {
    expect(headingIdFromChildren('Career Help')).toBe('career-help')
  })

  it('reads through a wrapping element', () => {
    const bold = createElement('strong', null, 'Career Help')
    expect(headingIdFromChildren([bold])).toBe('career-help')
  })

  it('reads through nesting and mixed children', () => {
    const link = createElement('a', { href: '#' }, 'Intreo')
    expect(headingIdFromChildren(['1. ', link, ' explained'])).toBe(
      '1-intreo-explained'
    )
  })

  it('ignores nulls and booleans React allows as children', () => {
    expect(headingIdFromChildren(['Career', null, false, ' Help'])).toBe('career-help')
  })
})

describe('both sides agree', () => {
  // The bug: a formatted heading rendered id="object-object" — every such
  // heading on the page shared it, and no TOC link resolved.
  it('matches for a heading that is entirely bold', () => {
    const [item] = extractTocFromMdx('## **Career Help**')
    const rendered = headingIdFromChildren([
      createElement('strong', null, 'Career Help'),
    ])
    expect(rendered).not.toBe('object-object')
    expect(rendered).toBe(item.id)
  })

  it('matches for a heading with partial formatting', () => {
    const [item] = extractTocFromMdx('### 2. **SOLAS** Skills to Advance')
    const rendered = headingIdFromChildren([
      '2. ',
      createElement('strong', null, 'SOLAS'),
      ' Skills to Advance',
    ])
    expect(rendered).toBe(item.id)
  })
})
