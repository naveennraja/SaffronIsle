import { Button } from '@/components/ui/Button'

interface AffiliateCTAProps {
  name: string
  description: string
  href: string
  ctaLabel: string
}

export function AffiliateCTA({ name, description, href, ctaLabel }: AffiliateCTAProps) {
  return (
    <aside className="my-8 rounded-lg border-2 border-mist bg-cream p-6">
      <p className="mb-1 font-semibold text-forest">{name}</p>
      <p className="mb-4 text-small text-gray-600">{description}</p>
      <Button href={href} external variant="primary">
        {ctaLabel}
      </Button>
      <p className="mt-3 text-label text-gray-500">
        This is an affiliate link. We earn a small commission at no extra cost to you.
      </p>
    </aside>
  )
}
