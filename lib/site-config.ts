/**
 * Newsletter signup is hidden until a provider is actually connected.
 *
 * With NEWSLETTER_API_KEY unset, app/api/newsletter/route.ts returns
 * `{ success: true }` and the form tells the visitor "You are subscribed!" —
 * while the address is discarded. Showing the form in that state collects
 * nothing and misleads the people most worth keeping.
 *
 * To switch it back on: set NEWSLETTER_API_KEY and NEWSLETTER_LIST_ID in
 * Vercel (Production and Preview), then flip this to true.
 */
export const NEWSLETTER_ENABLED = false

/**
 * Ask Saffron Isle, the article-grounded assistant behind the floating "Ask"
 * button.
 *
 * Switched on per environment with NEXT_PUBLIC_ASK_ENABLED=true — in
 * .env.local for your own machine, in Vercel's environment variables for the
 * live site — so turning it on locally can never be committed by accident.
 * Without it the button is not rendered and /api/ask answers 503.
 *
 * It also needs ANTHROPIC_API_KEY wherever it is on; without the key the
 * button shows but every question answers "not available right now".
 *
 * Read at build time (pages that show the button are static), so restart
 * `npm run dev` or rebuild after changing it.
 */
export const ASK_ENABLED = process.env.NEXT_PUBLIC_ASK_ENABLED === 'true'

export const SITE = {
  name: 'Saffron Isle',
  tagline: 'From one home to another',
  description:
    'Your guide to life in Ireland — visa help, student tips, food, work, housing, and stories from the Indian community.',
  contactEmail: 'hello@saffronisle.com',
  storySubmissionFormUrl: 'https://forms.gle/placeholder-story-form',
  social: {
    instagram: 'https://www.instagram.com/saffronisle_ireland',
    // Add these when the accounts exist — leave empty to hide their links
    youtube: '',
    whatsapp: '',
  },
} as const
