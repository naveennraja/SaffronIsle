import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  MAX_ATTEMPTS,
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  SESSION_TTL_SECONDS,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  checkRateLimit,
  recordFailure,
  clearFailures,
  resetRateLimit,
  clientIdFromHeaders,
  sessionCookieOptions,
} from '../lib/admin-auth.js'

const ORIGINAL_PASSWORD = process.env.ADMIN_PASSWORD
const ORIGINAL_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'correct horse battery staple'
  delete process.env.ADMIN_SESSION_SECRET
  resetRateLimit()
})

afterEach(() => {
  if (ORIGINAL_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = ORIGINAL_PASSWORD
  if (ORIGINAL_SESSION_SECRET === undefined) delete process.env.ADMIN_SESSION_SECRET
  else process.env.ADMIN_SESSION_SECRET = ORIGINAL_SESSION_SECRET
})

/** Headers stub matching the one part of the Headers API the code uses. */
function headers(map) {
  return { get: (name) => map[name] ?? null }
}

describe('verifyPassword', () => {
  test('accepts the configured password', () => {
    expect(verifyPassword('correct horse battery staple')).toBe(true)
  })

  test('rejects a wrong password', () => {
    expect(verifyPassword('correct horse battery stapl')).toBe(false)
    expect(verifyPassword('Correct Horse Battery Staple')).toBe(false)
  })

  test('rejects a prefix of the password, which a length-aware compare might not', () => {
    expect(verifyPassword('correct')).toBe(false)
  })

  test('rejects anything that is not a non-empty string', () => {
    expect(verifyPassword('')).toBe(false)
    expect(verifyPassword(undefined)).toBe(false)
    expect(verifyPassword(null)).toBe(false)
    expect(verifyPassword({})).toBe(false)
  })

  // A deployment that forgot the env var must publish nothing, rather than
  // treating every visitor as the author.
  test('fails closed when ADMIN_PASSWORD is unset', () => {
    delete process.env.ADMIN_PASSWORD
    expect(verifyPassword('')).toBe(false)
    expect(verifyPassword('anything')).toBe(false)
  })
})

describe('session tokens', () => {
  test('a freshly minted token verifies', () => {
    expect(verifySessionToken(createSessionToken())).toBe(true)
  })

  test('two tokens minted at the same instant differ', () => {
    const now = Date.now()
    expect(createSessionToken(now)).not.toBe(createSessionToken(now))
  })

  test('expires after its lifetime', () => {
    const now = Date.now()
    const token = createSessionToken(now)
    expect(verifySessionToken(token, now + (SESSION_TTL_SECONDS - 60) * 1000)).toBe(true)
    expect(verifySessionToken(token, now + (SESSION_TTL_SECONDS + 60) * 1000)).toBe(false)
  })

  // The expiry is inside the signed payload precisely so this fails.
  test('rejects a token whose expiry was edited to a later one', () => {
    const now = Date.now()
    const [, nonce, signature] = createSessionToken(now).split('.')
    const extended = `${Math.floor(now / 1000) + 999999}.${nonce}.${signature}`
    expect(verifySessionToken(extended, now)).toBe(false)
  })

  test('rejects a tampered signature and malformed input', () => {
    const token = createSessionToken()
    const [expiry, nonce] = token.split('.')
    expect(verifySessionToken(`${expiry}.${nonce}.notasignature`)).toBe(false)
    expect(verifySessionToken('')).toBe(false)
    expect(verifySessionToken('a.b')).toBe(false)
    expect(verifySessionToken('a.b.c.d')).toBe(false)
    expect(verifySessionToken(undefined)).toBe(false)
  })

  // Changing the password should end every session already in flight.
  test('a token stops verifying once the password changes', () => {
    const token = createSessionToken()
    process.env.ADMIN_PASSWORD = 'something else entirely'
    expect(verifySessionToken(token)).toBe(false)
  })

  test('with ADMIN_SESSION_SECRET set, sessions survive a password change', () => {
    process.env.ADMIN_SESSION_SECRET = 'a-separate-signing-secret'
    const token = createSessionToken()
    process.env.ADMIN_PASSWORD = 'something else entirely'
    expect(verifySessionToken(token)).toBe(true)
  })

  test('verifies nothing when the server has no secret at all', () => {
    const token = createSessionToken()
    delete process.env.ADMIN_PASSWORD
    expect(verifySessionToken(token)).toBe(false)
  })
})

describe('rate limiting', () => {
  test('an unseen address may try', () => {
    expect(checkRateLimit('1.2.3.4').allowed).toBe(true)
  })

  test('locks out after MAX_ATTEMPTS failures and reports how long', () => {
    const now = Date.now()
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      expect(recordFailure('1.2.3.4', now).allowed).toBe(true)
    }
    const last = recordFailure('1.2.3.4', now)
    expect(last.allowed).toBe(false)
    expect(last.retryAfterSeconds).toBe(LOCKOUT_MS / 1000)
    expect(checkRateLimit('1.2.3.4', now).allowed).toBe(false)
  })

  test('the lockout lifts on its own', () => {
    const now = Date.now()
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure('1.2.3.4', now)
    expect(checkRateLimit('1.2.3.4', now + LOCKOUT_MS - 1000).allowed).toBe(false)
    expect(checkRateLimit('1.2.3.4', now + LOCKOUT_MS + 1000).allowed).toBe(true)
  })

  test('one address being locked out does not affect another', () => {
    const now = Date.now()
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure('1.2.3.4', now)
    expect(checkRateLimit('5.6.7.8', now).allowed).toBe(true)
  })

  // Occasional typos over a long session should never accumulate into a lockout.
  test('failures spread beyond the window do not add up', () => {
    let now = Date.now()
    for (let i = 0; i < MAX_ATTEMPTS * 2; i++) {
      expect(recordFailure('1.2.3.4', now).allowed).toBe(true)
      now += ATTEMPT_WINDOW_MS + 1000
    }
  })

  test('a successful sign-in clears the failures before it', () => {
    const now = Date.now()
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) recordFailure('1.2.3.4', now)
    clearFailures('1.2.3.4')
    expect(recordFailure('1.2.3.4', now).allowed).toBe(true)
  })

  // Otherwise the first wrong password after a lockout expired would re-lock
  // the address immediately, making the wait effectively permanent.
  test('a wrong password after a lockout lifts does not instantly re-lock', () => {
    const now = Date.now()
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure('1.2.3.4', now)
    const later = now + LOCKOUT_MS + 1000
    expect(recordFailure('1.2.3.4', later).allowed).toBe(true)
  })
})

describe('clientIdFromHeaders', () => {
  test('takes the original client from x-forwarded-for, not the proxy chain', () => {
    expect(clientIdFromHeaders(headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
  })

  test('falls back to x-real-ip, then to a shared bucket', () => {
    expect(clientIdFromHeaders(headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
    expect(clientIdFromHeaders(headers({}))).toBe('unknown')
  })
})

describe('sessionCookieOptions', () => {
  test('is httpOnly and same-site strict, so scripts and other sites cannot use it', () => {
    const options = sessionCookieOptions()
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('strict')
    expect(options.path).toBe('/')
    expect(options.maxAge).toBe(SESSION_TTL_SECONDS)
  })

  test('maxAge 0 clears the cookie', () => {
    expect(sessionCookieOptions(0).maxAge).toBe(0)
  })
})
