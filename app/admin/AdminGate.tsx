'use client'

import { useState, type SubmitEvent } from 'react'
import AdminShell from './AdminShell'
import PublishArticleForm from './PublishArticleForm'

type AuthStatus = 'idle' | 'auth'

export default function AdminGate() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [status, setStatus] = useState<AuthStatus>('idle')

  function handleAuth(e: SubmitEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setStatus('auth')
    fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkAuth: true, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAuthed(true)
          setAuthError('')
        } else {
          setAuthError('Wrong password')
        }
        setStatus('idle')
      })
      .catch(() => {
        setAuthError('Something went wrong')
        setStatus('idle')
      })
  }

  if (!authed) {
    return (
      <AdminShell maxWidth="sm">
        <div className="rounded-2xl border border-mist/60 bg-white p-8 shadow-soft">
        <h1 className="mb-2 font-serif text-2xl text-forest">Saffron Isle Admin</h1>
        <p className="mb-6 text-sm text-gray-500">Enter your password to continue</p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
            autoFocus
          />
          {authError && <p className="text-sm text-red-500">{authError}</p>}
          <button
            type="submit"
            disabled={status === 'auth'}
            className="w-full rounded-lg bg-saffron px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-dark disabled:opacity-50"
          >
            {status === 'auth' ? 'Checking…' : 'Continue'}
          </button>
        </form>
        </div>
      </AdminShell>
    )
  }

  return <PublishArticleForm password={password} />
}
