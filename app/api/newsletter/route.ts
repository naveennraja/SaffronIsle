import { NextResponse } from 'next/server'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function subscribeBrevo(email: string): Promise<void> {
  const apiKey = process.env.NEWSLETTER_API_KEY
  const listId = process.env.NEWSLETTER_LIST_ID

  if (!apiKey || !listId) {
    throw new Error('Newsletter is not configured')
  }

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      listIds: [parseInt(listId, 10)],
      updateEnabled: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || 'Brevo API error')
  }
}

async function subscribeMailchimp(email: string): Promise<void> {
  const apiKey = process.env.NEWSLETTER_API_KEY
  const listId = process.env.NEWSLETTER_LIST_ID

  if (!apiKey || !listId) {
    throw new Error('Newsletter is not configured')
  }

  const datacenter = apiKey.split('-').pop()
  const res = await fetch(
    `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
      }),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (body.title === 'Member Exists') return
    throw new Error(body.detail || 'Mailchimp API error')
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const provider = process.env.NEWSLETTER_PROVIDER ?? 'brevo'

    // Never claim success without a provider behind it. This used to return
    // `{ success: true }` when unconfigured, so the form told visitors they
    // were subscribed while the address was thrown away.
    if (!process.env.NEWSLETTER_API_KEY) {
      return NextResponse.json(
        { error: 'The newsletter is not available yet — please check back soon.' },
        { status: 503 }
      )
    }

    if (provider === 'mailchimp') {
      await subscribeMailchimp(email)
    } else {
      await subscribeBrevo(email)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // The detail stays in the log. It used to be returned to the browser, which
    // meant raw Brevo and Mailchimp error bodies — their wording, their field
    // names, and confirmation of which provider is behind the form — were
    // readable by anyone posting to this endpoint. None of it helps a visitor
    // who only wants to know whether they are subscribed.
    console.error('Newsletter error:', err)
    return NextResponse.json(
      { error: 'Could not sign you up just now — please try again shortly.' },
      { status: 500 }
    )
  }
}
