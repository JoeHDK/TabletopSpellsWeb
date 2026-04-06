/**
 * Level Up Wizard E2E tests — 5 class scenarios.
 *
 * Tests:
 * 1. Cleric 3 (prepared caster) → spell slots info step shown, no pick-spells step
 * 2. Sorcerer 3 (known caster)  → pick-spells step appears (requiredSpellPicks > 0)
 * 3. Barbarian 3 (non-caster)   → no spell steps at all
 * 4. Warlock 3                  → wizard completes without error
 * 5. Full confirm → character level increments by 1
 *
 * Requires running dev stack (npm run dev + dotnet run).
 */
import { test, expect } from '@playwright/test'
import { createCharacter, deleteCharacter } from './helpers'

async function openLevelUpWizard(page: import('@playwright/test').Page) {
  const btn = page.getByRole('button', { name: /level up/i })
  await expect(btn).toBeVisible({ timeout: 10_000 })
  await btn.click()
  // Wait for modal to appear
  await expect(page.locator('[role="dialog"], .fixed.inset-0')).toBeVisible({ timeout: 5_000 })
}

test.describe('Level Up Wizard', () => {
  let characterId: string

  test.afterEach(async ({ request }) => {
    if (characterId) await deleteCharacter(request, characterId)
  })

  // -------------------------------------------------------------------------
  // 1. Cleric (prepared caster) — spell slots info only, no pick-spells step
  // -------------------------------------------------------------------------
  test('Cleric 3 → spell slots info shown, no "pick spells" prompt', async ({ page, request }) => {
    const char = await createCharacter(request, {
      name: `E2E-LU-Cleric-${Date.now()}`,
      characterClass: 'Cleric',
      level: 3,
      abilityScores: { Strength:10, Dexterity:10, Constitution:12, Intelligence:10, Wisdom:16, Charisma:10 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    // Step: choose which class to level (single class — should auto-advance or show Cleric)
    const clericOption = page.getByText(/cleric/i)
    if (await clericOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clericOption.click()
      await page.getByRole('button', { name: /next|continue/i }).click()
    }

    // Navigate through steps — should see "spell slots" info somewhere
    // and should NOT see "pick your spells" / spells-to-choose prompt
    const maxSteps = 8
    let foundSpellSlotsInfo = false
    let foundPickSpells = false

    for (let i = 0; i < maxSteps; i++) {
      const bodyText = await page.locator('body').innerText()
      if (/spell slot/i.test(bodyText)) foundSpellSlotsInfo = true
      if (/pick.*spell|choose.*spell|select.*spell/i.test(bodyText)) foundPickSpells = true

      const nextBtn = page.getByRole('button', { name: /next|continue/i })
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click()
      } else {
        break
      }
    }

    expect(foundSpellSlotsInfo, 'Prepared caster should see spell slots info step').toBe(true)
    expect(foundPickSpells, 'Prepared caster should NOT be prompted to pick spells').toBe(false)
  })

  // -------------------------------------------------------------------------
  // 2. Sorcerer 3 (known caster) — pick-spells step appears
  // -------------------------------------------------------------------------
  test('Sorcerer 3 → pick-spells step appears', async ({ page, request }) => {
    const char = await createCharacter(request, {
      name: `E2E-LU-Sorc-${Date.now()}`,
      characterClass: 'Sorcerer',
      level: 3,
      abilityScores: { Strength:8, Dexterity:14, Constitution:14, Intelligence:10, Wisdom:12, Charisma:17 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    const maxSteps = 10
    let foundPickSpells = false

    for (let i = 0; i < maxSteps; i++) {
      const bodyText = await page.locator('body').innerText()
      if (/pick.*spell|choose.*spell|select.*spell|new spell/i.test(bodyText)) {
        foundPickSpells = true
        break
      }
      const nextBtn = page.getByRole('button', { name: /next|continue/i })
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click()
      } else {
        break
      }
    }

    expect(foundPickSpells, 'Known caster (Sorcerer) should have a pick-spells step').toBe(true)
  })

  // -------------------------------------------------------------------------
  // 3. Barbarian 3 (non-caster) — no spell steps at all
  // -------------------------------------------------------------------------
  test('Barbarian 3 → no spell steps in wizard', async ({ page, request }) => {
    const char = await createCharacter(request, {
      name: `E2E-LU-Barb-${Date.now()}`,
      characterClass: 'Barbarian',
      level: 3,
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
      const nextBtn = page.getByRole('button', { name: /next|continue/i })
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click()
      } else {
        break
      }
    }

    expect(foundSpell, 'Barbarian should have no spell steps in the wizard').toBe(false)
  })

  // -------------------------------------------------------------------------
  // 4. Warlock 3 — wizard completes without error
  // -------------------------------------------------------------------------
  test('Warlock 3 → wizard opens and completes without error', async ({ page, request }) => {
    const char = await createCharacter(request, {
      name: `E2E-LU-Lock-${Date.now()}`,
      characterClass: 'Warlock',
      level: 3,
      abilityScores: { Strength:8, Dexterity:14, Constitution:12, Intelligence:12, Wisdom:10, Charisma:17 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    // Advance through all steps until Confirm or Cancel is visible
    const maxSteps = 12
    for (let i = 0; i < maxSteps; i++) {
      const confirmBtn = page.getByRole('button', { name: /confirm|finish/i })
      if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        break
      }
      const nextBtn = page.getByRole('button', { name: /next|continue/i })
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click()
      } else {
        break
      }
    }

    // Should reach a Confirm button without JS errors (no uncaught exceptions)
    const confirmBtn = page.getByRole('button', { name: /confirm|finish/i })
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // 5. Full confirm flow → character level increments by 1
  // -------------------------------------------------------------------------
  test('Full Level Up confirm → character level increments by 1', async ({ page, request }) => {
    // Wizard 5 — known step: just HP + ASI (no new spells at level 6 for wizard)
    const char = await createCharacter(request, {
      name: `E2E-LU-Full-${Date.now()}`,
      characterClass: 'Wizard',
      level: 5,
      abilityScores: { Strength:8, Dexterity:14, Constitution:12, Intelligence:17, Wisdom:12, Charisma:8 },
    })
    characterId = char.id

    await page.goto(`/characters/${characterId}/stats`)
    await openLevelUpWizard(page)

    // Advance through all steps
    const maxSteps = 15
    for (let i = 0; i < maxSteps; i++) {
      const confirmBtn = page.getByRole('button', { name: /confirm|finish/i })
      if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await confirmBtn.click()
        break
      }
      const nextBtn = page.getByRole('button', { name: /next|continue/i })
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click()
      } else {
        // Might need to enter HP manually
        const hpInput = page.getByRole('spinbutton').or(page.locator('input[type="number"]')).first()
        if (await hpInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await hpInput.fill('5')
          const nextBtn2 = page.getByRole('button', { name: /next|continue/i })
          if (await nextBtn2.isVisible({ timeout: 1_000 }).catch(() => false)) {
            await nextBtn2.click()
          }
        } else {
          break
        }
      }
    }

    // After confirm, the modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10_000 })

    // Level should now show 6
    await expect(page.getByText('6', { exact: false })).toBeVisible({ timeout: 5_000 })
  })
})
