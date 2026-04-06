/**
 * Custom Playwright fixtures — extends the `request` fixture with an
 * authenticated API request context that sends the Bearer token.
 *
 * Page auth is handled by storageState (set in playwright.config.ts),
 * which injects the JWT into localStorage before each test via auth.setup.ts.
 */
import { test as base, APIRequestContext } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE = path.join(__dirname, '.auth', 'token.json')

function readAuthData(): { token: string } {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'))
  } catch {
    throw new Error('Auth token not found. Run auth setup first (npm run test:e2e).')
  }
}

type Fixtures = {
  /** Authenticated API request context — automatically sends Bearer token */
  authedRequest: APIRequestContext
}

export const test = base.extend<Fixtures>({
  authedRequest: async ({ playwright }, use) => {
    const { token } = readAuthData()
    const ctx = await playwright.request.newContext({
      baseURL: 'http://localhost:5173',
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ignoreHTTPSErrors: true,
    })
    await use(ctx)
    await ctx.dispose()
  },
})

export { expect } from '@playwright/test'
