import { describe, expect, it } from 'vitest'
import { buildAskDocuments, mdxToPlainText } from '../lib/ask/documents'
import { collectSources, isAnswered, needsImmigrationNote, saysNotCovered } from '../lib/ask/sources'
import { parseInline } from '../lib/ask/format'
import { checkQuestion, createRateLimiter, QUESTION_MAX } from '../lib/ask/limits'

const article = (slug: string, category: string, content = `Body of ${slug}.`) => ({
  slug,
  category,
  title: `Title ${slug}`,
  content,
})

describe('buildAskDocuments', () => {
  it('orders by slug so the cached prefix does not change when a newer article is published', () => {
    const a = buildAskDocuments([article('pps', 'visa'), article('groceries', 'food-groceries')])
    const b = buildAskDocuments([article('groceries', 'food-groceries'), article('pps', 'visa')])
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(a.documents.map((d) => d.slug)).toEqual(['groceries', 'pps'])
  })

  it('keeps documents[i] in step with blocks[i], which is what citations index into', () => {
    const { documents, blocks } = buildAskDocuments([
      article('irp', 'visa'),
      article('bank', 'finances'),
      article('ucd', 'student-life'),
    ])
    documents.forEach((doc, i) => {
      expect(blocks[i].title).toBe(doc.title)
      expect(blocks[i].context).toContain(`/articles/${doc.slug}`)
    })
  })

  it('enables citations on every document and caches only after the last', () => {
    const { blocks } = buildAskDocuments([article('a', 'visa'), article('b', 'visa'), article('c', 'visa')])
    expect(blocks.every((b) => b.citations.enabled)).toBe(true)
    expect(blocks.map((b) => Boolean(b.cache_control))).toEqual([false, false, true])
  })
})

describe('mdxToPlainText', () => {
  it('drops image components and unwraps callouts, keeping their text', () => {
    const mdx = [
      'Intro.',
      '<ArticleImage src="/images/a.png" alt="A shop" width="800" height="600" />',
      '<Callout type="tip">Book early.</Callout>',
    ].join('\n\n')
    const text = mdxToPlainText(mdx)
    expect(text).not.toContain('ArticleImage')
    expect(text).not.toContain('<Callout')
    expect(text).toContain('Book early.')
  })
})

describe('collectSources', () => {
  const documents = [
    { slug: 'groceries', title: 'Groceries', category: 'food-groceries' },
    { slug: 'irp', title: 'IRP', category: 'visa' },
  ]

  it('maps citation indexes to articles, once each, in first-cited order', () => {
    const sources = collectSources(
      [{ document_index: 1 }, { document_index: 0 }, { document_index: 1 }],
      documents
    )
    expect(sources.map((s) => s.slug)).toEqual(['irp', 'groceries'])
  })

  it('ignores citations without a usable index', () => {
    expect(collectSources([{}, { document_index: 7 }], documents)).toEqual([])
  })
})

describe('needsImmigrationNote', () => {
  const visa = { slug: 'irp', title: 'IRP', category: 'visa' }
  const food = { slug: 'groceries', title: 'Groceries', category: 'food-groceries' }

  it('fires when a visa article was cited', () => {
    expect(needsImmigrationNote('What do I bring?', [visa])).toBe(true)
  })

  it.each([
    'How do I renew my IRP?',
    'Can I work 40 hours on Stamp 2?',
    'how long does a work permit take',
    'Naturalisation after 5 years?',
    'What is ISD?',
  ])('fires on immigration wording even with no visa citation: %s', (q) => {
    expect(needsImmigrationNote(q, [food])).toBe(true)
  })

  it('stays quiet for an everyday question', () => {
    expect(needsImmigrationNote('Where can I buy paneer in Dublin?', [food])).toBe(false)
  })

  it('does not match inside other words', () => {
    expect(needsImmigrationNote('Is the permittivity of water relevant? Visakhapatnam food?', [])).toBe(false)
  })
})

