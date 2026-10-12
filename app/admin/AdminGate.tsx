'use client'

import { useEffect, useState, type SubmitEvent } from 'react'
import { AlertCircle, Loader2, Lock } from 'lucide-react'
import AdminShell, { AdminMark, inputClass, primaryButtonClass } from './AdminShell'
import AdminWorkspace from './AdminWorkspace'

type AuthStatus = 'idle' | 'auth'

/**
 * The password gate.
 *
 * The password is submitted once and then forgotten: the server answers a
 * successful sign-in with an httpOnly session cookie, which the browser
 * attaches to the later requests on its own. Nothing here holds the password
 * in component state afterwards, and no other component receives it.
 */
export default function AdminGate() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [status, setStatus] = useState<AuthStatus>('idle')
  // Undecided until the cookie check answers, so a reload mid-session does not
  // flash the password form at someone who is already signed in.
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkAuth: true }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok) setAuthed(true)
        setCheckingSession(false)
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleAuth(e: SubmitEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setStatus('auth')
    fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkAuth: true, password }),
    })
      .then(async (r) => ({ status: r.status, data: await r.json() }))
      .then(({ status: code, data }) => {
        if (data.ok) {
          setAuthed(true)
          setAuthError('')
          // Dropped as soon as it has been exchanged for a cookie.
          setPassword('')
        } else {
          // A lockout explains itself and says how long; anything else is just
          // a wrong password.
          setAuthError(code === 429 ? data.error : 'Wrong password')
        }
        setStatus('idle')
      })
      .catch(() => {
        setAuthError('Something went wrong')
        setStatus('idle')
      })
  }

  // A spinner rather than a blank screen: the cookie check is one request, but
  // on a cold serverless start it is long enough to look like a broken page.
  /** Clears the cookie server-side, then returns to the password form. */
  function handleSignOut() {
    fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signOut: true }),
    })
      .catch(() => {})
      // Signed out locally either way: the cookie expires on its own within
      // hours, and leaving the form on screen after the button was pressed
      // would be the more confusing failure.
      .finally(() => {
        setAuthed(false)
        setAuthError('')
      })
  }

  if (checkingSession) {
    return (
      <AdminShell maxWidth="sm" center>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <p className="text-sm">Checking your session…</p>
        </div>
      </AdminShell>
    )
  }

  if (!authed) {
    const lockedOut = authError.startsWith('Too many')

    return (
      <AdminShell maxWidth="sm" center>
        <div className="rounded-2xl border border-mist/70 bg-white p-8 shadow-card">
          <div className="mb-6 flex flex-col items-center text-center">
            <AdminMark size="lg" />
            <h1 className="mt-4 font-serif text-xl text-forest">Saffron Isle Admin</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Sign in to publish and update articles.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-medium text-forest"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="admin-password"
                  type="password"
                  // Tells a password manager which site this belongs to, so it
                  // can offer to fill and to save.
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === 'auth'}
                  className={`${inputClass} pl-10`}
                  autoFocus
                />
              </div>
            </div>

            {authError && (
              <p
                // A lockout is not a rejection — it is a wait, and saying so in
                // the same red as "Wrong password" invites another guess.
                role="alert"
                className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  lockedOut
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'auth' || !password.trim()}
              className={primaryButtonClass}
            >
              {status === 'auth' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Checking…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 border-t border-mist/60 pt-4 text-center text-xs leading-relaxed text-gray-500">
            Sessions last 8 hours. After five wrong attempts this address is
            locked out for fifteen minutes.
          </p>
        </div>
      </AdminShell>
    )
  }

  return <AdminWorkspace onSignOut={handleSignOut} />
}
