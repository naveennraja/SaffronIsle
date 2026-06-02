/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [375, 640, 768, 1024, 1280, 1600],
  },
  experimental: {
    mdxRs: true,
  },
}

module.exports = nextConfig
