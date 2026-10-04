import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 2,
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 500,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: '/skills/socai-io-jev-social-jev-social', destination: '/skills/socai-io-jev-social', permanent: true },
      // Detail pages use ?lang= rather than locale path segments. Cover the
      // canonical prefixed path too, including cached older 308 destinations.
      ...['socai-io-jev-social', 'socai-io-jev-social-jev-social'].map((slug) => ({
        source: `/:locale(en|zh|ja|ko|es|de|fr|id)/skills/${slug}`,
        destination: '/skills/socai-io-jev-social?lang=:locale',
        permanent: true,
      })),
      { source: '/skills/external/:slug', destination: '/skills/:slug', permanent: true },
      { source: '/skills/external', destination: '/skills', permanent: true },
      {
        source: '/topics/mysticism',
        destination: '/use-cases/mysticism',
        permanent: true,
      },
      {
        // Redirect before streaming begins so crawlers receive HTTP 308, not
        // a 200 page with a client-side redirect. Query parameters are retained.
        source: '/skills/liamgvchi-gc-minimal-zine-poster',
        destination: '/skills/liamgvchi-gc-minimal-zine-poster-v0-3',
        permanent: true,
      },
      {
        source: '/agentskill',
        destination: '/agent-skill',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
