import Image from 'next/image'

interface ArticleImageProps {
  src: string
  alt?: string
  /** Arrives as a string: MDX attributes must be literals, never {expressions}. */
  width: number | string
  height: number | string
  caption?: string
}

export function ArticleImage({
  src,
  alt = '',
  width,
  height,
  caption,
}: ArticleImageProps) {
  const w = Number(width)
  const h = Number(height)

  // Without usable dimensions next/image throws and takes the whole page with
  // it, so drop the image rather than break the article around it.
  if (!src || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null
  }

  return (
    <figure className="my-8">
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        sizes="(max-width: 768px) 100vw, 672px"
        // Cap at the image's own width so a small screenshot isn't upscaled
        // to the full prose column and blurred.
        style={{ maxWidth: w }}
        className="mx-auto h-auto w-full rounded-xl border border-mist"
      />
      {caption ? (
        <figcaption className="mt-2 text-center text-small text-gray-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
