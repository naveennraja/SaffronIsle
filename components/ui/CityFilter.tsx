'use client'

import { cn } from '@/lib/utils'

const CITIES = [
  { value: 'all', label: 'All' },
  { value: 'dublin', label: 'Dublin' },
  { value: 'cork', label: 'Cork' },
  { value: 'galway', label: 'Galway' },
  { value: 'limerick', label: 'Limerick' },
  { value: 'other', label: 'Other' },
] as const

interface CityFilterProps {
  active: string
  onFilter: (city: string) => void
  className?: string
}

export function CityFilter({ active, onFilter, className }: CityFilterProps) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      role="tablist"
      aria-label="Filter by city"
    >
      {CITIES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={active === value}
          onClick={() => onFilter(value)}
          className={cn(
            'min-h-[44px] shrink-0 rounded-full px-4 py-2 text-small font-medium transition-colors',
            active === value
              ? 'bg-emerald text-white shadow-soft'
              : 'bg-white text-forest/70 shadow-soft ring-1 ring-mist hover:ring-emerald/20'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
