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
| `ADMIN_PASSWORD` | Password for the `/admin` publishing page |
| `GITHUB_TOKEN` | GitHub PAT with `contents: write` on the site repo — `/admin` commits articles through it |
| `GITHUB_REPO` | Target repo for `/admin` commits, e.g. `naveennraja/SaffronIsle` |

Without `NEWSLETTER_API_KEY`, newsletter signups succeed in dev mode without calling an external API.

`.env.local` is git-ignored and applies to local dev only. The `/admin` page runs server-side in
production, so `ADMIN_PASSWORD`, `GITHUB_TOKEN` and `GITHUB_REPO` must **also** be set in the Vercel
project's Environment Variables, or publishing fails at runtime.

## Adding articles

Create `content/articles/[category]/your-slug.mdx` with required frontmatter. See `agents.md` for the full spec.

## Production build (local)

```bash
npm run build
npm start
```

`npm start` runs the production server and requires `npm run build` first. After `npm run clean`, you must build again before starting.
