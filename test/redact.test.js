import { describe, expect, it } from 'vitest'
import { redact } from '../lib/ask/redact.js'

describe('redact — removes what has a shape', () => {
  it.each([
    ['email', 'Can you email me at priya.k+irp@gmail.com about it?'],
    ['Irish mobile', 'Call me on 087 123 4567 please'],
    ['Irish mobile, compact', 'my number is 0871234567'],
    ['Irish mobile, international', 'whatsapp +353 87 123 4567'],
    ['Indian mobile', 'reach me on +91 98765 43210'],
    ['Indian mobile, dashed', 'my phone 98765-43210'],
    ['IPv4', 'my IP is 192.168.1.20 and the site blocks me'],
    ['IPv6', 'from 2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
    ['PPS number', 'my PPS is 1234567T is that valid'],
    ['PPS number, two letters', 'PPS 1234567TW'],
    ['passport', 'passport number A1234567 expires soon'],
    ['Eircode', 'I live at D02 X285, can I register?'],
    ['Eircode, no space', 'address a65f4e2'],
    ['IRP card number', 'my IRP card number 123456789 was rejected'],
    ['link with identifiers', 'see https://example.com/track?id=8812&user=priya'],
  ])('%s', (_, input) => {
    const out = redact(input)
    expect(out).toContain('[removed]')
    // No run of 8+ digits, no @, no URL survives.
    expect(out.replace(/\D/g, ' ')).not.toMatch(/\d{8,}/)
    expect(out).not.toMatch(/@|https?:/)
  })

  it('removes several details in one question', () => {
    const out = redact('I am at a.b@c.ie / 087 123 4567, PPS 1234567T')
    expect(out).not.toMatch(/@|087|1234567/)
  })
})

describe('redact — leaves ordinary questions alone', () => {
  it.each([
    'How do I renew my IRP?',
    'Can I work 40 hours a week on Stamp 2 in summer?',
    'Is €300 enough for groceries per month in Dublin 15?',
    'What changed for Stamp 1G in 2025?',
    'Graduated in 2024-2025, what next?',
    'Does the D01 area have Indian shops?',
    'Is the 24-month Stamp 1G extendable?',
    'Rent is 1,850 a month — is that normal?',
    'Visa appointment on 12/06/2025 — what to bring?',
  ])('%s', (q) => {
    expect(redact(q)).toBe(q)
  })
})

describe('redact — output hygiene', () => {
  it('collapses adjacent removals and whitespace', () => {
    expect(redact('mail a@b.ie   b@c.ie   ok')).toBe('mail [removed] ok')
  })

  it('accepts non-strings without throwing', () => {
    expect(redact(undefined)).toBe('undefined')
  })
})
