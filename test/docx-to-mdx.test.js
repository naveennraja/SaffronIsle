import { describe, test, expect } from 'vitest'
import {
  convertDocx,
  htmlToMarkdown,
  extractDescription,
} from '../lib/docx-to-mdx.js'
import { buildDocx, png, corruptImage } from './helpers/docx.js'

/** Convenience: a picture comfortably above the 32px artifact threshold. */
const photo = (alt) => ({ bytes: png(400, 300), ext: 'png', alt })

describe('htmlToMarkdown', () => {
  test('converts headings h1 through h4', () => {
    const md = htmlToMarkdown(
      '<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4>'
    )
    expect(md).toBe('# One\n\n## Two\n\n### Three\n\n#### Four')
  })

  test('converts both spellings of bold and italic', () => {
    expect(htmlToMarkdown('<p><strong>a</strong> <b>b</b></p>')).toBe(
      '**a** **b**'
    )
    expect(htmlToMarkdown('<p><em>a</em> <i>b</i></p>')).toBe('*a* *b*')
  })

  test('converts list items and drops the wrapping ul', () => {
    expect(htmlToMarkdown('<ul><li>first</li><li>second</li></ul>')).toBe(
      '- first\n- second'
    )
  })

  test('merges adjacent lists that Word splits apart', () => {
    // Word emits a fresh <ul> per item when formatting shifts mid-list.
    const md = htmlToMarkdown('<ul><li>a</li></ul><ul><li>b</li></ul>')

    // One list, no leftover tags — which is what the merge rule is for.
    expect(md).toBe('- a\n\n- b')
    expect(md).not.toContain('<ul>')

    // Documenting a wart rather than asserting it is correct: the blank line
    // makes this a *loose* list, so items render <p>-wrapped with wider
    // spacing than the identical unsplit list below. Same content, different
    // typography, depending only on how Word chose to chunk the HTML.
    expect(htmlToMarkdown('<ul><li>a</li><li>b</li></ul>')).toBe('- a\n- b')
  })

  test('converts links to markdown', () => {
    expect(htmlToMarkdown('<p><a href="https://x.ie">click</a></p>')).toBe(
      '[click](https://x.ie)'
    )
  })

  test('separates paragraphs with a blank line', () => {
    expect(htmlToMarkdown('<p>one</p><p>two</p>')).toBe('one\n\ntwo')
  })

  test('converts br to a newline', () => {
    expect(htmlToMarkdown('<p>one<br>two</p>')).toBe('one\ntwo')
    expect(htmlToMarkdown('<p>one<br />two</p>')).toBe('one\ntwo')
  })

  test('strips tags it has no rule for', () => {
    expect(htmlToMarkdown('<p>keep <span class="x">this</span></p>')).toBe(
      'keep this'
    )
  })

  test('decodes the HTML entities Word produces, keeping < escaped', () => {
    // Everything decodes except `<`, which would read as the start of a JSX
    // tag and fail the MDX compile. MDX turns the reference back into `<`.
    expect(
      htmlToMarkdown('<p>&amp; &lt; &gt; &quot; &#39; a&nbsp;b</p>')
    ).toBe('& &lt; > " \' a b')
  })

  test('escapes a < that a writer typed, in every shape that breaks MDX', () => {
    // The three from the TODO: a comparison, something that looks like a tag,
    // and an abbreviation. All three used to reach the file raw.
    expect(htmlToMarkdown('<p>Salaries &lt;2000 euro are common.</p>')).toBe(
      'Salaries &lt;2000 euro are common.'
    )
    expect(htmlToMarkdown('<p>Use the &lt;b&gt; tag carefully.</p>')).toBe(
      'Use the &lt;b> tag carefully.'
    )
    expect(htmlToMarkdown('<p>Compare &lt;IRP and PPS numbers.</p>')).toBe(
      'Compare &lt;IRP and PPS numbers.'
    )
  })

  test('decodes each entity in one pass, never producing a raw <', () => {
    // Six chained replaces decoded &amp; first and &lt; after, so the literal
    // text "&amp;lt;" came out as the one character that must never be emitted.
    expect(htmlToMarkdown('<p>&amp;lt; 2000</p>')).not.toContain('< 2000')
  })

  test('collapses runs of blank lines and trims the ends', () => {
    expect(htmlToMarkdown('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\n\nb')
  })
})

describe('extractDescription', () => {
  test('takes the first real paragraph', () => {
    expect(extractDescription('# Title\n\nThe opening line.')).toBe(
      'The opening line.'
    )
  })

  test('skips headings and list items', () => {
    expect(
      extractDescription('# Title\n\n- a bullet\n\nReal prose here.')
    ).toBe('Real prose here.')
  })

  test('skips a leading JSX block so an image never becomes the meta description', () => {
    // The `<` guard. Without it the description is a chunk of ArticleImage markup.
    const md =
      '<ArticleImage src="/images/articles/x/01.png" alt="A cat" width="400" height="300" />\n\nThe prose that should win.'
    expect(extractDescription(md)).toBe('The prose that should win.')
  })

  test('strips emphasis characters', () => {
    expect(extractDescription('**Bold** and *soft* and `code`.')).toBe(
      'Bold and soft and code.'
    )
  })

  test('truncates to 155 characters', () => {
    const long = 'a'.repeat(300)
    expect(extractDescription(long)).toHaveLength(155)
  })

  test('returns an empty string when nothing qualifies', () => {
    expect(extractDescription('# Only a heading')).toBe('')
    expect(extractDescription('')).toBe('')
  })
})

describe('convertDocx — argument handling', () => {
  test('rejects a call with neither buffer nor path', async () => {
    await expect(convertDocx({ slug: 'x' })).rejects.toThrow(
      'convertDocx needs either a buffer or a path'
    )
  })
})

describe('convertDocx — image extraction', () => {
  test('collects images in document order with padded, slug-scoped names', async () => {
    const buffer = await buildDocx([
      { text: 'Intro.' },
      { image: photo('First') },
      { text: 'Middle.' },
      { image: photo('Second') },
    ])

    const { images } = await convertDocx({ buffer, slug: 'my-article' })

    expect(images).toHaveLength(2)
    expect(images.map((i) => i.publicPath)).toEqual([
      '/images/articles/my-article/01.png',
      '/images/articles/my-article/02.png',
    ])
    expect(images[0].path).toBe('public/images/articles/my-article/01.png')
    expect(Buffer.isBuffer(images[0].buffer)).toBe(true)
  })

  test('reads real dimensions off the bytes and emits them as string attributes', async () => {
    const buffer = await buildDocx([
      { image: { bytes: png(640, 480), ext: 'png', alt: 'Wide' } },
    ])

    const { markdown, images } = await convertDocx({ buffer, slug: 'dims' })

    expect(images[0]).toMatchObject({ width: 640, height: 480 })
    // Literal strings, never {expressions} — next-mdx-remote strips those.
    expect(markdown).toContain('width="640"')
    expect(markdown).toContain('height="480"')
    expect(markdown).not.toContain('{')
  })

  test('emits each image as a standalone block surrounded by blank lines', async () => {
    const buffer = await buildDocx([
      { text: 'Before.' },
      { image: photo('Middle') },
      { text: 'After.' },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'blocks' })

    expect(markdown).toBe(
      'Before.\n\n<ArticleImage src="/images/articles/blocks/01.png" alt="Middle" width="400" height="300" />\n\nAfter.'
    )
  })
})

describe('convertDocx — images the converter must refuse', () => {
  test('skips formats a browser cannot display and explains the fix', async () => {
    const buffer = await buildDocx([
      { text: 'A chart pasted from Excel.' },
      { image: { bytes: Buffer.from('EMF binary'), ext: 'emf', alt: 'Chart' } },
    ])

    const { markdown, images, warnings } = await convertDocx({
      buffer,
      slug: 'emf',
    })

    expect(images).toHaveLength(0)
    expect(markdown).toBe('A chart pasted from Excel.')
    expect(markdown).not.toContain('ArticleImage')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Paste Special')
  })

  test('drops Word spacer artifacts smaller than the threshold, silently', async () => {
    const buffer = await buildDocx([
      { text: 'Text.' },
      { image: { bytes: png(8, 8), ext: 'png', alt: 'spacer' } },
    ])

    const { images, warnings, markdown } = await convertDocx({
      buffer,
      slug: 'tiny',
    })

    expect(images).toHaveLength(0)
    expect(markdown).toBe('Text.')
    // A layout artifact is not something the author did wrong.
    expect(warnings).toEqual([])
  })

  test('keeps a long thin image, since only one dimension is under the threshold', async () => {
    const buffer = await buildDocx([
      { image: { bytes: png(20, 400), ext: 'png', alt: 'A tall banner' } },
    ])

    const { images } = await convertDocx({ buffer, slug: 'thin' })

    expect(images).toHaveLength(1)
  })

  test('counts images it cannot decode and warns about them', async () => {
    const buffer = await buildDocx([
      { image: { bytes: corruptImage(), ext: 'png', alt: 'Broken' } },
    ])

    const { images, warnings } = await convertDocx({ buffer, slug: 'corrupt' })

    expect(images).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("couldn't be read")
  })

  test('numbering stays sequential across skipped images', async () => {
    // A gap here would mean the written filenames disagree with the markdown.
    const buffer = await buildDocx([
      { image: photo('Keep me') },
      { image: { bytes: png(8, 8), ext: 'png', alt: 'spacer' } },
      { image: photo('Keep me too') },
    ])

    const { images, markdown } = await convertDocx({ buffer, slug: 'gaps' })

    expect(images.map((i) => i.publicPath)).toEqual([
      '/images/articles/gaps/01.png',
      '/images/articles/gaps/02.png',
    ])
    expect(markdown).toContain('/images/articles/gaps/02.png')
    expect(markdown).not.toContain('/images/articles/gaps/03.png')
  })
})

describe('convertDocx — alt text', () => {
  test('carries alt text through to the component', async () => {
    const buffer = await buildDocx([
      { image: photo('A rainy street in Galway') },
    ])

    const { markdown, warnings } = await convertDocx({ buffer, slug: 'alt' })

    expect(markdown).toContain('alt="A rainy street in Galway"')
    expect(warnings).toEqual([])
  })

  test('warns when a picture has no description', async () => {
    const buffer = await buildDocx([
      { image: { bytes: png(400, 300), ext: 'png' } },
    ])

    const { markdown, warnings } = await convertDocx({ buffer, slug: 'noalt' })

    expect(markdown).toContain('alt=""')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Edit Alt Text')
  })

  test('escapes quotes and angle brackets so alt text cannot break out of the attribute', async () => {
    const buffer = await buildDocx([
      {
        image: photo('She said "hi" & <script>alert(1)</script> left'),
      },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'injection' })

    // A raw " would terminate the attribute; a raw < would open a JSX element.
    expect(markdown).toContain(
      'alt="She said &quot;hi&quot; &amp; &lt;script&gt;alert(1)&lt;/script&gt; left"'
    )
    expect(markdown).not.toContain('<script>')

    // Exactly one attribute-opening quote per attribute — nothing broke out.
    const tag = /<ArticleImage[^>]*\/>/.exec(markdown)[0]
    expect(tag.match(/"/g)).toHaveLength(8) // src, alt, width, height
  })
})

describe('convertDocx — images in awkward positions', () => {
  test('unwraps a hyperlinked image instead of nesting it in a markdown link', async () => {
    // The <a> rule runs before the sentinel expands, producing [@@SI_IMG_0@@](url).
    const buffer = await buildDocx([
      { image: photo('Sponsor logo'), href: 'https://example.com' },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'linked' })

    expect(markdown).toBe(
      '<ArticleImage src="/images/articles/linked/01.png" alt="Sponsor logo" width="400" height="300" />'
    )
    expect(markdown).not.toContain('](https://example.com)')
    expect(markdown).not.toContain('@@SI_IMG')
  })

  test('lifts an image out of a bullet item and drops the empty marker', async () => {
    const buffer = await buildDocx([
      { image: photo('Inside a bullet'), list: true },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'list' })

    expect(markdown).toBe(
      '<ArticleImage src="/images/articles/list/01.png" alt="Inside a bullet" width="400" height="300" />'
    )
    expect(markdown).not.toMatch(/^-\s/m)
  })

  test('keeps the text when a bullet holds both words and a picture', async () => {
    const buffer = await buildDocx([
      { text: 'A bullet with words', list: true },
      { image: photo('And a picture'), list: true },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'mixed' })

    expect(markdown).toContain('- A bullet with words')
    expect(markdown).toContain('<ArticleImage')
  })

  test('leaves no sentinel tokens behind in any arrangement', async () => {
    const buffer = await buildDocx([
      { text: 'Intro.' },
      { image: photo('One'), href: 'https://a.ie' },
      { image: photo('Two'), list: true },
      { image: { bytes: png(8, 8), ext: 'png', alt: 'spacer' } },
      { image: photo('Three') },
      { text: 'Outro.' },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'sentinels' })

    expect(markdown).not.toContain('@@SI_IMG')
    expect(markdown.match(/<ArticleImage/g)).toHaveLength(3)
  })
})

describe('convertDocx — description', () => {
  test('never uses a leading image as the meta description', async () => {
    const buffer = await buildDocx([
      { image: photo('A cover shot') },
      { text: 'The article opens here, in words.' },
    ])

    const { description } = await convertDocx({ buffer, slug: 'desc' })

    expect(description).toBe('The article opens here, in words.')
    expect(description).not.toContain('ArticleImage')
  })

  test('is empty for a document that is only pictures', async () => {
    const buffer = await buildDocx([{ image: photo('Only picture') }])

    const { description } = await convertDocx({ buffer, slug: 'onlyimg' })

    expect(description).toBe('')
  })
})

describe('convertDocx — tables', () => {
  test('renders a table as GFM markdown with the first row as header', async () => {
    const buffer = await buildDocx([
      {
        table: [
          ['Country', 'Visa'],
          ['India', 'Stamp 2'],
        ],
      },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'table' })

    expect(markdown).toBe(
      '| Country | Visa |\n| --- | --- |\n| India | Stamp 2 |'
    )
  })

  test('surrounds the table with blank lines and keeps surrounding prose', async () => {
    const buffer = await buildDocx([
      { text: 'Before.' },
      { table: [['a', 'b'], ['c', 'd']] },
      { text: 'After.' },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'table-prose' })

    expect(markdown).toBe(
      'Before.\n\n| a | b |\n| --- | --- |\n| c | d |\n\nAfter.'
    )
  })

  test('pads ragged rows to the widest row', async () => {
    const buffer = await buildDocx([
      { table: [['a', 'b', 'c'], ['d']] },
    ])

    const { markdown } = await convertDocx({ buffer, slug: 'ragged' })

    expect(markdown).toBe('| a | b | c |\n| --- | --- | --- |\n| d |  |  |')
  })

  test('escapes a pipe typed inside a cell', async () => {
    const buffer = await buildDocx([{ table: [['a | b', 'c']] }])

    const { markdown } = await convertDocx({ buffer, slug: 'pipe' })

    expect(markdown).toContain('a \\| b')
  })

  test('resolves an image inside a table cell to an ArticleImage tag', async () => {
    const buffer = await buildDocx([
      {
        table: [
          ['Header', 'Photo'],
          ['A row', { image: photo('In a cell') }],
        ],
      },
    ])

    const { markdown, images } = await convertDocx({ buffer, slug: 'table-img' })

    expect(images).toHaveLength(1)
    expect(markdown).toContain(
      '<ArticleImage src="/images/articles/table-img/01.png" alt="In a cell" width="400" height="300" />'
    )
    expect(markdown).not.toContain('@@SI_IMG')
    expect(markdown).not.toContain('@@SI_TBL')
  })
})

describe('buildWarnings — wording', () => {
  test('reads correctly for one picture and for several', async () => {
    const one = await buildDocx([
      { image: { bytes: png(400, 300), ext: 'png' } },
    ])
    const many = await buildDocx([
      { image: { bytes: png(400, 300), ext: 'png' } },
      { image: { bytes: png(400, 300), ext: 'png' } },
    ])

    const first = await convertDocx({ buffer: one, slug: 'one' })
    const second = await convertDocx({ buffer: many, slug: 'many' })

    expect(first.warnings[0]).toContain('1 picture has no description')
    expect(second.warnings[0]).toContain('2 pictures have no description')
  })
})
