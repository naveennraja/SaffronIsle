import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  checkRateLimit,
  recordFailure,
  clearFailures,
  clientIdFromHeaders,
  sessionCookieOptions,
} from '@/lib/admin-auth.js'

/**
 * The HTTP half of admin authentication.
 *
 * lib/admin-auth.js owns the rules — constant-time comparison, lockouts, token
 * signing — and knows nothing about requests, which is what lets it be tested
 * directly. This wraps those rules in cookies and status codes.
 */

/** Whether the request carries a valid, unexpired session cookie. */
export function hasSession(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
}

export const unauthorized = () =>
  NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

const lockoutMessage = (retryAfterSeconds: number) =>
  `Too many failed attempts. Try again in about ${Math.ceil(retryAfterSeconds / 60)} minute(s).`

/**
 * Signs in: rate-limited, constant-time, and answered with a session cookie.
 *
 * The cookie is the credential from here on. The password is not echoed back
 * and is never needed again until it expires, so it stops travelling with every
 * slug lookup and every upload.
 */
export function signIn(req: NextRequest, password: unknown) {
  const clientId = clientIdFromHeaders(req.headers)

  const limit = checkRateLimit(clientId)
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: lockoutMessage(limit.retryAfterSeconds) },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      }
    )
  }

  if (!verifyPassword(password)) {
    const after = recordFailure(clientId)
    return NextResponse.json(
      {
        ok: false,
        error: after.allowed ? 'Wrong password' : lockoutMessage(after.retryAfterSeconds),
      },
      { status: after.allowed ? 401 : 429 }
    )
  }

  clearFailures(clientId)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions())
  return res
}

/**
 * Ends the session by clearing the cookie. Nothing can revoke the token
 * server-side, so this is what "sign out" means: the browser stops holding a
 * credential, and the token expires on its own within hours.
 */
export function signOut() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return res
}
