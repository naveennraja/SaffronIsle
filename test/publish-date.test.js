import { describe, test, expect } from 'vitest'
import {
  todayInSiteZone,
  isPublished,
  isDueToday,
} from '../lib/publish-date.js'

describe('todayInSiteZone', () => {
  test('formats as YYYY-MM-DD, matching the frontmatter', () => {
    expect(todayInSiteZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('uses Dublin time, not UTC, just after midnight in summer', () => {
    // 2026-07-15 23:30 UTC is already 00:30 on the 16th in Dublin (UTC+1).
    // Using UTC here would hold back an article scheduled for the 16th.
    expect(todayInSiteZone(new Date('2026-07-15T23:30:00Z'))).toBe('2026-07-16')
  })

  test('agrees with UTC in winter, when Dublin is UTC+0', () => {
    expect(todayInSiteZone(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-15')
  })
})

describe('isPublished', () => {
  const today = '2026-08-06'

  test('publishes articles dated today', () => {
    expect(isPublished('2026-08-06', today)).toBe(true)
  })

  test('publishes articles dated in the past', () => {
    expect(isPublished('2026-08-05', today)).toBe(true)
    expect(isPublished('2019-01-01', today)).toBe(true)
  })

  test('hides articles dated in the future', () => {
    expect(isPublished('2026-08-07', today)).toBe(false)
    expect(isPublished('2030-12-25', today)).toBe(false)
  })

  test('compares by day, ignoring any time component', () => {
    expect(isPublished('2026-08-06T23:59:00Z', today)).toBe(true)
    expect(isPublished('2026-08-07T00:00:00Z', today)).toBe(false)
  })

  test('crossing a month or year boundary still orders correctly', () => {
    expect(isPublished('2026-09-01', '2026-08-31')).toBe(false)
    expect(isPublished('2026-08-31', '2026-09-01')).toBe(true)
    expect(isPublished('2027-01-01', '2026-12-31')).toBe(false)
  })

  test('treats a missing or malformed date as published', () => {
    // Disappearing silently is worse than appearing early: lib/articles.ts
    // already requires `date`, so this only catches genuinely odd values.
    expect(isPublished('', today)).toBe(true)
    expect(isPublished('not a date', today)).toBe(true)
    expect(isPublished(undefined, today)).toBe(true)
    expect(isPublished(null, today)).toBe(true)
  })
})

describe('isDueToday', () => {
  const today = '2026-08-06'

  test('is true only on the exact day', () => {
    expect(isDueToday('2026-08-06', today)).toBe(true)
    expect(isDueToday('2026-08-05', today)).toBe(false)
    expect(isDueToday('2026-08-07', today)).toBe(false)
  })

  test('an already-live article does not ask for another rebuild', () => {
    // Yesterday's article went live in yesterday's build; rebuilding for it
    // would deploy identical output.
    expect(isDueToday('2026-08-01', today)).toBe(false)
  })

  test('tolerates junk without claiming a rebuild is needed', () => {
    expect(isDueToday('', today)).toBe(false)
    expect(isDueToday(undefined, today)).toBe(false)
  })
})
