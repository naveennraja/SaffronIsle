// @ts-check
/**
 * Authentication for the admin publish route.
 *
 * That route holds a GitHub token with write access to this repository, so the
 * password in front of it is the only thing between the open internet and a
 * commit to main. It used to be compared with `===`, checked on every request,
 * and could be guessed at as fast as the network allowed. This module fixes
 * those three things:
 *
 *   - the comparison is constant-time, over digests, so neither the password's
 *     length nor its leading characters leak through response timing;
 *   - failures are counted per client address and locked out after a handful,
 *     so an online guessing attack cannot run at speed;
 *   - a successful check mints a short-lived signed session cookie, so the
 *     password is sent once at sign-in rather than attached to every slug
 *     lookup and every upload.
 *
 * The session is a signed token, not a stored one: this runs on serverless
 * functions with no shared memory or database, so anything requiring server
 * state would not survive between requests. The signing key is derived from the
 * password itself (unless ADMIN_SESSION_SECRET is set), which means changing
 * the password also invalidates every outstanding session — the behaviour you
 * want from a password change.
 *
 * CommonJS to match the other shared modules in lib/, and so the tests can
 * require it directly.
 */

const crypto = require('crypto')

/** Name of the session cookie. */
const SESSION_COOKIE = 'si_admin'

/** How long a sign-in lasts. Long enough for an editing session, not a week. */
const SESSION_TTL_SECONDS = 8 * 60 * 60

/** Failed attempts allowed from one address before it is locked out. */
const MAX_ATTEMPTS = 5

/** Failures older than this are forgotten, so occasional typos never accumulate. */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000

/** How long an address stays locked out once it exceeds MAX_ATTEMPTS. */
const LOCKOUT_MS = 15 * 60 * 1000

/**
 * Constant-time string comparison.
 *
 * Both sides are hashed first. `timingSafeEqual` throws on length mismatch —
 * and simply catching that would leak the password's length — whereas digests
 * are always 32 bytes, so every comparison takes the same path and the same
 * time regardless of what was submitted.
 *
 * @param {string} a
 * @param {string} b
 */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a), 'utf8').digest()
  const hb = crypto.createHash('sha256').update(String(b), 'utf8').digest()
  return crypto.timingSafeEqual(ha, hb)
}

/**
 * Whether `candidate` is the admin password.
 *
 * With ADMIN_PASSWORD unset this returns false for everything, which fails
 * closed: a misconfigured deployment refuses to publish rather than accepting
 * an empty password.
 *
 * @param {unknown} candidate
 * @param {string | undefined} [secret]
 */
function verifyPassword(candidate, secret = process.env.ADMIN_PASSWORD) {
  if (!secret) return false
  if (typeof candidate !== 'string' || candidate === '') return false
  return safeEqual(candidate, secret)
}

/**
 * Key used to sign session tokens.
 *
 * Derived from the password by default so that rotating the password logs
 * everyone out. Set ADMIN_SESSION_SECRET to decouple the two — sessions then
 * survive a password change.
 *
 * @returns {Buffer | null} null when the server has no secret configured.
 */
function sessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) return null
  return crypto
    .createHash('sha256')
    .update(`saffron-isle-admin-session ${secret}`, 'utf8')
    .digest()
}

/**
 * @param {string} payload
 * @param {Buffer} key
 */
function sign(payload, key) {
  return crypto.createHmac('sha256', key).update(payload, 'utf8').digest('base64url')
}

/**
 * Mints a session token of the form `<expiry>.<nonce>.<signature>`.
 *
 * The nonce only makes two tokens minted in the same second differ; the
 * signature is what makes the token unforgeable, and the expiry is inside the
 * signed payload so it cannot be extended by editing the cookie.
 *
 * @param {number} [now] milliseconds since the epoch
 * @param {number} [ttlSeconds]
 */
function createSessionToken(now = Date.now(), ttlSeconds = SESSION_TTL_SECONDS) {
  const key = sessionKey()
  if (!key) throw new Error('ADMIN_PASSWORD is not configured on the server')
  const expiry = Math.floor(now / 1000) + ttlSeconds
  const nonce = crypto.randomBytes(9).toString('base64url')
  const payload = `${expiry}.${nonce}`
  return `${payload}.${sign(payload, key)}`
}

