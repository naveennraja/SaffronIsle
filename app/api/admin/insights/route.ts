import { NextRequest, NextResponse } from 'next/server'
import { hasSession, unauthorized } from '@/lib/admin-session'
import { dismiss, loadInsights } from '@/lib/ask/store'

export const runtime = 'nodejs'

/**
 * The /admin "Reader questions" tab: what readers asked this week, and what
 * the articles couldn't answer. Signed-in only — the example questions are
 * redacted, but they are still readers' words.
 */

export async function GET(req: NextRequest) {
  if (!hasSession(req)) return unauthorized()
  try {
    return NextResponse.json({ ok: true, ...(await loadInsights()) })
  } catch (error) {
    console.error('[insights] load failed', error)
    return NextResponse.json({ ok: false, error: 'Could not load reader questions.' }, { status: 502 })
  }
}

/** "Written it — remove": takes a topic off the to-do list. */
export async function POST(req: NextRequest) {
  if (!hasSession(req)) return unauthorized()
  const body = await req.json().catch(() => ({}))
  const topicId = typeof body.dismissTopic === 'string' ? body.dismissTopic : ''
  if (!topicId) return NextResponse.json({ ok: false, error: 'No topic given.' }, { status: 400 })
  const ok = await dismiss(topicId)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}
