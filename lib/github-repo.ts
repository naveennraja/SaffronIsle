import 'server-only'

import matter from 'gray-matter'
// Plain CommonJS module, shared with scripts/process-drafts.js
import { PUBLISH_LOG_PATH, PUBLISH_LOG_HEADER } from '@/lib/publish-log.js'

/**
 * Everything this app does to its own GitHub repository.
 *
 * Publishing is a commit to main: there is no database behind the site, so the
 * repo is the store, and the admin route's job reduces to "read the current
 * tree, write a new one". Keeping that here means the route never touches the
 * GitHub API directly and the atomicity rules below live in one place.
 */

export interface CommitFile {
  path: string
  text?: string
  binary?: Buffer
}

export interface ExistingArticle {
  /** Repo path of the .mdx, e.g. content/articles/visa/irp-guide.mdx */
  path: string
  category: string
  title: string
  metaTitle: string
  metaDescription: string
  date: string
  coverImage: string
  /** Paths of body images from this version, so replacements can drop leftovers. */
  imagePaths: string[]
}

function githubEnv() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const missing = [!token && 'GITHUB_TOKEN', !repo && 'GITHUB_REPO'].filter(Boolean)
  if (missing.length) {
    throw new Error(`Missing env var(s) on the server: ${missing.join(', ')}`)
  }
  return { token: token as string, repo: repo as string }
}

function branch() {
  return process.env.GITHUB_BRANCH || 'main'
}

async function gh(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const { token, repo } = githubEnv()
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/**
 * Writes every file in one commit via the Git Data API.
 *
 * The Contents API can only touch one file per call, which meant a publish
 * produced N+2 commits (and N+2 deploys), and could leave an article live
 * referencing images whose pushes had failed. This is atomic instead.
 */
export async function commitFiles(
  files: CommitFile[],
  message: string,
  /** Paths to remove in the same commit — images a rewrite orphaned, or an
   *  article's old location after a category change. */
  deletions: string[] = []
): Promise<string> {
  const head = branch()

  const ref = await gh(`/git/ref/heads/${head}`)
  if (!ref.ok) {
    throw new Error(
      `Could not read branch "${head}": ${(ref.data.message as string) ?? ref.status}`
    )
  }
  const baseSha = (ref.data.object as { sha: string }).sha

  const baseCommit = await gh(`/git/commits/${baseSha}`)
  if (!baseCommit.ok) throw new Error('Could not read the latest commit')
  const baseTreeSha = (baseCommit.data.tree as { sha: string }).sha

  // Binaries need a blob each; text files can be inlined in the tree directly.
  const binaries = files.filter((f): f is CommitFile & { binary: Buffer } => !!f.binary)
  const blobShas = await Promise.all(
    binaries.map(async (f) => {
      const blob = await gh('/git/blobs', {
        method: 'POST',
        body: { content: f.binary.toString('base64'), encoding: 'base64' },
      })
      if (!blob.ok) {
        throw new Error(`Failed to upload ${f.path}: ${blob.data.message ?? blob.status}`)
      }
      return blob.data.sha as string
    })
  )

  const tree = [
    ...binaries.map((f, i) => ({
      path: f.path,
      mode: '100644',
      type: 'blob',
      sha: blobShas[i],
    })),
    ...files
      .filter((f) => f.text !== undefined)
      .map((f) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.text as string,
      })),
    // A null sha against base_tree is how the Git Data API expresses a
    // deletion, which keeps removals inside the same atomic commit as the
    // writes rather than needing a second one.
    ...deletions.map((path) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha: null,
    })),
  ]

  const newTree = await gh('/git/trees', {
    method: 'POST',
    body: { base_tree: baseTreeSha, tree },
  })
  if (!newTree.ok) {
    throw new Error(`Failed to build commit: ${newTree.data.message ?? newTree.status}`)
  }

  const commit = await gh('/git/commits', {
    method: 'POST',
    body: { message, tree: newTree.data.sha, parents: [baseSha] },
  })
  if (!commit.ok) {
    throw new Error(`Failed to create commit: ${commit.data.message ?? commit.status}`)
  }

  const updated = await gh(`/git/refs/heads/${head}`, {
    method: 'PATCH',
    body: { sha: commit.data.sha, force: false },
  })
  if (!updated.ok) {
    if (updated.status === 422) {
      throw new Error('Someone else published at the same time — please try again')
    }
    throw new Error(`Failed to update branch: ${updated.data.message ?? updated.status}`)
  }

  return commit.data.sha as string
}

/**
 * Every file currently on the branch, as one recursive tree read.
 *
 * One call rather than a probe per category: the answer is needed to decide
 * whether a slug exists, which cover to keep, and which images the previous
 * version left behind.
 */
async function listRepoPaths(): Promise<string[]> {
  const ref = await gh(`/git/ref/heads/${branch()}`)
  if (!ref.ok) return []
  const baseSha = (ref.data.object as { sha: string }).sha

  const tree = await gh(`/git/trees/${baseSha}?recursive=1`)
  if (!tree.ok) return []
  return ((tree.data.tree as { path: string; type: string }[]) ?? [])
    .filter((e) => e.type === 'blob')
    .map((e) => e.path)
}

/**
 * Finds an article by slug across every category.
 *
 * Deliberately not scoped to the category being published into. Article URLs
 * are /articles/<slug> with no category segment, so slugs are globally unique:
 * publishing 'irp-guide' under housing while it already exists under visa would
 * create two files claiming one URL, and generateStaticParams would emit a
 * duplicate route.
 */
export async function findExistingArticle(slug: string): Promise<ExistingArticle | null> {
  const paths = await listRepoPaths()
  const mdxPath = paths.find((p) =>
    new RegExp(`^content/articles/[^/]+/${slug}\\.mdx$`).test(p)
  )
  if (!mdxPath) return null

  const file = await gh(`/contents/${mdxPath}`)
  if (!file.ok || typeof file.data.content !== 'string') return null

  const raw = Buffer.from(file.data.content, 'base64').toString('utf-8')
  const { data } = matter(raw)

  return {
    path: mdxPath,
    category: mdxPath.split('/')[2],
    title: String(data.title ?? slug),
    metaTitle: String(data.metaTitle ?? ''),
    metaDescription: String(data.metaDescription ?? ''),
    date: String(data.date ?? ''),
    coverImage: String(data.coverImage ?? ''),
    imagePaths: paths.filter((p) => p.startsWith(`public/images/articles/${slug}/`)),
  }
}

export async function readPublishLog(): Promise<string> {
  const existing = await gh(`/contents/${PUBLISH_LOG_PATH}`)
  if (existing.ok && typeof existing.data.content === 'string') {
    return Buffer.from(existing.data.content, 'base64').toString('utf-8')
  }
  return PUBLISH_LOG_HEADER
}
