import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { redact } from './redact.js'
import type { Assignment, StoredQuestion, Topic } from './insights'

/**
 * The two small model jobs behind reader-question insights. Both run on Claude
 * Haiku 5.5 at low effort: they are short, structured and high-volume, and a
 * wrong answer from either is recoverable (redaction falls back to the regex
 * result, grouping leaves the question pending for the next run).
 */

const HAIKU = 'claude-haiku-5-5'

let client: Anthropic | null = null
const anthropic = () => (client ??= new Anthropic())

/** First text block of a structured-output response, parsed — or null. */
function parseJson<T>(message: Anthropic.Message): T | null {
  if (message.stop_reason !== 'end_turn') return null
  const block = message.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') return null
  try {
    return JSON.parse(block.text) as T
  } catch {
    return null
  }
}

const SCRUB_PROMPT = `You remove personal information from questions readers typed into a website's help box, before the questions are stored for analytics.

Replace with [removed]: people's names, usernames or handles, street addresses, workplace or employer names tied to the reader, dates of birth, and any ID, account, card, case or reference number. Keep everything else exactly as written — the topic, place names like cities and counties, organisations like universities or government offices, visa types like Stamp 2, amounts, and spelling mistakes. Do not answer, rephrase, or summarise the question.`

/**
 * Removes personal details from a question. The deterministic pass runs
 * first and again on the model's output, so the result is never less redacted
 * than the regex alone — the model can only remove more.
 */
export async function scrubQuestion(question: string): Promise<string> {
  const base = redact(question)
  try {
    const response = await anthropic().messages.create({
      model: HAIKU,
      max_tokens: 1000,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { text: { type: 'string' } },
            required: ['text'],
            additionalProperties: false,
          },
        },
      },
      system: SCRUB_PROMPT,
      messages: [{ role: 'user', content: base }],
    })
    const parsed = parseJson<{ text: string }>(response)
    // A scrubbed question should be about as long as the original. Anything
    // much longer is the model answering or embellishing, not redacting.
    if (!parsed?.text || parsed.text.length > base.length + 20) return base
    return redact(parsed.text)
  } catch (error) {
    console.error('[ask] scrub failed, keeping regex redaction', error instanceof Anthropic.APIError ? error.status : error)
    return base
  }
}

const GROUP_PROMPT = `You group questions that readers asked on Saffron Isle, a guide for Indians moving to and living in Ireland, into topics so the writer can see what readers want to know.

For each new question, either assign it to an existing topic (give its topicId and leave newTopicLabel empty) or, only when no existing topic fits, create a new one (leave topicId empty and give a newTopicLabel).

A topic is the underlying need, not the wording: "How to renew IRP", "IRP renewal steps" and "IRP expired what to do" are all one topic. Do not make topics so broad that they stop being useful ("Visas"), or so narrow that each question gets its own.

New topic labels: 3 to 7 words, plain English, sentence case, describing the need — e.g. "Renewing an IRP card", "Part-time work rules for students", "Finding Indian groceries in Cork". Use the same label for every new question that shares a new topic in this batch.

Return exactly one assignment for every new question.`

/** Asks the model to place a batch of questions into topics. Null on failure, so the batch is retried tomorrow. */
export async function assignTopics(
  questions: StoredQuestion[],
  topics: Topic[]
): Promise<Assignment[] | null> {
  const payload = {
    existingTopics: topics.map((t) => ({ topicId: t.id, label: t.label })),
    newQuestions: questions.map((q) => ({ questionId: q.id, question: q.q })),
  }
  try {
    const response = await anthropic().messages.create({
      model: HAIKU,
      max_tokens: 16000,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              assignments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    questionId: { type: 'string' },
                    topicId: { type: 'string' },
                    newTopicLabel: { type: 'string' },
                  },
                  required: ['questionId', 'topicId', 'newTopicLabel'],
                  additionalProperties: false,
                },
              },
            },
            required: ['assignments'],
            additionalProperties: false,
          },
        },
      },
      system: GROUP_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    })
    return parseJson<{ assignments: Assignment[] }>(response)?.assignments ?? null
  } catch (error) {
    console.error('[ask] grouping call failed', error instanceof Anthropic.APIError ? error.status : error)
    return null
  }
}
