/**
 * Input rules and rate limiting for Ask Saffron Isle.
 *
 * Every question costs real money, and the endpoint is public, so it is
 * limited per client address. The address is only ever a key in this
 * process's memory — never logged, never stored — and the counter is per warm
 * serverless instance rather than global, the same trade-off as the admin
 * sign-in limiter.
 */

export const QUESTION_MIN = 3
export const QUESTION_MAX = 500

export type QuestionCheck = { ok: true; question: string } | { ok: false; error: string }

export function checkQuestion(input: unknown): QuestionCheck {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Type a question to ask.' }
  }
  const question = input.replace(/\s+/g, ' ').trim()
  if (question.length < QUESTION_MIN) {
    return { ok: false, error: 'Type a question to ask.' }
  }
  if (question.length > QUESTION_MAX) {
    return {
      ok: false,
      error: `That question is a bit long — please keep it under ${QUESTION_MAX} characters.`,
    }
  }
  return { ok: true, question }
}

interface Window {
  limit: number
  ms: number
}

/** A burst limit and a daily ceiling: enough for a real reader, not for a script. */
export const ASK_WINDOWS: Window[] = [
  { limit: 8, ms: 60 * 1000 },
  { limit: 40, ms: 24 * 60 * 60 * 1000 },
]

export type RateCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/**
 * Creates a limiter. A factory rather than module state so tests get a fresh
 * one and can pass their own clock.
 */
export function createRateLimiter(windows: Window[] = ASK_WINDOWS, now: () => number = Date.now) {
  const hits = new Map<string, number[]>()
  const longest = Math.max(...windows.map((w) => w.ms))

  return function take(key: string): RateCheck {
    const t = now()
    const recent = (hits.get(key) ?? []).filter((ts) => t - ts < longest)

    for (const w of windows) {
      const inWindow = recent.filter((ts) => t - ts < w.ms)
      if (inWindow.length >= w.limit) {
        hits.set(key, recent)
        const oldest = Math.min(...inWindow)
        return { allowed: false, retryAfterSeconds: Math.ceil((oldest + w.ms - t) / 1000) }
      }
    }

    recent.push(t)
    hits.set(key, recent)
    // Keep the map from growing without bound on a long-lived instance.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.every((ts) => t - ts >= longest)) hits.delete(k)
      }
    }
    return { allowed: true }
  }
}
