/**
 * Playwright auth setup — registers (or re-uses) a test user and injects
 * the JWT into localStorage using Zustand's persisted format.
 *
 * Requires the dev stack to be running:
 *   - npm run dev (Vite on :5173)
 *   - dotnet run (API on https://localhost)
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_STATE = path.join(__dirname, '.auth', 'storageState.json')

const TEST_USERNAME = process.env.TEST_USERNAME ?? 'chronicle-e2e-tester'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'TestPass123!'

setup('authenticate', async ({ request }) => {
  // Try login first (user may already exist from a previous run)
  let authData: { token: string; username: string; userId: string; isDm: boolean } | null = null

  const loginRes = await request.post('/api/auth/login', {
    data: { username: TEST_USERNAME, password: TEST_PASSWORD },
  })

  if (loginRes.ok()) {
    authData = await loginRes.json()
  } else {
    // Register and then login
    const registerRes = await request.post('/api/auth/register', {
      data: { username: TEST_USERNAME, password: TEST_PASSWORD },
    })
    expect(registerRes.ok(), `Failed to register test user: ${await registerRes.text()}`).toBeTruthy()
    const loginRes2 = await request.post('/api/auth/login', {
      data: { username: TEST_USERNAME, password: TEST_PASSWORD },
    })
    expect(loginRes2.ok()).toBeTruthy()
    authData = await loginRes2.json()
  }

  expect(authData).not.toBeNull()

  // Build the storageState.json with the JWT injected in Zustand's persist format
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:5173',
        localStorage: [
          {
            name: 'auth',
            value: JSON.stringify({
              state: {
                token: authData!.token,
                username: authData!.username,
                userId: authData!.userId,
                isDm: authData!.isDm,
              },
              version: 0,
            }),
          },
        ],
      },
    ],
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2))
})
