#!/usr/bin/env node

// Repository entry point. The publishable dependency-free implementation is
// kept in packages/cli so the private Next.js application cannot be published.
await import('../packages/cli/openagentskill.mjs')