/**
 * Whether `token` is a signature this server produced and has not expired.
 *
 * @param {unknown} token
 * @param {number} [now] milliseconds since the epoch
 */
function verifySessionToken(token, now = Date.now()) {
  if (typeof token !== 'string') return false
  const key = sessionKey()
  if (!key) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [expiry, nonce, signature] = parts
  if (!/^\d+$/.test(expiry)) return false

  // Signature first: an expired-but-valid token and an outright forgery should
  // be indistinguishable from the outside.
  if (!safeEqual(signature, sign(`${expiry}.${nonce}`, key))) return false

  return Number(expiry) * 1000 > now
}

/**
 * Failed sign-in attempts, keyed by client address.
 *
 * In-process, so it is per serverless instance rather than global — an attacker
 * spread across many warm instances gets more attempts than MAX_ATTEMPTS
 * suggests. It still turns unlimited guessing into a handful of tries per
 * instance, which is the difference that matters here, and it needs no
 * database. A shared store is the upgrade if this ever needs to be exact.
 *
 * @type {Map<string, { failures: number, first: number, lockedUntil: number }>}
 */
const attempts = new Map()

/**
 * Stops the map growing without bound on a long-lived instance.
 *
 * @param {number} now
 */
function pruneAttempts(now) {
  for (const [key, entry] of attempts) {
    if (entry.lockedUntil <= now && now - entry.first > ATTEMPT_WINDOW_MS) {
      attempts.delete(key)
    }
  }
}

/**
 * Whether this address may attempt a password right now.
 *
 * @param {string} clientId
 * @param {number} [now]
 * @returns {{ allowed: boolean, retryAfterSeconds: number }}
 */
function checkRateLimit(clientId, now = Date.now()) {
  const entry = attempts.get(clientId)
  if (!entry) return { allowed: true, retryAfterSeconds: 0 }
  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * Records a wrong password, locking the address out once it has spent its
 * allowance inside the window.
 *
 * @param {string} clientId
 * @param {number} [now]
 */
function recordFailure(clientId, now = Date.now()) {
  pruneAttempts(now)
  const entry = attempts.get(clientId)

  // A fresh entry, or one whose window has passed with no lockout in force.
  if (!entry || (entry.lockedUntil <= now && now - entry.first > ATTEMPT_WINDOW_MS)) {
    attempts.set(clientId, { failures: 1, first: now, lockedUntil: 0 })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  entry.failures += 1
  if (entry.failures >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
    // The counter restarts with the lockout, so the next wrong password after
    // it lifts does not immediately re-lock the address.
    entry.failures = 0
    entry.first = now
  }
  return checkRateLimit(clientId, now)
}

/**
 * Forgets an address's failures. Called on a successful sign-in so a typo
 * before the right password does not count against the next session.
 *
 * @param {string} clientId
 */
function clearFailures(clientId) {
  attempts.delete(clientId)
}

/** Test seam — drops all recorded attempts. */
function resetRateLimit() {
  attempts.clear()
}

/**
 * Best-effort client identity for rate limiting.
 *
 * Behind Vercel's proxy the socket address is the proxy's, so the forwarded
 * header is all there is. It is spoofable in general; here the request has
 * already passed through a proxy that overwrites it, and the fallback bucket
 * only ever makes the limit stricter.
 *
 * @param {{ get: (name: string) => string | null }} headers
 */
function clientIdFromHeaders(headers) {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}

/**
 * Cookie options for the session.
 *
 * httpOnly keeps it away from any script on the page, so an injected script
 * cannot read it. sameSite 'strict' means it is never sent on a cross-site
 * request, which is what stops another site from POSTing a publish on the
 * author's behalf. secure is dropped in development, where there is no HTTPS.
 *
 * @param {number} [maxAge] seconds; 0 clears the cookie
 */
function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: /** @type {'strict'} */ ('strict'),
    path: '/',
    maxAge,
  }
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  MAX_ATTEMPTS,
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  checkRateLimit,
  recordFailure,
  clearFailures,
  resetRateLimit,
  clientIdFromHeaders,
  sessionCookieOptions,
}
