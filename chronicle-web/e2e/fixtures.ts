/**
 * Custom Playwright fixtures — extends the default `request` fixture to
 * automatically attach the Bearer token from the auth setup, and extends
 * `page` to inject the auth token into localStorage before each navigation.
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
  // Override page to inject localStorage auth BEFORE any page scripts run
  page: async ({ page }, use) => {
    const { token } = readAuthData()
    // addInitScript runs before the page's own JS — guaranteed before Zustand hydrates
    await page.addInitScript((t) => {
      const authState = JSON.stringify({ state: { token: t, username: 'e2e', userId: '', isDm: false }, version: 0 })
      localStorage.setItem('auth', authState)
    }, token)
    await use(page)
  },

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