describe('checkQuestion', () => {
  it('trims and collapses whitespace', () => {
    expect(checkQuestion('  How   do I\n renew my IRP?  ')).toEqual({
      ok: true,
      question: 'How do I renew my IRP?',
    })
  })

  it.each([undefined, 42, '', '  ', 'hi'])('rejects %p', (input) => {
    expect(checkQuestion(input).ok).toBe(false)
  })

  it('rejects questions over the limit and accepts one exactly at it', () => {
    expect(checkQuestion('a'.repeat(QUESTION_MAX)).ok).toBe(true)
    expect(checkQuestion('a'.repeat(QUESTION_MAX + 1)).ok).toBe(false)
  })
})

describe('createRateLimiter', () => {
  it('allows a burst up to the limit, then says how long to wait', () => {
    let t = 0
    const take = createRateLimiter([{ limit: 2, ms: 60_000 }], () => t)
    expect(take('a').allowed).toBe(true)
    expect(take('a').allowed).toBe(true)
    const third = take('a')
    expect(third).toEqual({ allowed: false, retryAfterSeconds: 60 })
    t = 60_000
    expect(take('a').allowed).toBe(true)
  })

  it('counts each client separately', () => {
    const take = createRateLimiter([{ limit: 1, ms: 60_000 }], () => 0)
    expect(take('a').allowed).toBe(true)
    expect(take('b').allowed).toBe(true)
    expect(take('a').allowed).toBe(false)
  })

  it('enforces the longer window after the short one resets', () => {
    let t = 0
    const take = createRateLimiter(
      [
        { limit: 2, ms: 1_000 },
        { limit: 3, ms: 10_000 },
      ],
      () => t
    )
    take('a')
    take('a')
    t = 1_000
    expect(take('a').allowed).toBe(true)
    t = 2_000
    const blocked = take('a')
    expect(blocked.allowed).toBe(false)
  })

  it('does not count refused attempts against the reader', () => {
    let t = 0
    const take = createRateLimiter([{ limit: 1, ms: 1_000 }], () => t)
    take('a')
    take('a')
    take('a')
    t = 1_000
    expect(take('a').allowed).toBe(true)
  })
})

describe('isAnswered / saysNotCovered', () => {
  const src = [{ slug: 'irp', title: 'IRP', category: 'visa' }]

  it('a cited answer counts as answered', () => {
    expect(isAnswered('Book online and bring your passport.', src)).toBe(true)
  })

  it('a cited answer that opens with the not-covered line does not', () => {
    // The real failure: the IRP renewal question cited the first-time guide.
    expect(isAnswered("Saffron Isle doesn't have an article on renewing your IRP yet. Our IRP articles…", src)).toBe(false)
  })

  it('tolerates a curly apostrophe and leading markdown', () => {
    expect(saysNotCovered('**Saffron Isle doesn’t have an article on** car insurance yet.')).toBe(true)
  })

  it('only looks at the opening, not a mention later on', () => {
    expect(saysNotCovered("Yes — and if Saffron Isle doesn't have an article on it, ask.")).toBe(false)
  })

  it('nothing cited is never answered', () => {
    expect(isAnswered('Some confident text.', [])).toBe(false)
  })
})

describe('parseInline', () => {
  it('turns internal article and category links into links', () => {
    expect(parseInline('See the [IRP guide](/articles/irp-appointment-dublin) or [Visa](/category/visa).')).toEqual([
      { type: 'text', text: 'See the ' },
      { type: 'link', text: 'IRP guide', href: '/articles/irp-appointment-dublin' },
      { type: 'text', text: ' or ' },
      { type: 'link', text: 'Visa', href: '/category/visa' },
      { type: 'text', text: '.' },
    ])
  })

  it.each([
    '[click](https://evil.example)',
    '[x](javascript:alert(1))',
    '[x](//evil.example/articles/a)',
    '[x](/admin)',
    '[x](/articles/../admin)',
  ])('keeps only the label for a non-internal link: %s', (md) => {
    const tokens = parseInline(md)
    expect(tokens.some((t) => t.type === 'link')).toBe(false)
  })

  it('handles bold next to links', () => {
    expect(parseInline('**Fee:** see [guide](/articles/a)').map((t) => t.type)).toEqual(['bold', 'text', 'link'])
  })
})
