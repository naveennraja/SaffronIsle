import { NextRequest, NextResponse } from 'next/server'

const VALID_CATEGORIES = [
  'visa',
  'student-life',
  'food-groceries',
  'work-careers',
  'finances',
  'housing',
  'explore-ireland',
  'community-stories',
]

function checkPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  return password === adminPassword
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/ul>\s*<ul[^>]*>/gi, '\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractDescription(markdown: string): string {
  const firstPara = markdown
    .split('\n\n')
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('-'))
  if (!firstPara) return ''
  return firstPara.replace(/[*_`]/g, '').slice(0, 155).trim()
}

function buildMdx({
  title,
  slug,
  category,
  description,
  date,
  imageExt,
}: {
  title: string
  slug: string
  category: string
  description: string
  date: string
  imageExt: string
}) {
  return `---
title: "${title}"
description: "${description}"
date: "${date}"
category: "${category}"
author: "Nethra Bhaskar"
coverImage: "/images/articles/${slug}.${imageExt}"
coverAlt: "${title}"
readTime: 5
featured: false
---`
}

async function pushToGithub({
  path,
  content,
  message,
  isBase64 = false,
}: {
  path: string
  content: string
  message: string
  isBase64?: boolean
}) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO

  const missing = [!token && 'GITHUB_TOKEN', !repo && 'GITHUB_REPO'].filter(Boolean)
  if (missing.length) {
    throw new Error(`Missing env var(s) on the server: ${missing.join(', ')}`)
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`

  let sha: string | undefined
  const existing = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (existing.ok) {
    const data = await existing.json()
    sha = data.sha
  }

  const encoded = isBase64 ? content : Buffer.from(content, 'utf-8').toString('base64')
  const body: Record<string, string> = { message, content: encoded }
  if (sha) body.sha = sha

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'GitHub push failed')
  }

  return res.json()
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  // Auth check (JSON body with checkAuth: true)
  if (contentType.includes('application/json')) {
    const body = await req.json()
    if (body.checkAuth) {
      if (checkPassword(body.password)) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  // File upload (multipart/form-data)
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Invalid content type' }, { status: 400 })
  }

  const formData = await req.formData()
  const password = formData.get('password') as string
  const category = formData.get('category') as string
  const slug = formData.get('slug') as string
  const titleOverride = (formData.get('title') as string) || ''
  const file = formData.get('file') as File | null
  const image = formData.get('image') as File | null

  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!file || !category || !slug) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ ok: false, error: `Invalid category: ${category}` }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
  }

  try {
    // Convert .docx → markdown
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { value: html } = await mammoth.convertToHtml({ buffer })
    const markdown = htmlToMarkdown(html)

    const title = titleOverride || slugToTitle(slug)
    const description = extractDescription(markdown) || `${title} — a guide for Indians in Ireland.`
    const date = new Date().toISOString().split('T')[0]

    const imageExt = image ? (image.name.split('.').pop() ?? 'jpg').toLowerCase() : 'jpg'

    const frontmatter = buildMdx({ title, slug, category, description, date, imageExt })
    const mdxContent = `${frontmatter}\n\n${markdown}\n`

    const filePath = `content/articles/${category}/${slug}.mdx`
    await pushToGithub({
      path: filePath,
      content: mdxContent,
      message: `publish: ${title}`,
    })

    // Upload cover image if provided
    if (image) {
      const imgBuffer = Buffer.from(await image.arrayBuffer())
      await pushToGithub({
        path: `public/images/articles/${slug}.${imageExt}`,
        content: imgBuffer.toString('base64'),
        message: `image: cover for ${slug}`,
        isBase64: true,
      })
    }

    // Append to publish log
    const logPath = 'drafts/publish-log.md'
    const logLine = `| ${date} | ${title} | ${category} | ${slug} |\n`

    // Fetch existing log
    const token = process.env.GITHUB_TOKEN!
    const repo = process.env.GITHUB_REPO!
    const logApiUrl = `https://api.github.com/repos/${repo}/contents/${logPath}`
    const logRes = await fetch(logApiUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })

    let existingContent = '# Publish Log\n\nAll articles published through the drafts pipeline.\n\n| Date | Title | Category | Slug |\n|---|---|---|---|\n'
    let logSha: string | undefined

    if (logRes.ok) {
      const logData = await logRes.json()
      existingContent = Buffer.from(logData.content, 'base64').toString('utf-8')
      logSha = logData.sha
    }

    const updatedLog = existingContent + logLine
    const logBody: Record<string, string> = {
      message: `log: add publish entry for ${slug}`,
      content: Buffer.from(updatedLog, 'utf-8').toString('base64'),
    }
    if (logSha) logBody.sha = logSha

    await fetch(logApiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logBody),
    })

    return NextResponse.json({ ok: true, path: filePath })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
