import { createElement } from 'react'
import { getCategoryIcon } from '@/lib/categories'

interface CategoryIconProps {
  /** Icon key from a category definition, e.g. 'graduation-cap'. */
  name: string
  className?: string
}

/**
 * Renders a category's lucide icon by name.
 *
 * Uses createElement rather than binding the looked-up component to a
 * capitalised local and rendering it as JSX. Assigning a component during
 * render gives it an unstable identity, which React Compiler flags
 * (react-hooks/static-components); createElement is what JSX compiles to
 * anyway and expresses "render the component I just looked up" directly.
 */
export function CategoryIcon({ name, className }: CategoryIconProps) {
  return createElement(getCategoryIcon(name), {
    className,
    'aria-hidden': true,
  })
}
