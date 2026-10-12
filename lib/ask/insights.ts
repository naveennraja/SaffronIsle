/**
 * The data model behind reader-question insights, and the pure logic that
 * turns the daily grouping step's output into counts.
 *
 * What is stored, and for how long:
 *   - a question (redacted, see lib/ask/redact.js) with whether it was answered
 *     and which articles it cited — deleted automatically after 90 days;
 *   - topics and their counts — kept, because a count carries nothing personal.
 *
 * Everything here is free of Redis and of the model so the rules can be tested
 * directly; lib/ask/store.ts applies the plan this produces.
 */

export const QUESTION_TTL_SECONDS = 90 * 24 * 60 * 60

export interface StoredQuestion {
  id: string
  /** Redacted text. The original is never stored. */
  q: string
  answered: boolean
  /** Slugs of the cited articles. */
  sources: string[]
  /** Epoch ms. */
  ts: number
  /** Set once grouped; its presence is what makes grouping idempotent. */
  topicId?: string
}

export interface Topic {
  id: string
  label: string
  createdAt: number
  /**
   * 'dismissed' once Nethra has written an article for it. A topic that keeps
   * collecting unanswered questions afterwards reopens itself — the article
   * evidently did not cover what people are asking.
   */
  status: 'open' | 'dismissed'
  /** All-time questions grouped into this topic. */
  asked: number
  /** All-time questions in this topic the articles could not answer. */
  unanswered: number
  /** Unanswered questions since the topic was last dismissed — the to-do count. */
  openUnanswered: number
  dismissedAt?: number
}

/** What the grouping model returns for each question. */
export interface Assignment {
  questionId: string
  /** An existing topic's id, or '' for a new topic. */
  topicId: string
  /** Label for a new topic, or '' when an existing topic fits. */
  newTopicLabel: string
}

export interface WeeklyIncrement {
  week: string
  topicId: string
  asked: number
  unanswered: number
}

export interface GroupingPlan {
  /** Every topic that changed or was created, in its final state. */
  topics: Topic[]
  /** Questions to mark as grouped, with the topic they joined. */
  grouped: { id: string; topicId: string }[]
  weekly: WeeklyIncrement[]
  /** Questions to take off the pending set: grouped, or already grouped before. */
  done: string[]
  /** Questions the model gave no usable answer for — left pending for tomorrow. */
  retry: string[]
}

/** ISO 8601 week, e.g. "2026-W41". Weeks start on Monday; week 1 holds the year's first Thursday. */
export function isoWeek(date: Date | number): string {
  const d = new Date(date)
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const normalise = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export const MAX_TOPIC_LABEL = 60

export function planGrouping(
  questions: StoredQuestion[],
  existingTopics: Topic[],
  assignments: Assignment[],
  newId: () => string
): GroupingPlan {
  const topics = new Map(existingTopics.map((t) => [t.id, { ...t }]))
  const byLabel = new Map(existingTopics.map((t) => [normalise(t.label), t.id]))
  const assigned = new Map(assignments.map((a) => [a.questionId, a]))
  const changed = new Set<string>()
  const weekly = new Map<string, WeeklyIncrement>()
  const plan: GroupingPlan = { topics: [], grouped: [], weekly: [], done: [], retry: [] }

  for (const q of questions) {
    if (q.topicId) {
      plan.done.push(q.id)
      continue
    }

    const a = assigned.get(q.id)
    let topicId: string | undefined
    if (a?.topicId && topics.has(a.topicId)) {
      topicId = a.topicId
    } else if (a?.newTopicLabel.trim()) {
      const label = a.newTopicLabel.trim().slice(0, MAX_TOPIC_LABEL)
      // Two new questions in one batch, or a "new" label that matches an
      // existing topic, must land on the same topic rather than duplicate it.
      topicId = byLabel.get(normalise(label))
      if (!topicId) {
        topicId = newId()
        topics.set(topicId, {
          id: topicId,
          label,
          createdAt: q.ts,
          status: 'open',
          asked: 0,
          unanswered: 0,
          openUnanswered: 0,
        })
        byLabel.set(normalise(label), topicId)
      }
    }

    if (!topicId) {
      plan.retry.push(q.id)
      continue
    }

    const topic = topics.get(topicId)!
    topic.asked += 1
    if (!q.answered) {
      topic.unanswered += 1
      topic.openUnanswered += 1
      topic.status = 'open'
    }
    changed.add(topicId)

    const week = isoWeek(q.ts)
    const key = `${week}|${topicId}`
    const inc = weekly.get(key) ?? { week, topicId, asked: 0, unanswered: 0 }
    inc.asked += 1
    if (!q.answered) inc.unanswered += 1
    weekly.set(key, inc)

    plan.grouped.push({ id: q.id, topicId })
    plan.done.push(q.id)
  }

  plan.topics = [...changed].map((id) => topics.get(id)!)
  plan.weekly = [...weekly.values()]
  return plan
}

/** Marks a topic as written up: off the to-do list until new unanswered questions arrive. */
export function dismissTopic(topic: Topic, now: number): Topic {
  return { ...topic, status: 'dismissed', openUnanswered: 0, dismissedAt: now }
}
