/**
 * Level Up Wizard E2E tests — 5 class scenarios.
 *
 * Uses level-4 characters (→ level 5) to avoid the ASI step at level 4.
 * Tests:
 * 1. Cleric 4 (prepared caster) → spell slots info step shown, no pick-spells step
 * 2. Sorcerer 4 (known caster)  → pick-spells step appears (requiredSpellPicks > 0)
 * 3. Barbarian 4 (non-caster)   → no spell steps at all
 * 4. Warlock 4                  → wizard opens without error
 * 5. Full confirm → character level increments by 1 (verified via API)
 *
 * Requires running dev stack (npm run dev + dotnet run).
 */
import { test, expect } from './fixtures'
import { createCharacter, deleteCharacter } from './helpers'

async function openLevelUpWizard(page: import('@playwright/test').Page) {
  const btn = page.getByRole('button', { name: /level up/i })
  await expect(btn).toBeVisible({ timeout: 10_000 })
  await btn.click()
  await expect(page.locator('.fixed.inset-0').last()).toBeVisible({ timeout: 5_000 })
}

/** Click "Next →" only if it is visible AND enabled; returns false if stuck. */
async function clickNextIfEnabled(page: import('@playwright/test').Page): Promise<boolean> {
  const btn = page.getByRole('button', { name: /^Next →$/ })
  const visible = await btn.isVisible({ timeout: 2_000 }).catch(() => false)
  if (!visible) return false
  const enabled = await btn.isEnabled().catch(() => false)
  if (!enabled) return false
  await btn.click()
  return true
}

test.describe('Level Up Wizard', () => {
  let characterId: string

  test.afterEach(async ({ authedRequest }) => {
    if (characterId) await deleteCharacter(authedRequest, characterId)
  })

  // -------------------------------------------------------------------------
  // 1. Cleric (prepared caster) — spell slots info only, no pick-spells step
  // -------------------------------------------------------------------------
  test('Cleric 4 → spell slots info shown, no "pick spells" prompt', async ({ page, authedRequest }) => {
    const char = await createCharacter(authedRequest, {
      name: `E2E-LU-Cleric-${Date.now()}`,
      characterClass: 'Cleric',
      level: 4,  // → level 5: no ASI, spell-slots-info present, prepared caster
      abilityScores: { Strength:10, Dexterity:10, Constitution:12, Intelligence:10, Wisdom:16, Charisma:10 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    const maxSteps = 8
    let foundSpellSlotsInfo = false
    let foundPickSpells = false

    for (let i = 0; i < maxSteps; i++) {
      const bodyText = await page.locator('body').innerText()
      if (/spell slot/i.test(bodyText)) foundSpellSlotsInfo = true
      if (/pick.*spell|choose.*spell|select.*spell/i.test(bodyText)) foundPickSpells = true

      const advanced = await clickNextIfEnabled(page)
      if (!advanced) break
    }

    expect(foundSpellSlotsInfo, 'Prepared caster should see spell slots info step').toBe(true)
    expect(foundPickSpells, 'Prepared caster should NOT be prompted to pick spells').toBe(false)
  })

  // -------------------------------------------------------------------------
  // 2. Sorcerer 4 (known caster) — pick-spells step appears
  // -------------------------------------------------------------------------
  test('Sorcerer 4 → pick-spells step appears', async ({ page, authedRequest }) => {
    const char = await createCharacter(authedRequest, {
      name: `E2E-LU-Sorc-${Date.now()}`,
      characterClass: 'Sorcerer',
      level: 4,  // → level 5: no ASI, known caster gains spells
      abilityScores: { Strength:8, Dexterity:14, Constitution:14, Intelligence:10, Wisdom:12, Charisma:17 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    const maxSteps = 10
    let foundPickSpells = false

    for (let i = 0; i < maxSteps; i++) {
      const bodyText = await page.locator('body').innerText()
      if (/pick.*spell|choose.*spell|select.*spell|Pick Spells/i.test(bodyText)) {
        foundPickSpells = true
        break
      }
      const advanced = await clickNextIfEnabled(page)
      if (!advanced) break
    }

    expect(foundPickSpells, 'Known caster (Sorcerer) should have a pick-spells step').toBe(true)
  })

  // -------------------------------------------------------------------------
  // 3. Barbarian 4 (non-caster) — no spell steps at all
  // -------------------------------------------------------------------------
  test('Barbarian 4 → no spell steps in wizard', async ({ page, authedRequest }) => {
    const char = await createCharacter(authedRequest, {
      name: `E2E-LU-Barb-${Date.now()}`,
      characterClass: 'Barbarian',
      level: 4,  // → level 5: no ASI, no spell steps
      abilityScores: { Strength:18, Dexterity:12, Constitution:16, Intelligence:8, Wisdom:10, Charisma:8 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    const maxSteps = 8
    let foundSpell = false

    for (let i = 0; i < maxSteps; i++) {
      const bodyText = await page.locator('body').innerText()
      if (/spell slot|pick.*spell|choose.*spell/i.test(bodyText)) {
        foundSpell = true
        break
      }
      const advanced = await clickNextIfEnabled(page)
      if (!advanced) break
    }

    expect(foundSpell, 'Barbarian should have no spell steps in the wizard').toBe(false)
  })

  // -------------------------------------------------------------------------
  // 4. Warlock 4 — wizard opens without crashing
  // -------------------------------------------------------------------------
  test('Warlock 4 → wizard opens and first step renders', async ({ page, authedRequest }) => {
    const char = await createCharacter(authedRequest, {
      name: `E2E-LU-Lock-${Date.now()}`,
      characterClass: 'Warlock',
      level: 4,  // → level 5: no ASI
      abilityScores: { Strength:8, Dexterity:14, Constitution:12, Intelligence:12, Wisdom:10, Charisma:17 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    // Wizard should render without crashing — verify the modal and first step content
    const modal = page.locator('.fixed.inset-0').last()
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // The wizard body should show meaningful content (not blank)
    const modalText = await modal.innerText()
    expect(modalText.length).toBeGreaterThan(20)

    // Cancel without confirming
    const cancelBtn = modal.getByRole('button', { name: /cancel/i })
    if (await cancelBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await cancelBtn.click()
    }
  })

  // -------------------------------------------------------------------------
  // 5. Full confirm flow → character level increments by 1
  // -------------------------------------------------------------------------
  test('Full Level Up confirm → character level increments by 1', async ({ page, authedRequest }) => {
    // Wizard 5 → 6: prepared caster, no ASI at 6, spell-slots-info step only
    const char = await createCharacter(authedRequest, {
      name: `E2E-LU-Full-${Date.now()}`,
      characterClass: 'Wizard',
      level: 5,
      abilityScores: { Strength:8, Dexterity:14, Constitution:12, Intelligence:17, Wisdom:12, Charisma:8 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    const maxSteps = 15
    let confirmed = false
    for (let i = 0; i < maxSteps; i++) {
      // Check for Confirm button (summary step)
      const confirmBtn = page.getByRole('button', { name: /Confirm Level Up/i })
      if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmBtn.click()
        confirmed = true
        break
      }
      const advanced = await clickNextIfEnabled(page)
      if (!advanced) break
    }

    expect(confirmed, 'Should have reached and clicked the Confirm Level Up button').toBe(true)

    // Modal should close
    await expect(page.locator('.fixed.inset-0').last()).not.toBeVisible({ timeout: 10_000 })

    // Verify level via API — more reliable than UI text matching
    const res = await authedRequest.get(`/api/characters/${characterId}`)
    const data = await res.json()
    expect(data.level).toBe(6)
  })
})
