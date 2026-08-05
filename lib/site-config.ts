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
