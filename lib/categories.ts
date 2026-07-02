import {
  Briefcase,
  Coins,
  GraduationCap,
  Home,
  FileBadge,
  Mountain,
  ShoppingBasket,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type CategoryColor = 'emerald' | 'saffron' | 'gold' | 'forest' | 'mist'

export interface Category {
  slug: string
  label: string
  description: string
  icon: string
  color: CategoryColor
  priority: number
  /** Hidden from navigation and listings until the category has articles */
  hidden?: boolean
}

export const CATEGORIES: Category[] = [
  {
    slug: 'visa',
    label: 'Visa & immigration',
    description:
      'Step-by-step guides for student visas, work permits, IRP registration, and stamp categories.',
    icon: 'id-badge',
    color: 'emerald',
    priority: 1,
  },
  {
    slug: 'student-life',
    label: 'Colleges & student life',
    description:
      'University guides, Indian societies, part-time work rules, and college tips.',
    icon: 'graduation-cap',
    color: 'saffron',
    priority: 2,
  },
  {
    slug: 'food-groceries',
    label: 'Food & groceries',
    description:
      'Indian grocery stores, cheap eats, restaurants, halal options, and Lidl/Aldi hacks.',
    icon: 'shopping-basket',
    color: 'gold',
    priority: 3,
  },
  {
    slug: 'work-careers',
    label: 'Work & careers',
    description:
      'Critical skills permit, job hunting, salary guides, and workplace culture in Ireland.',
    icon: 'briefcase',
    color: 'forest',
    priority: 4,
    hidden: true,
  },
  {
    slug: 'finances',
    label: 'Finances & budgeting',
    description:
      'Bank accounts, PPS numbers, tax credits, remittance, and monthly budget breakdowns.',
    icon: 'coins',
    color: 'emerald',
    priority: 5,
  },
  {
    slug: 'housing',
    label: 'Housing & property',
    description:
      'Renting your first flat, housing assistance, mortgage guides for immigrants.',
    icon: 'home',
    color: 'saffron',
    priority: 6,
    hidden: true,
  },
  {
    slug: 'explore-ireland',
    label: 'Explore Ireland',
    description:
      'Best hikes, pubs, weekend trips, and hidden gems for Indians on a budget.',
    icon: 'mountain',
    color: 'forest',
    priority: 7,
    hidden: true,
  },
  {
    slug: 'community-stories',
    label: 'Community stories',
    description:
      'Real stories from Indians who moved: startups, restaurants, houses, struggles, wins.',
    icon: 'users',
    color: 'gold',
    priority: 8,
  },
]

const ICON_MAP: Record<string, LucideIcon> = {
  'id-badge': FileBadge,
  'graduation-cap': GraduationCap,
  'shopping-basket': ShoppingBasket,
  briefcase: Briefcase,
  coins: Coins,
  home: Home,
  mountain: Mountain,
  users: Users,
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? FileBadge
}

/** Categories shown in navigation and listings (hides empty ones) */
export const VISIBLE_CATEGORIES: Category[] = CATEGORIES.filter(
  (c) => !c.hidden
)

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

export function getCategorySlugs(): string[] {
  return CATEGORIES.map((c) => c.slug)
}
