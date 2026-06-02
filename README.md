# Saffron Isle

Blog and community platform for Indians moving to, living in, or building a life in Ireland.

**Tagline:** From one home to another

## Stack

- Next.js 14 (App Router)
- Tailwind CSS v3
- MDX content (`content/articles/`)
- Deploy on Vercel

## Development

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Use **`npm run dev`** while coding. Do not use `npm start` unless you have run a production build (see below).

If you see `MODULE_NOT_FOUND` or `vendor-chunks/next.js` errors, your `.next` folder is stale or incomplete:

```bash
npm run clean
npm run build   # only if using npm start
npm run dev     # recommended for local work
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (e.g. `https://saffronisle.ie`) |
| `NEWSLETTER_API_KEY` | Brevo or Mailchimp API key |
| `NEWSLETTER_LIST_ID` | List ID from your provider |
| `NEWSLETTER_PROVIDER` | `brevo` (default) or `mailchimp` |

Without `NEWSLETTER_API_KEY`, newsletter signups succeed in dev mode without calling an external API.

## Adding articles

Create `content/articles/[category]/your-slug.mdx` with required frontmatter. See `agents.md` for the full spec.

## Production build (local)

```bash
npm run build
npm start
```

`npm start` runs the production server and requires `npm run build` first. After `npm run clean`, you must build again before starting.
