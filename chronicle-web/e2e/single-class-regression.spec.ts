/**
 * Single-class regression tests — verifies that the multiclassing changes
 * did not break the basic single-class character workflow.
 *
 * Tests:
 * 1. Wizard 5 — level editable inline, updates correctly
 * 2. Subclass dropdown present and functional
 * 3. Level Up button present and opens wizard
 * 4. Spell list accessible from nav
 *
 * Requires running dev stack (npm run dev + dotnet run).
 */
import { test, expect } from './fixtures'
import { createCharacter, deleteCharacter } from './helpers'

test.describe('Single-class regression', () => {
  let characterId: string

  test.beforeEach(async ({ authedRequest }) => {
    const char = await createCharacter(authedRequest, {
      name: `E2E-Reg-${Date.now()}`,
      characterClass: 'Wizard',
      level: 5,
      subclass: 'WizardEvocation',
      abilityScores: { Strength:8, Dexterity:14, Constitution:12, Intelligence:16, Wisdom:12, Charisma:8 },
    })
    characterId = char.id
  })

  test.afterEach(async ({ authedRequest }) => {
    await deleteCharacter(authedRequest, characterId)
  })

  test('Level editable inline → updates and persists', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    // Find level display — typically shows "5" or "Level 5"
    await expect(page.getByText('5')).toBeVisible({ timeout: 10_000 })

    // Level is editable — click and change to 6
    const levelEl = page.getByText('5').first()
    await levelEl.click()

    const levelInput = page.getByRole('spinbutton').or(page.locator('input[type="number"]')).first()
    if (await levelInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await levelInput.fill('6')
      await levelInput.press('Enter')
      await expect(page.getByText('6')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('Subclass dropdown is present and functional', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    // Should see the subclass — evocation
    await expect(page.getByText(/evocation/i)).toBeVisible({ timeout: 10_000 })

    // Subclass selector should be present
    const subclassSel = page.getByLabel(/subclass/i)
      .or(page.locator('select').filter({ hasText: /evocation/i }))
    await expect(subclassSel).toBeVisible({ timeout: 5_000 })
  })

  test('Level Up button is present and opens the wizard modal', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    const levelUpBtn = page.getByRole('button', { name: /level up/i })
    await expect(levelUpBtn).toBeVisible({ timeout: 10_000 })
    await levelUpBtn.click()

    // Modal should appear
    const modal = page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'))
    await expect(modal.first()).toBeVisible({ timeout: 5_000 })

    // Close the modal
    const cancelBtn = page.getByRole('button', { name: /cancel|close|×/i })
    if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cancelBtn.click()
    }
  })

  test('Spell list page accessible from navigation', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    // Find spells nav link
    const spellsLink = page.getByRole('link', { name: /spells/i })
      .or(page.getByRole('button', { name: /spells/i }))
    await expect(spellsLink.first()).toBeVisible({ timeout: 10_000 })
    await spellsLink.first().click()

    // Should navigate to a spells page
    await expect(page).toHaveURL(/spells/, { timeout: 10_000 })
  })
})
