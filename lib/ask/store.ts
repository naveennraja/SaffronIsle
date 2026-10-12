import 'server-only'

import { randomUUID } from 'crypto'
import { Redis } from '@upstash/redis'
import { ASK_ENABLED } from '@/lib/site-config'
import {
  QUESTION_TTL_SECONDS,
  dismissTopic,
  isoWeek,
  type GroupingPlan,
  type StoredQuestion,
  type Topic,
} from './insights'

/**
 * Upstash Redis storage for reader-question insights.
 *
 * Key layout:
 *   ask:q:<id>                   one redacted question; expires after 90 days
 *   ask:pending                  set of question ids not yet grouped
 *   ask:topics                   hash topicId → Topic (counts only, kept)
 *   ask:topic:<id>:recent        newest question ids for a topic (ids only)
 *   ask:week:<YYYY-Www>:asked    sorted set topicId → questions that week
 *   ask:week:<YYYY-Www>:unanswered
 *
 * Deletion after 90 days is Redis key expiry, not a cleanup job, so it cannot
 * silently stop happening. The recent-id lists may point at expired
 * questions; readers of them treat a missing question as gone.
 */

const RECENT_PER_TOPIC = 20

/**
 * Works with either env naming: the Upstash console's, or the KV_* names the
 * Vercel Marketplace integration injects.
 */
function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

/** Whether questions are being saved — drives the wording under the chat box. */
export function insightsEnabled(): boolean {
  return ASK_ENABLED && credentials() !== null
}

let redis: Redis | null = null
function db(): Redis | null {
  const creds = credentials()
  if (!creds) return null
  return (redis ??= new Redis(creds))
}

const k = {
  question: (id: string) => `ask:q:${id}`,
  pending: 'ask:pending',
  topics: 'ask:topics',
  recent: (topicId: string) => `ask:topic:${topicId}:recent`,
  week: (week: string, kind: 'asked' | 'unanswered') => `ask:week:${week}:${kind}`,
}

export async function saveQuestion(input: Omit<StoredQuestion, 'id' | 'ts'>): Promise<void> {
  const r = db()
  if (!r) return
  const question: StoredQuestion = { ...input, id: randomUUID(), ts: Date.now() }
  await r
    .pipeline()
    .set(k.question(question.id), question, { ex: QUESTION_TTL_SECONDS })
    .sadd(k.pending, question.id)
    .exec()
}

export async function loadPending(limit: number): Promise<{ questions: StoredQuestion[]; expired: string[] }> {
  const r = db()
  if (!r) return { questions: [], expired: [] }
  const ids = (await r.smembers(k.pending)).slice(0, limit)
  if (ids.length === 0) return { questions: [], expired: [] }
  const rows = await r.mget<(StoredQuestion | null)[]>(...ids.map(k.question))
  const questions: StoredQuestion[] = []
  const expired: string[] = []
  rows.forEach((row, i) => (row ? questions.push(row) : expired.push(ids[i])))
  return { questions, expired }
}

export async function loadTopics(): Promise<Topic[]> {
  const r = db()
  if (!r) return []
  const all = await r.hgetall<Record<string, Topic>>(k.topics)
  return all ? Object.values(all) : []
}

export async function applyPlan(plan: GroupingPlan, questions: StoredQuestion[], expired: string[]) {
  const r = db()
  if (!r) return
  const byId = new Map(questions.map((q) => [q.id, q]))
  const p = r.pipeline()

  if (plan.topics.length) {
    p.hset(k.topics, Object.fromEntries(plan.topics.map((t) => [t.id, t])))
  }
  for (const { id, topicId } of plan.grouped) {
    const q = byId.get(id)
    if (!q) continue
    // Keep the original expiry: grouping must not extend how long a question lives.
    const remaining = Math.max(1, Math.round((q.ts + QUESTION_TTL_SECONDS * 1000 - Date.now()) / 1000))
    p.set(k.question(id), { ...q, topicId }, { ex: remaining })
    p.lpush(k.recent(topicId), id)
    p.ltrim(k.recent(topicId), 0, RECENT_PER_TOPIC - 1)
  }
  for (const w of plan.weekly) {
    p.zincrby(k.week(w.week, 'asked'), w.asked, w.topicId)
    if (w.unanswered) p.zincrby(k.week(w.week, 'unanswered'), w.unanswered, w.topicId)
  }
  const cleared = [...plan.done, ...expired]
  if (cleared.length) p.srem(k.pending, ...cleared)
  await p.exec()
}

export async function dismiss(topicId: string): Promise<boolean> {
  const r = db()
  if (!r) return false
  const topic = await r.hget<Topic>(k.topics, topicId)
  if (!topic) return false
  await r.hset(k.topics, { [topicId]: dismissTopic(topic, Date.now()) })
  return true
}

export interface InsightsView {
  enabled: boolean
  week: string
  pending: number
  mostAsked: { id: string; label: string; asked: number; unanswered: number }[]
  unanswered: {
    id: string
    label: string
    openUnanswered: number
    asked: number
    examples: string[]
  }[]
}

export async function loadInsights(now = Date.now()): Promise<InsightsView> {
  const week = isoWeek(now)
  const r = db()
  if (!r) return { enabled: false, week, pending: 0, mostAsked: [], unanswered: [] }

  const [topics, pending, askedRaw, unansweredRaw] = await Promise.all([
    loadTopics(),
    r.scard(k.pending),
    r.zrange<string[]>(k.week(week, 'asked'), 0, 9, { rev: true, withScores: true }),
    r.zrange<string[]>(k.week(week, 'unanswered'), 0, -1, { withScores: true }),
  ])
  const byId = new Map(topics.map((t) => [t.id, t]))
  const pairs = (flat: (string | number)[]) => {
    const out: [string, number][] = []
    for (let i = 0; i < flat.length; i += 2) out.push([String(flat[i]), Number(flat[i + 1])])
    return out
  }
  const unansweredThisWeek = new Map(pairs(unansweredRaw))

  const mostAsked = pairs(askedRaw)
    .filter(([id]) => byId.has(id))
    .map(([id, asked]) => ({
      id,
      label: byId.get(id)!.label,
      asked,
      unanswered: unansweredThisWeek.get(id) ?? 0,
    }))

  const todo = topics
    .filter((t) => t.status === 'open' && t.openUnanswered > 0)
    .sort((a, b) => b.openUnanswered - a.openUnanswered || b.asked - a.asked)
    .slice(0, 30)

  const unanswered = await Promise.all(
    todo.map(async (t) => {
      const ids = await r.lrange<string>(k.recent(t.id), 0, RECENT_PER_TOPIC - 1)
      const rows = ids.length ? await r.mget<(StoredQuestion | null)[]>(...ids.map(k.question)) : []
      const examples = rows
        .filter((q): q is StoredQuestion => Boolean(q) && !q!.answered && (!t.dismissedAt || q!.ts > t.dismissedAt))
        .slice(0, 3)
        .map((q) => q.q)
      return { id: t.id, label: t.label, openUnanswered: t.openUnanswered, asked: t.asked, examples }
    })
  )

  return { enabled: true, week, pending, mostAsked, unanswered }
}
