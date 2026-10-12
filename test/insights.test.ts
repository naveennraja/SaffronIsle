import { describe, expect, it } from 'vitest'
import {
  dismissTopic,
  isoWeek,
  planGrouping,
  type Assignment,
  type StoredQuestion,
  type Topic,
} from '../lib/ask/insights'

const MON_12_OCT_2026 = Date.UTC(2026, 9, 12, 10)

const q = (id: string, answered: boolean, extra: Partial<StoredQuestion> = {}): StoredQuestion => ({
  id,
  q: `question ${id}`,
  answered,
  sources: [],
  ts: MON_12_OCT_2026,
  ...extra,
})

const topic = (id: string, label: string, extra: Partial<Topic> = {}): Topic => ({
  id,
  label,
  createdAt: 0,
  status: 'open',
  asked: 0,
  unanswered: 0,
  openUnanswered: 0,
  ...extra,
})

const counter = () => {
  let n = 0
  return () => `t${++n}`
}

describe('isoWeek', () => {
  it.each([
    [Date.UTC(2026, 9, 12), '2026-W42'],
    [Date.UTC(2026, 9, 18, 23), '2026-W42'], // Sunday stays in the same week
    [Date.UTC(2026, 9, 19), '2026-W43'], // Monday starts the next
    [Date.UTC(2027, 0, 1), '2026-W53'], // 1 Jan 2027 belongs to 2026's last week
    [Date.UTC(2025, 11, 29), '2026-W01'], // and late December can belong to the next year
  ])('%s → %s', (ts, expected) => {
    expect(isoWeek(ts)).toBe(expected)
  })
})

describe('planGrouping', () => {
  it('puts three phrasings of one question on one new topic', () => {
    const questions = [q('a', true), q('b', false), q('c', false)]
    const assignments: Assignment[] = [
      { questionId: 'a', topicId: '', newTopicLabel: 'Renewing an IRP card' },
      { questionId: 'b', topicId: '', newTopicLabel: 'Renewing an IRP Card' },
      { questionId: 'c', topicId: '', newTopicLabel: 'renewing an irp card!' },
    ]
    const plan = planGrouping(questions, [], assignments, counter())
    expect(plan.topics).toHaveLength(1)
    expect(plan.topics[0]).toMatchObject({ label: 'Renewing an IRP card', asked: 3, unanswered: 2, openUnanswered: 2 })
    expect(plan.weekly).toEqual([{ week: '2026-W42', topicId: 't1', asked: 3, unanswered: 2 }])
    expect(plan.done).toEqual(['a', 'b', 'c'])
  })

  it('joins an existing topic by id, and by label when the model calls it new', () => {
    const existing = [topic('irp', 'Renewing an IRP card', { asked: 5 })]
    const plan = planGrouping(
      [q('a', true), q('b', true)],
      existing,
      [
        { questionId: 'a', topicId: 'irp', newTopicLabel: '' },
        { questionId: 'b', topicId: '', newTopicLabel: 'renewing an IRP card' },
      ],
      counter()
    )
    expect(plan.topics).toHaveLength(1)
    expect(plan.topics[0]).toMatchObject({ id: 'irp', asked: 7 })
  })

  it('is idempotent: an already-grouped question is cleared from pending but not counted again', () => {
    const plan = planGrouping(
      [q('a', false, { topicId: 'irp' })],
      [topic('irp', 'IRP', { asked: 1, unanswered: 1, openUnanswered: 1 })],
      [{ questionId: 'a', topicId: 'irp', newTopicLabel: '' }],
      counter()
    )
    expect(plan.done).toEqual(['a'])
    expect(plan.topics).toEqual([])
    expect(plan.weekly).toEqual([])
  })

  it('leaves questions pending when the model gives nothing usable', () => {
    const plan = planGrouping(
      [q('missing', true), q('bad-id', true), q('blank', true)],
      [],
      [
        { questionId: 'bad-id', topicId: 'nope', newTopicLabel: '' },
        { questionId: 'blank', topicId: '', newTopicLabel: '   ' },
      ],
      counter()
    )
    expect(plan.retry).toEqual(['missing', 'bad-id', 'blank'])
    expect(plan.done).toEqual([])
  })

  it('reopens a dismissed topic when new unanswered questions arrive', () => {
    const dismissed = topic('irp', 'IRP', { status: 'dismissed', openUnanswered: 0 })
    const plan = planGrouping(
      [q('a', false)],
      [dismissed],
      [{ questionId: 'a', topicId: 'irp', newTopicLabel: '' }],
      counter()
    )
    expect(plan.topics[0]).toMatchObject({ status: 'open', openUnanswered: 1 })
  })

  it('keeps a dismissed topic dismissed when its new questions are answered', () => {
    const dismissed = topic('irp', 'IRP', { status: 'dismissed' })
    const plan = planGrouping(
      [q('a', true)],
      [dismissed],
      [{ questionId: 'a', topicId: 'irp', newTopicLabel: '' }],
      counter()
    )
    expect(plan.topics[0]).toMatchObject({ status: 'dismissed', openUnanswered: 0, asked: 1 })
  })

  it('counts each question in the week it was asked, not the week it was grouped', () => {
    const lastWeek = MON_12_OCT_2026 - 7 * 86_400_000
    const plan = planGrouping(
      [q('a', false, { ts: lastWeek }), q('b', false)],
      [topic('irp', 'IRP')],
      [
        { questionId: 'a', topicId: 'irp', newTopicLabel: '' },
        { questionId: 'b', topicId: 'irp', newTopicLabel: '' },
      ],
      counter()
    )
    expect(plan.weekly.map((w) => w.week).sort()).toEqual(['2026-W41', '2026-W42'])
  })

  it('caps long labels', () => {
    const plan = planGrouping(
      [q('a', true)],
      [],
      [{ questionId: 'a', topicId: '', newTopicLabel: 'x'.repeat(200) }],
      counter()
    )
    expect(plan.topics[0].label).toHaveLength(60)
  })
})

describe('dismissTopic', () => {
  it('clears the to-do count but keeps the all-time counts', () => {
    const t = dismissTopic(topic('irp', 'IRP', { asked: 9, unanswered: 4, openUnanswered: 4 }), 123)
    expect(t).toMatchObject({ status: 'dismissed', openUnanswered: 0, asked: 9, unanswered: 4, dismissedAt: 123 })
  })
})
