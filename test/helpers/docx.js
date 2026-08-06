// @ts-check
/**
 * Builds real .docx files in memory for the converter tests.
 *
 * The alternative — checking binary fixtures into the repo — hides what each
 * test actually depends on. Here the document is described in the test itself,
 * so "an EMF image inside a hyperlink" reads as one line rather than as an
 * opaque blob someone has to unzip to understand.
 *
 * These are genuine OOXML packages and genuine PNG bytes, so mammoth and
 * image-size run their real parsers rather than a stub.
 */

import zlib from 'node:zlib'
import JSZip from 'jszip'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

/** @param {Buffer} buf */
function crc32(buf) {
  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

/**
 * @param {string} type
 * @param {Buffer} data
 */
function pngChunk(type, data) {
  const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/**
 * A valid RGB PNG of the given size. image-size only reads IHDR, but emitting a
 * complete file means these bytes stay valid if the converter ever decodes them.
 * @param {number} width
 * @param {number} height
 */
function png(width, height) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  // 10..12: compression, filter, interlace — all 0

  // Each scanline is a filter byte followed by RGB triples.
  const raw = Buffer.alloc(height * (1 + width * 3))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** Bytes no image decoder can make sense of, for the unreadable path. */
function corruptImage() {
  return Buffer.from('this is definitely not an image', 'utf8')
}

/** @param {string} text */
function xmlEscape(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const NS = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
].join(' ')

/**
 * The <w:drawing> run for an embedded picture. `descr` is where Word stores alt
 * text and where mammoth reads it from.
 * @param {{relId: string, alt?: string, id: number}} opts
 */
function drawingRun({ relId, alt, id }) {
  const descr = alt === undefined ? '' : ` descr="${xmlEscape(alt)}"`
  return `<w:r><w:drawing><wp:inline>
    <wp:extent cx="2400000" cy="1800000"/>
    <wp:docPr id="${id}" name="Picture ${id}"${descr}/>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic>
        <pic:nvPicPr><pic:cNvPr id="${id}" name="image${id}"/><pic:cNvPicPr/></pic:nvPicPr>
        <pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
        <pic:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
      </pic:pic>
    </a:graphicData></a:graphic>
  </wp:inline></w:drawing></w:r>`
}

/**
 * Builds a .docx from a block list.
 *
 * Block shapes:
 *   {text: 'hello'}                          a paragraph
 *   {text: 'hello', href: 'https://x.com'}   a paragraph holding a link
 *   {image: {bytes, ext, alt}}               a paragraph holding a picture
 *   {image: {...}, href: 'https://x.com'}    a hyperlinked picture
 *   {image: {...}, list: true}               a picture inside a bullet item
 *   {text: 'hello', list: true}              a bullet item
 *
 * @param {Array<Record<string, any>>} blocks
 * @returns {Promise<Buffer>}
 */
async function buildDocx(blocks) {
  const zip = new JSZip()

  /** @type {string[]} */
  const rels = []
  /** @type {Set<string>} */
  const extensions = new Set()
  let relCount = 1
  let mediaCount = 0
  let drawingId = 0

  const paragraphs = blocks.map((block) => {
    const numbering = block.list
      ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
      : ''

    /** @type {string} */
    let content

    if (block.image) {
      mediaCount += 1
      relCount += 1
      const relId = `rId${relCount}`
      const ext = block.image.ext || 'png'
      const name = `image${mediaCount}.${ext}`

      extensions.add(ext)
      zip.file(`word/media/${name}`, block.image.bytes)
      rels.push(
        `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`
      )

      drawingId += 1
      content = drawingRun({ relId, alt: block.image.alt, id: drawingId })
    } else {
      content = `<w:r><w:t xml:space="preserve">${xmlEscape(block.text || '')}</w:t></w:r>`
    }

    if (block.href) {
      relCount += 1
      const linkId = `rId${relCount}`
      rels.push(
        `<Relationship Id="${linkId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEscape(block.href)}" TargetMode="External"/>`
      )
      content = `<w:hyperlink r:id="${linkId}">${content}</w:hyperlink>`
    }

    return `<w:p>${numbering}${content}</w:p>`
  })

  const defaults = [...extensions]
    .map((ext) => {
      const type =
        ext === 'emf'
          ? 'image/x-emf'
          : ext === 'jpg'
            ? 'image/jpeg'
            : `image/${ext}`
      return `<Default Extension="${ext}" ContentType="${type}"/>`
    })
    .join('')

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${defaults}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`
  )

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  )

  rels.push(
    `<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`
  )

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`
  )

  // Bullet numbering, so mammoth emits <ul><li> for blocks marked `list: true`.
  zip.file(
    'word/numbering.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${NS}>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`
  )

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${paragraphs.join('')}</w:body></w:document>`
  )

  return zip.generateAsync({ type: 'nodebuffer' })
}

export { buildDocx, png, corruptImage }
