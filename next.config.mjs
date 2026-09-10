import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
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
