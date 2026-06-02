'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  defaultValue?: string
  className?: string
  placeholder?: string
}

export function SearchBar({
  defaultValue = '',
  className,
  placeholder = 'Search articles…',
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/search')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="min-h-[44px] w-full rounded-lg border border-mist bg-white py-2 pl-12 pr-4 text-base text-gray-800 placeholder:text-gray-400 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20"
        aria-label="Search articles"
      />
    </form>
  )
}
