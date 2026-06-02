'use client'

import { useState, FormEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface NewsletterFormProps {
  compact?: boolean
  className?: string
  formClassName?: string
}

export function NewsletterForm({
  compact = false,
  className,
  formClassName,
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong')
      }

      setStatus('success')
      setMessage('You are subscribed! Check your inbox.')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to subscribe')
    }
  }

  return (
    <div className={className}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex gap-2',
          compact ? 'flex-col' : 'flex-col md:flex-row',
          formClassName
        )}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={status === 'loading'}
          className="min-h-[44px] flex-1 rounded-lg border border-mist bg-white px-4 text-base text-gray-800 placeholder:text-gray-400 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20 disabled:opacity-50"
          aria-label="Email address"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={status === 'loading'}
          className={compact ? 'w-full justify-center' : 'md:w-auto w-full justify-center'}
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </Button>
      </form>
      {message && (
        <p
          className={cn(
            'mt-2 text-small',
            status === 'success' ? 'text-emerald' : 'text-saffron-dark'
          )}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  )
}
