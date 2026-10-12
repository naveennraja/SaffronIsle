import type { AskSource } from './sources'

/**
 * The wire format between /api/ask and the chat panel: one JSON object per
 * line. Shared so the route and the reader cannot drift apart.
 */
export type AskStreamEvent =
  | { type: 'text'; text: string }
  | {
      type: 'meta'
      sources: AskSource[]
      /** True when the answer cited at least one article. */
      answered: boolean
      /** Show the "check the official Immigration Service Delivery site" line. */
      immigrationNote: boolean
      /** The answer hit the length cap and was cut off. */
      truncated: boolean
    }
  | { type: 'error'; message: string; discardText?: boolean }
